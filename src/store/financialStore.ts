"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateMarginalTaxRate, calculateTaxSavings } from "@/data/taxBrackets";
import { TAX_CONSTANTS_2026, HIGH_INTEREST_DEBT_THRESHOLD, DEFAULT_MORTGAGE_RATE, DEFAULT_CONSERVATIVE_RETURN } from "@/data/taxConstants";

export type Province =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT";

export type EmergencyFundStatus = "none" | "partial" | "full";
export type HomeOwnerStatus = "owner" | "renter" | "first-time-buyer";
export type EmployerMatchStatus = "none" | "partial" | "full";

export interface UserProfile {
  grossIncome: number;
  province: Province;
  totalHighInterestDebt: number;
  debtInterestRate: number;
  emergencyFundStatus: EmergencyFundStatus;
  monthlyExpenses: number;
  emergencyFundMonths: number;
  fhsaRoom: number;
  tfsaRoom: number;
  rrspRoom: number;
  expectedRetirementTaxRate: number;
  homeOwnerStatus: HomeOwnerStatus;
  mortgageRate: number;
  mortgageBalance: number;
  childrenCount: number;
  employerMatch: EmployerMatchStatus;
  age: number;
  isRural: boolean;
  rrspContributions: number;
}

export interface EconomicData {
  primeRate: number | null;
  inflationRate: number | null;
  cadUsdRate: number | null;
  carbonRebate: number | null;
  lastUpdated: string | null;
}

export interface WarningItem {
  id: string;
  type: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface PriorityItem {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  description: string;
  action: string;
  completed: boolean;
  instantReturn?: number;
}

export interface PayrollMilestone {
  month: number;
  type: "cpp" | "cpp2" | "ei";
  extraMonthly: number;
}

export interface AnalysisResult {
  rrspVsTfsaRecommendation: "rrsp" | "tfsa" | "both" | "fhsa";
  rrspBenefit: number;
  tfsaBenefit: number;
  effectiveMTR: number;
  ccbBoost: number;
  mortgageVsInvestRecommendation: "mortgage" | "invest" | "either";
  mortgageSavings: number;
  investmentReturn: number;
  taxDragReturn: number;
  cppMaxed: boolean;
  cpp2Maxed: boolean;
  cppSavings: number;
  payrollMilestones: PayrollMilestone[];
}

interface FinancialState {
  profile: UserProfile | null;
  economicData: EconomicData;
  priorities: PriorityItem[];
  warnings: WarningItem[];
  analysis: AnalysisResult | null;
  isProfileComplete: boolean;
  encrypted: boolean;
  masterKeyHash: string | null;
  history: UserProfile[];
  historyIndex: number;

