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
  mortgageVsInvestRecommendation: "mortgage" | "invest" | "either";
  mortgageSavings: number;
  investmentReturn: number;
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
}

const defaultEconomicData: EconomicData = {
  primeRate: null,
  inflationRate: null,
  cadUsdRate: null,
  carbonRebate: null,
  lastUpdated: null,
};

const OAS_CLAWBACK_THRESHOLD = 81761;
const OAS_FULL_CLAWBACK = 133141;

function calculateOASClawback(income: number): { clawback: number; effectiveRate: number } {
  if (income <= OAS_CLAWBACK_THRESHOLD) {
    return { clawback: 0, effectiveRate: 0 };
  }
  const excessIncome = Math.min(income - OAS_CLAWBACK_THRESHOLD, OAS_FULL_CLAWBACK - OAS_CLAWBACK_THRESHOLD);
  const clawback = excessIncome * 0.15;
  const effectiveRate = (clawback / (income - OAS_CLAWBACK_THRESHOLD)) * 100;
  return { clawback, effectiveRate };
}

function calculateCarbonRebate(province: Province, income: number, children: number): number {
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
  
  return Math.round(rebate);
}

function calculateCCB(income: number, children: number, province: Province): number {
  if (children === 0) return 0;
  
  const maxBenefit = 7483 * children;
  const incomeThreshold = 35000;
  
  let reduction = 0;
  if (income > incomeThreshold) {
    const excess = income - incomeThreshold;
    reduction = Math.min(excess * 0.07, maxBenefit * 0.95);
  }
  
  return Math.round(Math.max(0, maxBenefit - reduction));
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

      setProfile: (profile) => {
        set({ profile, isProfileComplete: true });
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

        priorities.push({
          id: "safety-net",
          level: profile.employerMatch === "full" ? 2 : 1,
          title: "Build Your Safety Net",
          description: "Emergency fund of 3+ months of expenses",
          action:
            profile.emergencyFundStatus === "full"
              ? "Emergency fund is fully funded!"
              : `Save $${Math.round(profile.monthlyExpenses * 3).toLocaleString()} for 3 months expenses`,
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

          if (marginalTaxRate > 0.30) {
            const taxSavings = calculateTaxSavings(1000, marginalTaxRate);
            const ccbIncrease = calculateCCB(profile.grossIncome + 1000, profile.childrenCount, profile.province) - 
                              calculateCCB(profile.grossIncome, profile.childrenCount, profile.province);
            const totalBenefit = taxSavings + ccbIncrease;
            
            priorities.push({
              id: "tax-alpha",
              level: 4,
              title: "Capture Tax Alpha",
              description: `Marginal rate ${(marginalTaxRate * 100).toFixed(1)}% + potential CCB increase`,
              action: "Contribute to RRSP to reduce income and increase CCB",
              completed: false,
              instantReturn: totalBenefit,
            });
          }

          if (profile.mortgageRate > 5.5 && profile.mortgageBalance > 0) {
            priorities.push({
              id: "mortgage-accelerator",
              level: 5,
              title: "Mortgage Accelerator",
              description: `Your ${profile.mortgageRate}% mortgage rate exceeds typical GIC returns`,
              action: `Consider lump sum of $1,000 to save ${(profile.mortgageRate * 10).toFixed(0)}/year in interest`,
              completed: false,
            });
          }
        }

        set({ priorities, warnings });
      },

      calculateAnalysis: () => {
        const { profile } = get();
        if (!profile) return;

        const marginalTaxRate = calculateMarginalTaxRate(
          profile.grossIncome,
          profile.province
        );
        const retirementRate = profile.expectedRetirementTaxRate || 0.20;
        
        let rrspVsTfsa: "rrsp" | "tfsa" | "both" | "fhsa" = "both";
        let rrspBenefit = 0;
        let tfsaBenefit = 0;
        
        if (marginalTaxRate > retirementRate + 0.05) {
          rrspVsTfsa = "rrsp";
          rrspBenefit = (marginalTaxRate - retirementRate) * 100;
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
        let mortgageVsInvest: "mortgage" | "invest" | "either" = "either";
        
        if (mortgageRate > conservativeReturn + 0.01) {
          mortgageVsInvest = "mortgage";
        } else if (mortgageRate < conservativeReturn - 0.01) {
          mortgageVsInvest = "invest";
        }

        const analysis: AnalysisResult = {
          rrspVsTfsaRecommendation: rrspVsTfsa,
          rrspBenefit,
          tfsaBenefit,
          mortgageVsInvestRecommendation: mortgageVsInvest,
          mortgageSavings: mortgageRate * 1000,
          investmentReturn: conservativeReturn * 1000,
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
              isProfileComplete: true 
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
      }),
    }
  )
);
