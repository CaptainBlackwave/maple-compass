"use client";

import { useState } from "react";
import { useFinancialStore, Province, EmergencyFundStatus, UserProfile } from "@/store/financialStore";
import { calculateMarginalTaxRate } from "@/data/taxBrackets";

const provinces: Province[] = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

const provinceNames: Record<Province, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland & Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export default function Profiler() {
  const { profile, setProfile, wipeAllData, isProfileComplete } = useFinancialStore();
  const [formData, setFormData] = useState<Partial<UserProfile>>(
    profile || {
      grossIncome: 0,
      province: "ON" as Province,
      totalHighInterestDebt: 0,
      debtInterestRate: 0,
      emergencyFundStatus: "none" as EmergencyFundStatus,
      monthlyExpenses: 0,
      emergencyFundMonths: 0,
      fhsaRoom: 0,
      tfsaRoom: 0,
      rrspRoom: 0,
    }
  );
  const [showForm, setShowForm] = useState(!isProfileComplete);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.grossIncome && formData.province) {
      setProfile(formData as UserProfile);
      setShowForm(false);
    }
  };

  const marginalRate = formData.grossIncome
    ? calculateMarginalTaxRate(formData.grossIncome, formData.province || "ON")
    : 0;

  if (profile && !showForm) {
    return (
      <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Your Financial Profile
          </h2>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Edit
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-400">Income</span>
            <span className="text-white">
              ${formData.grossIncome?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Province</span>
            <span className="text-white">
              {provinceNames[formData.province as Province]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Marginal Tax Rate</span>
            <span className="text-green-400">
              {(marginalRate * 100).toFixed(1)}%
            </span>
          </div>
          {(formData.totalHighInterestDebt ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-400">High-Interest Debt</span>
              <span className="text-red-400">
                ${(formData.totalHighInterestDebt ?? 0).toLocaleString()} ({formData.debtInterestRate ?? 0}%)
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-400">Emergency Fund</span>
            <span className={formData.emergencyFundStatus === "full" ? "text-green-400" : "text-yellow-400"}>
              {formData.emergencyFundStatus === "full"
                ? "3+ months"
                : formData.emergencyFundStatus === "partial"
                ? "1-3 months"
                : "None"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-700">
          <button
            onClick={wipeAllData}
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Wipe All Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
      <h2 className="text-lg font-semibold text-white mb-4">
        Your Financial Profile
      </h2>
      <p className="text-sm text-neutral-400 mb-6">
        All data stays in your browser. No accounts, no tracking.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Gross Annual Income
            </label>
            <input
              type="number"
              value={formData.grossIncome || ""}
              onChange={(e) =>
                setFormData({ ...formData, grossIncome: parseInt(e.target.value) || 0 })
              }
              placeholder="75000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Province/Territory
            </label>
            <select
              value={formData.province}
              onChange={(e) =>
                setFormData({ ...formData, province: e.target.value as Province })
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {provinceNames[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Monthly Expenses
            </label>
            <input
              type="number"
              value={formData.monthlyExpenses || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyExpenses: parseInt(e.target.value) || 0,
                })
              }
              placeholder="3000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Emergency Fund Status
            </label>
            <select
              value={formData.emergencyFundStatus}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emergencyFundStatus: e.target.value as EmergencyFundStatus,
                })
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="none">None</option>
              <option value="partial">1-3 months</option>
              <option value="full">3+ months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              High-Interest Debt ($)
            </label>
            <input
              type="number"
              value={formData.totalHighInterestDebt || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalHighInterestDebt: parseInt(e.target.value) || 0,
                })
              }
              placeholder="5000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Debt Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.debtInterestRate || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  debtInterestRate: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="19.99"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              FHSA Room ($)
            </label>
            <input
              type="number"
              value={formData.fhsaRoom || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fhsaRoom: parseInt(e.target.value) || 0,
                })
              }
              placeholder="40000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              TFSA Room ($)
            </label>
            <input
              type="number"
              value={formData.tfsaRoom || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tfsaRoom: parseInt(e.target.value) || 0,
                })
              }
              placeholder="7000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              RRSP Room ($)
            </label>
            <input
              type="number"
              value={formData.rrspRoom || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rrspRoom: parseInt(e.target.value) || 0,
                })
              }
              placeholder="15000"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Calculate My Roadmap
        </button>
      </form>
    </div>
  );
}
