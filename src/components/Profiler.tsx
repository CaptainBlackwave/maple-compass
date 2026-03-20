"use client";

import { useState } from "react";
import { useFinancialStore, Province, EmergencyFundStatus, HomeOwnerStatus, EmployerMatchStatus, UserProfile } from "@/store/financialStore";
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

export default function Profiler() {
  const { profile, setProfile, wipeAllData, isProfileComplete, exportData, importData } = useFinancialStore();
  const [showForm, setShowForm] = useState(!isProfileComplete);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");

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
      expectedRetirementTaxRate: 20,
      homeOwnerStatus: "renter" as HomeOwnerStatus,
      mortgageRate: 5.5,
      mortgageBalance: 0,
      childrenCount: 0,
      employerMatch: "none" as EmployerMatchStatus,
      age: 30,
      isRural: false,
      rrspContributions: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.grossIncome && formData.province) {
      setProfile(formData as UserProfile);
      setShowForm(false);
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maple-compass-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importData(importJson)) {
      setShowImport(false);
      setImportJson("");
    }
  };

  const marginalRate = formData.grossIncome
    ? calculateMarginalTaxRate(formData.grossIncome, formData.province || "ON")
    : 0;

  const carbonRebate = formData.grossIncome && formData.province
    ? calculateCarbonRebate(formData.province, formData.grossIncome, formData.childrenCount || 0, formData.isRural || false)
    : 0;

  const isQuebec = formData.province === "QC";

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
              {isQuebec && <span className="text-yellow-400 ml-1">(QPIP/QPP)</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Marginal Tax Rate</span>
            <span className="text-green-400">
              {(marginalRate * 100).toFixed(1)}%
            </span>
          </div>
          {carbonRebate > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Carbon Rebate (Est.)</span>
              <span className="text-green-400">
                ${carbonRebate}/year
              </span>
            </div>
          )}
          {(formData.totalHighInterestDebt ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-400">High-Interest Debt</span>
              <span className="text-red-400">
                ${(formData.totalHighInterestDebt ?? 0).toLocaleString()} ({formData.debtInterestRate ?? 0}%)
              </span>
            </div>
          )}
          {(formData.mortgageBalance ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Mortgage</span>
              <span className="text-yellow-400">
                ${(formData.mortgageBalance ?? 0).toLocaleString()} ({formData.mortgageRate ?? 5.5}%)
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
          <div className="flex justify-between">
            <span className="text-neutral-400">Home Status</span>
            <span className="text-white">
              {formData.homeOwnerStatus === "owner" ? "Owner" : 
               formData.homeOwnerStatus === "first-time-buyer" ? "First-Time Buyer" : "Renter"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-700 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Data
          </button>
          <button
            onClick={wipeAllData}
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 sm:ml-auto"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Wipe All Data
          </button>
        </div>

        {showImport && (
          <div className="mt-4 p-3 bg-neutral-900 rounded-lg">
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste your exported JSON here..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-xs font-mono h-24"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleImport}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded"
              >
                Import
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="px-3 py-1 bg-neutral-700 text-white text-xs rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
              Gross Annual Income *
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
              Province/Territory *
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Age
            </label>
            <input
              type="number"
              value={formData.age || ""}
              onChange={(e) =>
                setFormData({ ...formData, age: parseInt(e.target.value) || 0 })
              }
              placeholder="30"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Employer Match
            </label>
            <select
              value={formData.employerMatch}
              onChange={(e) =>
                setFormData({ ...formData, employerMatch: e.target.value as EmployerMatchStatus })
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="none">None</option>
              <option value="partial">Partial</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              RRSP Contributions (Annual)
            </label>
            <input
              type="number"
              value={formData.rrspContributions || ""}
              onChange={(e) =>
                setFormData({ ...formData, rrspContributions: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Children (under 18)
            </label>
            <input
              type="number"
              value={formData.childrenCount || ""}
              onChange={(e) =>
                setFormData({ ...formData, childrenCount: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRural || false}
                onChange={(e) =>
                  setFormData({ ...formData, isRural: e.target.checked })
                }
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-neutral-300">Rural Resident (+20% CAIP)</span>
            </label>
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
                setFormData({ ...formData, monthlyExpenses: parseInt(e.target.value) || 0 })
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
                setFormData({ ...formData, emergencyFundStatus: e.target.value as EmergencyFundStatus })
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
                setFormData({ ...formData, totalHighInterestDebt: parseInt(e.target.value) || 0 })
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
                setFormData({ ...formData, debtInterestRate: parseFloat(e.target.value) || 0 })
              }
              placeholder="19.99"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Home Ownership Status
            </label>
            <select
              value={formData.homeOwnerStatus}
              onChange={(e) =>
                setFormData({ ...formData, homeOwnerStatus: e.target.value as HomeOwnerStatus })
              }
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="renter">Renter</option>
              <option value="first-time-buyer">First-Time Buyer</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              Expected Retirement Tax Rate (%)
            </label>
            <input
              type="number"
              step="1"
              value={formData.expectedRetirementTaxRate || ""}
              onChange={(e) =>
                setFormData({ ...formData, expectedRetirementTaxRate: parseFloat(e.target.value) || 20 })
              }
              placeholder="20"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {(formData.homeOwnerStatus === "owner" || formData.homeOwnerStatus === "first-time-buyer") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">
                Mortgage Balance ($)
              </label>
              <input
                type="number"
                value={formData.mortgageBalance || ""}
                onChange={(e) =>
                  setFormData({ ...formData, mortgageBalance: parseInt(e.target.value) || 0 })
                }
                placeholder="300000"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-1">
                Mortgage Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.mortgageRate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, mortgageRate: parseFloat(e.target.value) || 5.5 })
                }
                placeholder="5.5"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">
              FHSA Room ($)
            </label>
            <input
              type="number"
              value={formData.fhsaRoom || ""}
              onChange={(e) =>
                setFormData({ ...formData, fhsaRoom: parseInt(e.target.value) || 0 })
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
                setFormData({ ...formData, tfsaRoom: parseInt(e.target.value) || 0 })
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
                setFormData({ ...formData, rrspRoom: parseInt(e.target.value) || 0 })
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
