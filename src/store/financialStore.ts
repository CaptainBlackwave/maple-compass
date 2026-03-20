"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateMarginalTaxRate, calculateTaxSavings } from "@/data/taxBrackets";

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
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  action: string;
  completed: boolean;
  instantReturn?: number;
}

export interface AnalysisResult {
  rrspVsTfsaRecommendation: "rrsp" | "tfsa" | "both" | "fhsa";
  rrspBenefit: number;
  tfsaBenefit: number;
  ccbBoost: number;
  mortgageVsInvestRecommendation: "mortgage" | "invest" | "either";
  mortgageSavings: number;
  investmentReturn: number;
  taxDragReturn: number;
  cppMaxed: boolean;
  cpp2Maxed: boolean;
  cppSavings: number;
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

const OAS_CLAWBACK_THRESHOLD = 95323;
const OAS_FULL_CLAWBACK = 148179;

const CPP_YMPE = 74600;
const CPP_RATE = 0.0595;
const CPP2_YAMPE = 85000;
const CPP2_RATE = 0.04;

function calculateOASClawback(income: number): { clawback: number; effectiveRate: number } {
  if (income <= OAS_CLAWBACK_THRESHOLD) {
    return { clawback: 0, effectiveRate: 0 };
  }
  const excessIncome = Math.min(income - OAS_CLAWBACK_THRESHOLD, OAS_FULL_CLAWBACK - OAS_CLAWBACK_THRESHOLD);
  const clawback = excessIncome * 0.15;
  const effectiveRate = (clawback / (income - OAS_CLAWBACK_THRESHOLD)) * 100;
  return { clawback, effectiveRate };
}

function calculateCPPContributions(grossIncome: number, province: Province): { cpp: number; cpp2: number; maxed: boolean; maxed2: boolean } {
  const isQuebec = province === "QC";
  
  const cppRate = isQuebec ? 0.064 : CPP_RATE;
  const cppMaxable = Math.max(0, Math.min(grossIncome, CPP_YMPE) - 3500);
  const cpp = Math.round(cppMaxable * cppRate);
  const cppMaxed = grossIncome >= CPP_YMPE;

  let cpp2 = 0;
  let cpp2Maxed = false;
  if (grossIncome > CPP_YMPE) {
    const cpp2Maxable = Math.min(grossIncome, CPP2_YAMPE) - CPP_YMPE;
    cpp2 = Math.round(cpp2Maxable * CPP2_RATE);
    cpp2Maxed = grossIncome >= CPP2_YAMPE;
  }

  return { cpp, cpp2, maxed: cppMaxed, maxed2: cpp2Maxed };
}

function calculateCarbonRebate(province: Province, income: number, children: number, isRural: boolean): number {
  const baseAmounts: Record<string, { base: number; spouse: number; child: number }> = {
    ON: { base: 488, spouse: 244, child: 122 },
    AB: { base: 0, spouse: 0, child: 0 },
    BC: { base: 193, spouse: 96, child: 48 },
    MB: { base: 450, spouse: 225, child: 112 },
    SK: { base: 340, spouse: 170, child: 85 },
    NS: { base: 328, spouse: 164, child: 82 },
    NB: { base: 412, spouse: 206, child: 103 },
    PE: { base: 440, spouse: 220, child: 110 },
    NL: { base: 476, spouse: 238, child: 119 },
    YT: { base: 0, spouse: 0, child: 0 },
    NT: { base: 0, spouse: 0, child: 0 },
    NU: { base: 0, spouse: 0, child: 0 },
    QC: { base: 0, spouse: 0, child: 0 },
  };

  const amounts = baseAmounts[province] || baseAmounts.ON;
  let rebate = amounts.base;
  if (income < 65000) rebate = amounts.base * 1.2;
  else if (income > 80000) rebate = amounts.base * 0.8;
  
  rebate += amounts.spouse;
  rebate += children * amounts.child;
  
  if (isRural) {
    rebate = rebate * 1.2;
  }
  
  return Math.round(rebate);
}

function calculateCCB(netIncome: number, children: number, province: Province): number {
  if (children === 0) return 0;
  
  const maxBenefitPerChild = [
    { threshold: 0, amount: 7483 },
    { threshold: 2, amount: 6720 },
    { threshold: 4, amount: 5956 },
    { threshold: 6, amount: 5193 },
  ];

  let totalBenefit = 0;
  for (let i = 0; i < children; i++) {
    const tier = maxBenefitPerChild[Math.min(i, 3)];
    const reduction = netIncome > 35000 ? Math.min((netIncome - 35000) * 0.07, tier.amount * 0.95) : 0;
    totalBenefit += Math.max(0, tier.amount - reduction);
  }
  
  return Math.round(totalBenefit);
}

function calculateCCBBoost(grossIncome: number, rrspContribution: number, children: number, province: Province): number {
  const currentCCB = calculateCCB(grossIncome, children, province);
  const reducedIncomeCCB = calculateCCB(Math.max(0, grossIncome - rrspContribution), children, province);
  return Math.max(0, reducedIncomeCCB - currentCCB);
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
        const { profile, analysis } = get();
        if (!profile) return;

        const priorities: PriorityItem[] = [];
        const warnings: WarningItem[] = [];
        const marginalTaxRate = calculateMarginalTaxRate(
          profile.grossIncome,
          profile.province
        );

        const netIncome = Math.max(0, profile.grossIncome - (profile.rrspContributions || 0));
        const oasClawback = calculateOASClawback(netIncome);
        
        if (netIncome > OAS_CLAWBACK_THRESHOLD - 15000) {
          warnings.push({
            id: "oas-clawback",
            type: netIncome > OAS_CLAWBACK_THRESHOLD ? "critical" : "warning",
            title: "OAS Clawback Warning",
            description: `Net income of $${netIncome.toLocaleString()} triggers OAS recovery tax. RRSP contributions can help reduce this.`,
          });
        }

        if (profile.employerMatch === "full") {
          priorities.push({
            id: "employer-match",
            level: 1,
            title: "Employer Match",
            description: "100% instant return on your contributions",
            action: `Contribute enough to get full employer match ($${(profile.grossIncome * 0.05).toLocaleString()}/year)`,
            completed: false,
            instantReturn: profile.grossIncome * 0.05,
          });
        }

        const recommendedMonths = (get().economicData.inflationRate || 2) > 4 ? 6 : 3;
        
        priorities.push({
          id: "safety-net",
          level: profile.employerMatch === "full" ? 2 : 1,
          title: "Build Your Safety Net",
          description: `Emergency fund of ${recommendedMonths} months (${(get().economicData.inflationRate || 2) > 4 ? 'high inflation' : 'standard'} recommendation)`,
          action:
            profile.emergencyFundStatus === "full"
              ? "Emergency fund is fully funded!"
              : `Save $${Math.round(profile.monthlyExpenses * recommendedMonths).toLocaleString()} for ${recommendedMonths} months expenses`,
          completed: profile.emergencyFundStatus === "full",
        });

        if (profile.debtInterestRate > 7 && profile.totalHighInterestDebt > 0) {
          priorities.push({
            id: "high-interest-debt",
            level: profile.employerMatch === "full" || profile.emergencyFundStatus === "full" ? 3 : 2,
            title: "Pay Off High-Interest Debt",
            description: `Debt interest (${profile.debtInterestRate}%) exceeds typical investment returns`,
            action: `Pay off $${Math.round(profile.totalHighInterestDebt).toLocaleString()} in high-interest debt`,
            completed: false,
          });
        }

        const safetyNetComplete = profile.emergencyFundStatus === "full";
        const debtHandled = profile.debtInterestRate <= 7 || profile.totalHighInterestDebt === 0;
        
        if (safetyNetComplete && debtHandled) {
          const isFirstTimeHomeBuyer = profile.homeOwnerStatus === "first-time-buyer" || profile.homeOwnerStatus === "renter";
          
          if (profile.fhsaRoom > 0 && isFirstTimeHomeBuyer) {
            const taxSavings = calculateTaxSavings(1000, marginalTaxRate);
            priorities.push({
              id: "fhsa",
              level: 4,
              title: "FHSA - Best of Both Worlds",
              description: "Tax-deductible contributions, tax-free withdrawals for home purchase",
              action: `Contribute to FHSA ($${profile.fhsaRoom.toLocaleString()} room remaining)`,
              completed: false,
              instantReturn: taxSavings,
            });
          }

          if (marginalTaxRate > 0.25 || profile.childrenCount > 0) {
            const taxSavings = calculateTaxSavings(1000, marginalTaxRate);
            const ccbIncrease = profile.childrenCount > 0 
              ? calculateCCBBoost(profile.grossIncome, 1000, profile.childrenCount, profile.province)
              : 0;
            const totalBenefit = taxSavings + ccbIncrease;
            
            priorities.push({
              id: "tax-alpha",
              level: 4,
              title: profile.childrenCount > 0 ? "Capture Tax Alpha + CCB Boost" : "Capture Tax Alpha",
              description: `Marginal rate ${(marginalTaxRate * 100).toFixed(1)}%${profile.childrenCount > 0 ? ` + CCB boost ($${ccbIncrease * 12}/yr)` : ''}`,
              action: "Contribute to RRSP to reduce income and increase CCB",
              completed: false,
              instantReturn: totalBenefit,
            });
          }

          if (analysis?.cppMaxed || analysis?.cpp2Maxed) {
            priorities.push({
              id: "cpp-maxed",
              level: 4,
              title: "CPP Maxed - Redirect to TFSA",
              description: analysis?.cpp2Maxed 
                ? "CPP and CPP2 are now maxed for the year"
                : "CPP is now maxed for the year",
              action: analysis?.cpp2Maxed
                ? `Redirect ~$${Math.round((CPP2_RATE * (CPP2_YAMPE - CPP_YMPE)) / 12)}/month to TFSA`
                : `Redirect ~$${Math.round(((CPP_YMPE - 3500) * CPP_RATE) / 12)}/month to TFSA`,
              completed: false,
            });
          }

          if (profile.mortgageBalance > 0 && profile.mortgageRate > 0) {
            const taxDragReturn = profile.mortgageRate / (1 - marginalTaxRate);
            const shouldPayMortgage = profile.mortgageRate > analysis?.taxDragReturn! * 1.01;
            
            if (shouldPayMortgage) {
              priorities.push({
                id: "mortgage-accelerator",
                level: 5,
                title: "Mortgage Accelerator",
                description: `Your ${profile.mortgageRate}% mortgage beats ${(analysis?.taxDragReturn || 0.045 * 100).toFixed(1)}% after-tax GIC return`,
                action: `Consider lump sum to save ${(profile.mortgageRate * 10).toFixed(0)}/yr in interest`,
                completed: false,
              });
            }
          }
        }

        set({ priorities, warnings });
      },

