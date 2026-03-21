"use client";

import { useMemo } from "react";
import { useFinancialStore } from "@/store/financialStore";
import { calculateMarginalTaxRate, calculateTaxSavings } from "@/data/taxBrackets";
import { TAX_CONSTANTS_2026 } from "@/data/taxConstants";

interface PaymentEvent {
  month: number;
  monthName: string;
  type: "ccb" | "gst" | "carbon" | "tax-refund" | "cpp-max";
  amount: number;
  description: string;
}

export default function PaymentCalendar() {
  const { profile, isProfileComplete, analysis } = useFinancialStore();

  const events = useMemo(() => {
    if (!profile || !isProfileComplete) return [];
    
    const { CCB, GST_CREDIT, CARBON_REBATE } = TAX_CONSTANTS_2026;
    const payments: PaymentEvent[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const ccbAmount = profile.childrenCount > 0 
      ? Math.round((calculateCCBAmount(profile.grossIncome, profile.childrenCount) / 12))
      : 0;
    
    for (let i = 0; i < 12; i++) {
      if (ccbAmount > 0) {
        payments.push({
          month: i,
          monthName: monthNames[i],
          type: "ccb",
          amount: ccbAmount,
          description: "CCB monthly payment",
        });
      }

      if (i === 0 || i === 3 || i === 6 || i === 9) {
        const carbonAmount = calculateCarbonRebateAmount(profile.province, profile.grossIncome, profile.childrenCount, profile.isRural);
        if (carbonAmount > 0) {
          payments.push({
            month: i,
            monthName: monthNames[i],
            type: "carbon",
            amount: Math.round(carbonAmount / 4),
            description: "Carbon rebate (quarterly)",
          });
        }
      }

      if (i === 0 || i === 3 || i === 6 || i === 9) {
        const isSingleProfile = profile.childrenCount === 0 && (profile.spouseIncome || 0) === 0;
        const gstAmount = estimateGSTCredit(profile.grossIncome, isSingleProfile);
        if (gstAmount > 0) {
          payments.push({
            month: i,
            monthName: monthNames[i],
            type: "gst",
            amount: Math.round(gstAmount / 4),
            description: "GST/HST credit (quarterly)",
          });
        }
      }
    }

    if (profile.rrspContributions && profile.rrspContributions > 0) {
      const refund = calculateTaxSavings(profile.rrspContributions, calculateMarginalTaxRate(profile.grossIncome, profile.province));
      if (refund > 0) {
        payments.push({
          month: 3,
          monthName: "Apr",
          type: "tax-refund",
          amount: Math.round(refund),
          description: "Estimated tax refund from RRSP",
        });
      }
    }

    if (analysis?.payrollMilestones && analysis.payrollMilestones.length > 0) {
      const cppMaxMonth = analysis.payrollMilestones.find(m => m.type === "cpp" || m.type === "cpp2");
      if (cppMaxMonth) {
        payments.push({
          month: cppMaxMonth.month - 1,
          monthName: monthNames[cppMaxMonth.month - 1],
          type: "cpp-max",
          amount: Math.round(cppMaxMonth.extraMonthly),
          description: `Extra take-home (${cppMaxMonth.type.toUpperCase()} maxed)`,
        });
      }
    }

    return payments.sort((a, b) => {
      if (a.type === "cpp-max" && b.type !== "cpp-max") return -1;
      if (a.type !== "cpp-max" && b.type === "cpp-max") return 1;
      return b.amount - a.amount;
    });
  }, [profile, analysis]);

  if (!isProfileComplete || !profile || events.length === 0) {
    return null;
  }

  const totalAnnual = events.reduce((sum, e) => sum + e.amount, 0);

  const rrspRefund = profile.rrspContributions && profile.rrspContributions > 0
    ? calculateTaxSavings(profile.rrspContributions, calculateMarginalTaxRate(profile.grossIncome, profile.province))
    : 0;

  return (
    <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            2026 Cash Flow Roadmap
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            When your benefits and refunds will arrive
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Est. Annual Total</p>
          <p className="text-xl font-bold text-green-400">
            ${totalAnnual.toLocaleString()}
          </p>
        </div>
      </div>

      {rrspRefund > 0 && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-2">RRSP Refund Simulator</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Contribution: ${profile.rrspContributions?.toLocaleString()}</span>
            <span className="text-white">→</span>
            <span className="text-green-400 font-medium">Refund: ${Math.round(rrspRefund).toLocaleString()}</span>
          </div>
          <div className="mt-2 h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: "30%" }} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Refund hits ~April (after filing)</p>
        </div>
      )}

      <div className="space-y-2">
        {events.slice(0, 8).map((event, idx) => (
          <div
            key={`${event.type}-${event.month}-${idx}`}
            className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                event.type === "ccb" ? "bg-green-500" :
                event.type === "gst" ? "bg-yellow-500" :
                event.type === "carbon" ? "bg-cyan-500" :
                event.type === "tax-refund" ? "bg-blue-500" :
                "bg-purple-500"
              }`} />
              <div>
                <p className="text-sm text-white">{event.monthName}: {event.description}</p>
                <p className="text-xs text-neutral-500">
                  {event.type === "cpp-max" ? "Cash flow boost!" : "Deposit"}
                </p>
              </div>
            </div>
            <span className={`font-medium ${
              event.type === "cpp-max" ? "text-purple-400" : "text-green-400"
            }`}>
              ${event.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-neutral-400">CCB (monthly)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-neutral-400">GST Credit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-neutral-400">Carbon Rebate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-neutral-400">CPP/EI Maxed</span>
        </div>
      </div>
    </div>
  );
}

function calculateCCBAmount(income: number, children: number): number {
  const { CCB } = TAX_CONSTANTS_2026;
  if (children === 0) return 0;
  let total = 0;
  for (let i = 0; i < children; i++) {
    const tier = CCB.CHILD_TIERS[Math.min(i, 3)];
    const reduction = income > CCB.BASE_INCOME_THRESHOLD 
      ? Math.min((income - CCB.BASE_INCOME_THRESHOLD) * tier.reductionRate, tier.maxBenefit * 0.95) 
      : 0;
    total += Math.max(0, tier.maxBenefit - reduction);
  }
  return total;
}

function calculateCarbonRebateAmount(province: string, income: number, children: number, isRural: boolean): number {
  const { CARBON_REBATE } = TAX_CONSTANTS_2026;
  const amounts = CARBON_REBATE[province as keyof typeof CARBON_REBATE] || CARBON_REBATE.ON;
  let rebate = amounts.base;
  if (income < 65000) rebate = amounts.base * 1.2;
  else if (income > 80000) rebate = amounts.base * 0.8;
  rebate += amounts.spouse + children * amounts.child;
  if (isRural) rebate *= 1.2;
  return Math.round(rebate);
}

function estimateGSTCredit(income: number, isSingle: boolean): number {
  const threshold = isSingle ? 533 : 1056;
  const baseAmount = isSingle ? 319 : 598;
  if (income > threshold * 10) return 0;
  return baseAmount;
}
