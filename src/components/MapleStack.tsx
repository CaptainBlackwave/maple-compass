"use client";

import { useFinancialStore } from "@/store/financialStore";
import { calculateMarginalTaxRate } from "@/data/taxBrackets";

export default function MapleStack() {
  const { profile, priorities, togglePriority, analysis, isProfileComplete } =
    useFinancialStore();

  if (!isProfileComplete || !profile || priorities.length === 0) {
    return null;
  }

  const marginalTaxRate = calculateMarginalTaxRate(
    profile.grossIncome,
    profile.province
  );

  const OAS_CLAWBACK_THRESHOLD = 81761;
  const isNearOASClawback = profile.grossIncome > OAS_CLAWBACK_THRESHOLD - 10000;

  return (
    <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Your Maple Stack
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Where your next $100 should go
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Marginal Tax Rate</p>
          <p className="text-xl font-bold text-green-400">
            {(marginalTaxRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {isNearOASClawback && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-400">OAS Clawback Warning</p>
              <p className="text-xs text-neutral-400 mt-1">
                Your income is near the OAS clawback threshold (${OAS_CLAWBACK_THRESHOLD.toLocaleString()}). 
                RRSP contributions can help reduce future clawback.
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mb-4 p-3 bg-neutral-900 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">RRSP vs TFSA</span>
            <span className={`text-sm font-medium ${
              analysis.rrspVsTfsaRecommendation === "fhsa" ? "text-purple-400" :
              analysis.rrspVsTfsaRecommendation === "rrsp" ? "text-blue-400" :
              analysis.rrspVsTfsaRecommendation === "tfsa" ? "text-green-400" : "text-neutral-400"
            }`}>
              {analysis.rrspVsTfsaRecommendation === "fhsa" && "FHSA (Best Choice)"}
              {analysis.rrspVsTfsaRecommendation === "rrsp" && `RRSP (+${analysis.rrspBenefit.toFixed(0)}% benefit)`}
              {analysis.rrspVsTfsaRecommendation === "tfsa" && `TFSA (+${analysis.tfsaBenefit.toFixed(0)}% benefit)`}
              {analysis.rrspVsTfsaRecommendation === "both" && "Both equally beneficial"}
            </span>
          </div>
          {profile.mortgageBalance > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Mortgage vs GIC</span>
              <span className={`text-sm font-medium ${
                analysis.mortgageVsInvestRecommendation === "mortgage" ? "text-orange-400" :
                analysis.mortgageVsInvestRecommendation === "invest" ? "text-green-400" : "text-neutral-400"
              }`}>
                {analysis.mortgageVsInvestRecommendation === "mortgage" && 
                  `Pay down mortgage (${analysis.mortgageSavings.toFixed(0)}/yr savings)`}
                {analysis.mortgageVsInvestRecommendation === "invest" && 
                  `Invest in GIC (${analysis.investmentReturn.toFixed(0)}/yr return)`}
                {analysis.mortgageVsInvestRecommendation === "either" && "Either option works"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {priorities.map((priority) => (
          <div
            key={priority.id}
            className={`relative rounded-lg border transition-all ${
              priority.completed
                ? "bg-neutral-900 border-green-700"
                : "bg-neutral-900 border-neutral-700 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-start gap-4 p-4">
              <button
                onClick={() => togglePriority(priority.id)}
                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  priority.completed
                    ? "bg-green-500 border-green-500"
                    : "border-neutral-500 hover:border-green-500"
                }`}
              >
                {priority.completed && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                      priority.level === 1
                        ? "bg-red-500 text-white"
                        : priority.level === 2
                        ? "bg-orange-500 text-white"
                        : priority.level === 3
                        ? "bg-yellow-500 text-black"
                        : priority.level === 4
                        ? "bg-purple-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {priority.level}
                  </span>
                  <h3
                    className={`font-medium ${
                      priority.completed ? "text-neutral-500 line-through" : "text-white"
                    }`}
                  >
                    {priority.title}
                  </h3>
                </div>
                <p className="text-sm text-neutral-400 mb-2">
                  {priority.description}
                </p>
                <p
                  className={`text-sm font-medium ${
                    priority.completed ? "text-neutral-500" : "text-green-400"
                  }`}
                >
                  {priority.action}
                </p>
                {priority.instantReturn !== undefined && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded">
                    <svg
                      className="w-3 h-3 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span className="text-xs text-green-400">
                      ${priority.instantReturn.toFixed(2)} instant return on $100
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-neutral-900 rounded-lg">
        <p className="text-xs text-neutral-400 text-center">
          <span className="text-red-400 font-medium">L1:</span> Employer Match{" "}
          <span className="mx-1">•</span>
          <span className="text-orange-400 font-medium">L2:</span> Safety Net{" "}
          <span className="mx-1">•</span>
          <span className="text-yellow-400 font-medium">L3:</span> Debt{" "}
          <span className="mx-1">•</span>
          <span className="text-purple-400 font-medium">L4:</span> Tax Alpha{" "}
          <span className="mx-1">•</span>
          <span className="text-blue-400 font-medium">L5:</span> Wealth
        </p>
      </div>
    </div>
  );
}