  setProfile: (profile: UserProfile) => void;
  updateEconomicData: (data: EconomicData) => void;
  togglePriority: (id: string) => void;
  calculatePriorities: () => void;
  calculateAnalysis: () => void;
  wipeAllData: () => void;
  setProfileComplete: (complete: boolean) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  setEncrypted: (enabled: boolean, keyHash?: string) => void;
  undo: () => void;
  canUndo: () => boolean;
}

const defaultEconomicData: EconomicData = {
  primeRate: null,
  inflationRate: null,
  cadUsdRate: null,
  carbonRebate: null,
  lastUpdated: null,
};

function calculateOASClawback(income: number): { clawback: number; effectiveRate: number } {
  const { OAS } = TAX_CONSTANTS_2026;
  if (income <= OAS.CLAWBACK_START) {
    return { clawback: 0, effectiveRate: 0 };
  }
  const excessIncome = Math.min(income - OAS.CLAWBACK_START, OAS.FULL_CLAWBACK - OAS.CLAWBACK_START);
  const clawback = excessIncome * OAS.RATE;
  const effectiveRate = (clawback / (income - OAS.CLAWBACK_START)) * 100;
  return { clawback, effectiveRate };
}

function calculateCPPContributions(grossIncome: number, province: Province): { cpp: number; cpp2: number; maxed: boolean; maxed2: boolean } {
  const { CPP, CPP2 } = TAX_CONSTANTS_2026;
  const isQuebec = province === "QC";
  
  const cppRate = isQuebec ? 0.064 : CPP.RATE;
  const cppMaxable = Math.max(0, Math.min(grossIncome, CPP.YMPE) - CPP.EXEMPT);
  const cpp = Math.round(cppMaxable * cppRate);
  const cppMaxed = grossIncome >= CPP.YMPE;

  let cpp2 = 0;
  let cpp2Maxed = false;
  if (grossIncome > CPP.YMPE) {
    const cpp2Maxable = Math.min(grossIncome, CPP2.YAMPE) - CPP.YMPE;
    cpp2 = Math.round(cpp2Maxable * CPP2.RATE);
    cpp2Maxed = grossIncome >= CPP2.YAMPE;
  }

  return { cpp, cpp2, maxed: cppMaxed, maxed2: cpp2Maxed };
}

function calculatePayrollMilestones(grossIncome: number, province: Province): PayrollMilestone[] {
  const { CPP, CPP2, EI } = TAX_CONSTANTS_2026;
  const isQuebec = province === "QC";
  
  const monthlyGross = grossIncome / 12;
  const cppRate = isQuebec ? 0.064 : CPP.RATE;
  
  const milestones: PayrollMilestone[] = [];
  
  let cppAccumulated = 0;
  let cpp2Accumulated = 0;
  let eiAccumulated = 0;
  const cppExemptMonthly = CPP.EXEMPT / 12;
  
  for (let month = 1; month <= 12; month++) {
    const pensionable = Math.max(0, monthlyGross - cppExemptMonthly);
    const monthlyCpp = Math.min(pensionable * cppRate, CPP.YMPE / 12);
    const monthlyCpp2 = grossIncome > CPP.YMPE 
      ? Math.min(Math.max(0, monthlyGross) * CPP2.RATE, (CPP2.YAMPE - CPP.YMPE) / 12)
      : 0;
    const monthlyEi = isQuebec ? 0 : Math.min(monthlyGross * EI.RATE, EI.MAX_INSURABLE / 12);
    
    const prevCpp = cppAccumulated;
    const prevCpp2 = cpp2Accumulated;
    const prevEi = eiAccumulated;
    
    cppAccumulated += monthlyCpp;
    cpp2Accumulated += monthlyCpp2;
    eiAccumulated += monthlyEi;
    
    if (cppAccumulated >= CPP.YMPE && prevCpp < CPP.YMPE) {
      milestones.push({ month, type: "cpp", extraMonthly: monthlyCpp });
    }
    
    if (cpp2Accumulated >= CPP2.YAMPE && prevCpp2 < CPP2.YAMPE) {
      milestones.push({ month, type: "cpp2", extraMonthly: monthlyCpp2 });
    }
    
    if (!isQuebec && eiAccumulated >= EI.MAX_INSURABLE && prevEi < EI.MAX_INSURABLE) {
      milestones.push({ month, type: "ei", extraMonthly: monthlyEi });
    }
  }
  
  return milestones;
}

function calculateCarbonRebate(province: Province, income: number, children: number, isRural: boolean): number {
  const { CARBON_REBATE } = TAX_CONSTANTS_2026;
  const amounts = CARBON_REBATE[province] || CARBON_REBATE.ON;
  
  let rebate = amounts.base;
  if (income < 65000) rebate = amounts.base * 1.2;
  else if (income > 80000) rebate = amounts.base * 0.8;
  
  rebate += amounts.spouse;
  rebate += children * amounts.child;
  
  if (isRural) rebate = rebate * 1.2;
  
  return Math.round(rebate);
}

function calculateCCB(netIncome: number, children: number): number {
  const { CCB } = TAX_CONSTANTS_2026;
  if (children === 0) return 0;
  
  let totalBenefit = 0;
  for (let i = 0; i < children; i++) {
    const tier = CCB.CHILD_TIERS[Math.min(i, 3)];
    const reduction = netIncome > CCB.BASE_INCOME_THRESHOLD 
      ? Math.min((netIncome - CCB.BASE_INCOME_THRESHOLD) * tier.reductionRate, tier.maxBenefit * 0.95) 
      : 0;
    totalBenefit += Math.max(0, tier.maxBenefit - reduction);
  }
  
  return Math.round(totalBenefit);
}

function calculateCCBBoost(grossIncome: number, rrspContribution: number, children: number): number {
  if (children === 0) return 0;
  const currentCCB = calculateCCB(grossIncome, children);
  const reducedIncomeCCB = calculateCCB(Math.max(0, grossIncome - rrspContribution), children);
  return Math.max(0, reducedIncomeCCB - currentCCB);
}

function calculateEffectiveMTR(grossIncome: number, children: number): number {
  const marginalTaxRate = calculateMarginalTaxRate(grossIncome, "ON");
  
  let ccbDrag = 0;
  if (children > 0) {
    const income = grossIncome;
    if (income > 38237 && income < 82847) {
      const childIndex = Math.min(children - 1, 3);
      ccbDrag = [0.07, 0.135, 0.19, 0.22][childIndex] || 0;
    }
  }
  
  return marginalTaxRate + ccbDrag;
}

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      profile: null,
      economicData: defaultEconomicData,
      priorities: [],
      warnings: [],
      analysis: null,
      isProfileComplete: false,
      encrypted: false,
      masterKeyHash: null,
      history: [],
      historyIndex: -1,

