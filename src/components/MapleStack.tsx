"use client";

import { useFinancialStore } from "@/store/financialStore";
import { calculateMarginalTaxRate } from "@/data/taxBrackets";
import { TAX_CONSTANTS_2026 } from "@/data/taxConstants";

export default function MapleStack() {
  const { profile, priorities, togglePriority, warnings, analysis, isProfileComplete } =
    useFinancialStore();

  if (!isProfileComplete || !profile || priorities.length === 0) {
    return null;
  }

  const marginalTaxRate = calculateMarginalTaxRate(
    profile.grossIncome,
    profile.province
  );

  const effectiveMTR = analysis?.effectiveMTR || marginalTaxRate;
  const { OAS } = TAX_CONSTANTS_2026;
  const isNearOASClawback = profile.grossIncome > OAS.CLAWBACK_START - 10000;

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
          <p className="text-xs text-neutral-400">Effective MTR</p>
          <p className="text-xl font-bold text-green-400">
            {(effectiveMTR * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {warnings.map((warning) => (
        <div
          key={warning.id}
          className={`mb-4 p-3 rounded-lg border ${
            warning.type === "critical"
              ? "bg-red-500/10 border-red-500/30"
              : warning.type === "warning"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-blue-500/10 border-blue-500/30"
          }`}
        >
          <div className="flex items-start gap-2">
            <svg
              className={`w-5 h-5 flex-shrink-0 ${
                warning.type === "critical"
                  ? "text-red-500"
                  : warning.type === "warning"
                  ? "text-yellow-500"
                  : "text-blue-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className={`text-sm font-medium ${
                warning.type === "critical"
                  ? "text-red-400"
                  : warning.type === "warning"
                  ? "text-yellow-400"
                  : "text-blue-400"
              }`}>
                {warning.title}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {warning.description}
              </p>
            </div>
          </div>
        </div>
      ))}

      {isNearOASClawback && !warnings.find(w => w.id === "oas-clawback") && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-400">OAS Clawback Warning</p>
              <p className="text-xs text-neutral-400 mt-1">
                Your income is near the OAS clawback threshold (${OAS.CLAWBACK_START.toLocaleString()}). 
                RRSP contributions can help reduce future clawback.
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mb-4 p-3 bg-neutral-900 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Effective MTR</span>
            <div className="text-right">
              <span className={`text-sm font-medium ${
                effectiveMTR > 0.40 ? "text-red-400" :
                effectiveMTR > 0.30 ? "text-yellow-400" : "text-green-400"
              }`}>
                {(effectiveMTR * 100).toFixed(1)}%
              </span>
              {effectiveMTR > marginalTaxRate && (
                <span className="text-xs text-blue-400 ml-2">(incl. CCB)</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">RRSP vs TFSA</span>
            <span className={`text-sm font-medium ${
              analysis.rrspVsTfsaRecommendation === "fhsa" ? "text-purple-400" :
              analysis.rrspVsTfsaRecommendation === "rrsp" ? "text-blue-400" :
              analysis.rrspVsTfsaRecommendation === "tfsa" ? "text-green-400" : "text-neutral-400"
            }`}>
              {analysis.rrspVsTfsaRecommendation === "fhsa" && "FHSA (Best)"}
              {analysis.rrspVsTfsaRecommendation === "rrsp" && `RRSP (+${analysis.rrspBenefit.toFixed(0)}%)`}
              {analysis.rrspVsTfsaRecommendation === "tfsa" && `TFSA (+${analysis.tfsaBenefit.toFixed(0)}%)`}
              {analysis.rrspVsTfsaRecommendation === "both" && "Both equal"}
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
                  `Pay mortgage (${(analysis.taxDragReturn).toFixed(1)}% breakeven)`}
                {analysis.mortgageVsInvestRecommendation === "invest" && 
                  "Invest in GIC"}
                {analysis.mortgageVsInvestRecommendation === "either" && "Either"}
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
                        ? "bg-green-500 text-white"
                        : priority.level === 2
                        ? "bg-purple-500 text-white"
                        : priority.level === 3
                        ? "bg-orange-500 text-white"
                        : priority.level === 4
                        ? "bg-blue-500 text-white"
                        : priority.level === 5
                        ? "bg-yellow-500 text-black"
                        : "bg-neutral-500 text-white"
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
                {priority.instantReturn !== undefined && priority.instantReturn > 0 && (
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
                      ${priority.instantReturn.toFixed(2)} on $100
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
          <span className="text-green-400 font-medium">L1:</span> Match{" "}
          <span className="mx-1">•</span>
          <span className="text-purple-400 font-medium">L2:</span> FHSA{" "}
          <span className="mx-1">•</span>
          <span className="text-orange-400 font-medium">L3:</span> Debt{" "}
          <span className="mx-1">•</span>
          <span className="text-blue-400 font-medium">L4:</span> EF{" "}
          <span className="mx-1">•</span>
          <span className="text-yellow-400 font-medium">L5:</span> RRSP{" "}
          <span className="mx-1">•</span>
          <span className="text-neutral-400 font-medium">L6:</span> TFSA
        </p>
      </div>
    </div>
  );
}