      calculateAnalysis: () => {
        const { profile, economicData } = get();
        if (!profile) return;

        const marginalTaxRate = calculateMarginalTaxRate(
          profile.grossIncome,
          profile.province
        );
        const retirementRate = profile.expectedRetirementTaxRate / 100 || 0.20;
        
        const cppContribs = calculateCPPContributions(profile.grossIncome, profile.province);
        
        let rrspVsTfsa: "rrsp" | "tfsa" | "both" | "fhsa" = "both";
        let rrspBenefit = 0;
        let tfsaBenefit = 0;
        let ccbBoost = 0;
        
        const ccbIncrease = profile.childrenCount > 0 
          ? calculateCCBBoost(profile.grossIncome, 1000, profile.childrenCount, profile.province)
          : 0;
        
        if (marginalTaxRate > retirementRate + 0.05 || ccbBoost > 50) {
          rrspVsTfsa = "rrsp";
          rrspBenefit = (marginalTaxRate - retirementRate) * 100 + ccbIncrease * 12;
          ccbBoost = ccbIncrease * 12;
        } else if (marginalTaxRate < retirementRate - 0.05) {
          rrspVsTfsa = "tfsa";
          tfsaBenefit = (retirementRate - marginalTaxRate) * 100;
        }

        const isFirstTimeHomeBuyer = profile.homeOwnerStatus === "first-time-buyer" || profile.homeOwnerStatus === "renter";
        if (profile.fhsaRoom > 0 && isFirstTimeHomeBuyer) {
          rrspVsTfsa = "fhsa";
        }

        const mortgageRate = profile.mortgageRate || 5.5;
        const conservativeReturn = 0.045;
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
          ccbBoost,
          mortgageVsInvestRecommendation: mortgageVsInvest,
          mortgageSavings: mortgageRate * 1000,
          investmentReturn: conservativeReturn * 1000,
          taxDragReturn: taxDragReturn * 100,
          cppMaxed: cppContribs.maxed,
          cpp2Maxed: cppContribs.maxed2,
          cppSavings: cppContribs.cpp + cppContribs.cpp2,
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