      setProfile: (profile) => {
        const { history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(profile);
        if (newHistory.length > 20) newHistory.shift();
        
        set({ 
          profile, 
          isProfileComplete: true,
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
        get().calculatePriorities();
        get().calculateAnalysis();
      },

      updateEconomicData: (data) => {
        set({ economicData: data });
      },

      togglePriority: (id) => {
        const priorities = get().priorities.map((p) =>
          p.id === id ? { ...p, completed: !p.completed } : p
        );
        set({ priorities });
      },

      setProfileComplete: (complete) => {
        set({ isProfileComplete: complete });
      },

      calculatePriorities: () => {
        const { profile, analysis, economicData } = get();
        if (!profile) return;

        const priorities: PriorityItem[] = [];
        const warnings: WarningItem[] = [];
        
        const netIncome = Math.max(0, profile.grossIncome - (profile.rrspContributions || 0));
        const oasClawback = calculateOASClawback(netIncome);
        
        if (netIncome > TAX_CONSTANTS_2026.OAS.CLAWBACK_START - 15000) {
          warnings.push({
            id: "oas-clawback",
            type: netIncome > TAX_CONSTANTS_2026.OAS.CLAWBACK_START ? "critical" : "warning",
            title: "OAS Clawback Warning",
            description: `Net income of $${netIncome.toLocaleString()} triggers OAS recovery tax. RRSP can help reduce this.`,
          });
        }

        if (analysis?.payrollMilestones && analysis.payrollMilestones.length > 0) {
          const nextMilestone = analysis.payrollMilestones[0];
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          warnings.push({
            id: "payroll-milestone",
            type: "info",
            title: `Extra $${Math.round(nextMilestone.extraMonthly)}/month starting ${monthNames[nextMilestone.month - 1]}`,
            description: `Your ${nextMilestone.type.toUpperCase()} will be maxed. Redirect this to your TFSA!`,
          });
        }

        if (profile.employerMatch === "full") {
          priorities.push({
            id: "employer-match",
            level: 1,
            title: "Employer Match",
            description: "100% instant return - free money",
            action: `Contribute to get full match ($${(profile.grossIncome * 0.05).toLocaleString()}/yr)`,
            completed: false,
            instantReturn: profile.grossIncome * 0.05,
          });
        }

        const isFirstTimeHomeBuyer = profile.homeOwnerStatus === "first-time-buyer" || profile.homeOwnerStatus === "renter";
        if (profile.fhsaRoom > 0 && isFirstTimeHomeBuyer) {
          priorities.push({
            id: "fhsa",
            level: 2,
            title: "FHSA - Best of Both Worlds",
            description: "Tax-deductible in, tax-free out for home purchase",
            action: `Contribute to FHSA ($${profile.fhsaRoom.toLocaleString()} room)`,
            completed: false,
            instantReturn: calculateTaxSavings(1000, calculateMarginalTaxRate(profile.grossIncome, profile.province)),
          });
        }

        if (profile.debtInterestRate > (HIGH_INTEREST_DEBT_THRESHOLD * 100) && profile.totalHighInterestDebt > 0) {
          priorities.push({
            id: "high-interest-debt",
            level: 3,
            title: "High-Interest Debt Fire",
            description: `Debt at ${profile.debtInterestRate}% beats most returns`,
            action: `Pay off $${Math.round(profile.totalHighInterestDebt).toLocaleString()}`,
            completed: false,
          });
        }

        const recommendedMonths = (economicData.inflationRate || 2) > 4 ? 6 : 3;
        
        priorities.push({
          id: "safety-net",
          level: 4,
          title: "Emergency Fund",
          description: `${recommendedMonths} months ${(economicData.inflationRate || 2) > 4 ? "(high inflation)" : ""}`,
          action: profile.emergencyFundStatus === "full"
            ? "Fully funded!"
            : `Save $${Math.round(profile.monthlyExpenses * recommendedMonths).toLocaleString()}`,
          completed: profile.emergencyFundStatus === "full",
        });

        const effectiveMTR = analysis?.effectiveMTR || 0;
        const needsRRSPForOAS = netIncome > TAX_CONSTANTS_2026.OAS.CLAWBACK_START - 15000;
        
        if (effectiveMTR > 0.35 || needsRRSPForOAS || (profile.childrenCount > 0 && effectiveMTR > 0.25)) {
          const taxSavings = calculateTaxSavings(1000, calculateMarginalTaxRate(profile.grossIncome, profile.province));
          const ccbIncrease = profile.childrenCount > 0 ? calculateCCBBoost(profile.grossIncome, 1000, profile.childrenCount) : 0;
          
          priorities.push({
            id: "tax-alpha",
            level: 5,
            title: profile.childrenCount > 0 ? "RRSP + CCB Boost" : "RRSP Tax Alpha",
            description: `Effective MTR: ${(effectiveMTR * 100).toFixed(1)}%${profile.childrenCount > 0 ? ` + CCB boost` : ""}`,
            action: needsRRSPForOAS ? "RRSP to stay under OAS threshold" : "Contribute to RRSP",
            completed: false,
            instantReturn: taxSavings + ccbIncrease,
          });
        }

        if (profile.tfsaRoom > 0) {
          priorities.push({
            id: "tfsa",
            level: 6,
            title: "TFSA - Wealth Builder",
            description: "Tax-free growth for life",
            action: `Contribute to TFSA ($${profile.tfsaRoom.toLocaleString()} room)`,
            completed: false,
          });
        }

        set({ priorities, warnings });
      },

      calculateAnalysis: () => {
        const { profile, economicData } = get();
        if (!profile) return;

        const { CPP, CPP2 } = TAX_CONSTANTS_2026;
        const marginalTaxRate = calculateMarginalTaxRate(profile.grossIncome, profile.province);
        const effectiveMTR = calculateEffectiveMTR(profile.grossIncome, profile.childrenCount);
        const retirementRate = profile.expectedRetirementTaxRate / 100 || 0.20;
        
        const cppContribs = calculateCPPContributions(profile.grossIncome, profile.province);
        const payrollMilestones = calculatePayrollMilestones(profile.grossIncome, profile.province);
        
        let rrspVsTfsa: "rrsp" | "tfsa" | "both" | "fhsa" = "both";
        let rrspBenefit = 0;
        let tfsaBenefit = 0;
        let ccbBoost = 0;
        
        const ccbIncrease = profile.childrenCount > 0 
          ? calculateCCBBoost(profile.grossIncome, 1000, profile.childrenCount)
          : 0;
        
        if (effectiveMTR > 0.40 || (profile.grossIncome > TAX_CONSTANTS_2026.OAS.CLAWBACK_START - 15000)) {
          rrspVsTfsa = "rrsp";
          rrspBenefit = (effectiveMTR - retirementRate) * 100 + ccbIncrease * 12;
          ccbBoost = ccbIncrease * 12;
        } else if (marginalTaxRate < retirementRate - 0.05 && effectiveMTR < 0.30) {
          rrspVsTfsa = "tfsa";
          tfsaBenefit = (retirementRate - marginalTaxRate) * 100;
        }

        const isFirstTimeHomeBuyer = profile.homeOwnerStatus === "first-time-buyer" || profile.homeOwnerStatus === "renter";
        if (profile.fhsaRoom > 0 && isFirstTimeHomeBuyer) {
          rrspVsTfsa = "fhsa";
        }

        const mortgageRate = profile.mortgageRate || DEFAULT_MORTGAGE_RATE;
        const conservativeReturn = DEFAULT_CONSERVATIVE_RETURN;
        const taxDragReturn = mortgageRate / (1 - marginalTaxRate);
        
        let mortgageVsInvest: "mortgage" | "invest" | "either" = "either";
        
        if (mortgageRate > taxDragReturn + 0.005) {
          mortgageVsInvest = "mortgage";
        } else if (mortgageRate < taxDragReturn - 0.005) {
          mortgageVsInvest = "invest";
        }

        const analysis: AnalysisResult = {
          rrspVsTfsaRecommendation: rrspVsTfsa,
          rrspBenefit,
          tfsaBenefit,
          effectiveMTR,
          ccbBoost,
          mortgageVsInvestRecommendation: mortgageVsInvest,
          mortgageSavings: mortgageRate * 1000,
          investmentReturn: conservativeReturn * 1000,
          taxDragReturn: taxDragReturn * 100,
          cppMaxed: cppContribs.maxed,
          cpp2Maxed: cppContribs.maxed2,
          cppSavings: cppContribs.cpp + cppContribs.cpp2,
          payrollMilestones,
        };

        set({ analysis });
      },

      wipeAllData: () => {
        set({
          profile: null,
          priorities: [],
          warnings: [],
          analysis: null,
          isProfileComplete: false,
          encrypted: false,
          masterKeyHash: null,
          history: [],
          historyIndex: -1,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("maple-compass-storage");
          sessionStorage.clear();
        }
      },

      exportData: () => {
        const { profile, priorities, warnings, analysis } = get();
        return JSON.stringify({ profile, priorities, warnings, analysis, exportedAt: new Date().toISOString() }, null, 2);
      },

      importData: (json: string) => {
        try {
          const data = JSON.parse(json);
          if (data.profile) {
            set({ 
              profile: data.profile, 
              priorities: data.priorities || [], 
              warnings: data.warnings || [],
              analysis: data.analysis || null,
              isProfileComplete: true,
              history: [data.profile],
              historyIndex: 0,
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      setEncrypted: (enabled, keyHash) => {
        set({ encrypted: enabled, masterKeyHash: keyHash || null });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const previousProfile = history[newIndex];
          set({ 
            profile: previousProfile, 
            historyIndex: newIndex 
          });
          get().calculatePriorities();
          get().calculateAnalysis();
        }
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },
    }),
    {
      name: "maple-compass-storage",
      partialize: (state) => ({
        profile: state.profile,
        priorities: state.priorities,
        isProfileComplete: state.isProfileComplete,
        warnings: state.warnings,
        analysis: state.analysis,
        encrypted: state.encrypted,
        history: state.history,
        historyIndex: state.historyIndex,
      }),
    }
  )
);
