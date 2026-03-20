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
}

export interface EconomicData {
  primeRate: number | null;
  inflationRate: number | null;
  cadUsdRate: number | null;
  lastUpdated: string | null;
}

export interface PriorityItem {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  action: string;
  completed: boolean;
  instantReturn?: number;
}

interface FinancialState {
  profile: UserProfile | null;
  economicData: EconomicData;
  priorities: PriorityItem[];
  isProfileComplete: boolean;

  setProfile: (profile: UserProfile) => void;
  updateEconomicData: (data: EconomicData) => void;
  togglePriority: (id: string) => void;
  calculatePriorities: () => void;
  wipeAllData: () => void;
  setProfileComplete: (complete: boolean) => void;
}

const defaultEconomicData: EconomicData = {
  primeRate: null,
  inflationRate: null,
  cadUsdRate: null,
  lastUpdated: null,
};

export const useFinancialStore = create<FinancialState>()(
  persist(
    (set, get) => ({
      profile: null,
      economicData: defaultEconomicData,
      priorities: [],
      isProfileComplete: false,

      setProfile: (profile) => {
        set({ profile, isProfileComplete: true });
        get().calculatePriorities();
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
        const { profile, economicData } = get();
        if (!profile) return;

        const priorities: PriorityItem[] = [];
        const marginalTaxRate = calculateMarginalTaxRate(
          profile.grossIncome,
          profile.province
        );
        const investmentReturnRate = 0.05;

        priorities.push({
          id: "safety-net",
          level: 1,
          title: "Build Your Safety Net",
          description: "Emergency fund of 3+ months of expenses",
          action:
            profile.emergencyFundStatus === "full"
              ? "Emergency fund is fully funded!"
              : `Save $${Math.round(profile.monthlyExpenses * 3).toLocaleString()} for 3 months expenses`,
          completed: profile.emergencyFundStatus === "full",
        });

        if (profile.debtInterestRate > 7 && profile.totalHighInterestDebt > 0) {
          const interestSavings = (profile.totalHighInterestDebt * profile.debtInterestRate) / 100;
          priorities.push({
            id: "high-interest-debt",
            level: 2,
            title: "Pay Off High-Interest Debt",
            description: `Debt interest (${profile.debtInterestRate}%) exceeds typical investment returns`,
            action: `Pay off $${Math.round(profile.totalHighInterestDebt).toLocaleString()} in high-interest debt`,
            completed: false,
          });
        }

        if (marginalTaxRate > 0.30) {
          const taxSavings = calculateTaxSavings(1000, marginalTaxRate);
          priorities.push({
            id: "tax-alpha",
            level: 3,
            title: "Capture Tax Alpha",
            description: `Your marginal tax rate (${(marginalTaxRate * 100).toFixed(1)}%) means RRSP/FHSA gives instant return`,
            action: "Contribute to RRSP or FHSA to reduce taxes",
            completed: false,
            instantReturn: taxSavings,
          });
        }

        priorities.push({
          id: "wealth-builder",
          level: 4,
          title: "Build Long-Term Wealth",
          description:
            "TFSA vs RRSP vs FHSA vs Mortgage prepayment",
          action:
            profile.fhsaRoom > 0
              ? `Contribute to FHSA ($${profile.fhsaRoom.toLocaleString()} room remaining)`
              : profile.tfsaRoom > 0
              ? `Contribute to TFSA ($${profile.tfsaRoom.toLocaleString()} room remaining)`
              : "Maximize RRSP contributions",
          completed: false,
        });

        set({ priorities });
      },

      wipeAllData: () => {
        set({
          profile: null,
          priorities: [],
          isProfileComplete: false,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("maple-compass-storage");
        }
      },
    }),
    {
      name: "maple-compass-storage",
      partialize: (state) => ({
        profile: state.profile,
        priorities: state.priorities,
        isProfileComplete: state.isProfileComplete,
      }),
    }
  )
);
