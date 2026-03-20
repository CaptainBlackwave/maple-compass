"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinancialStore } from "@/store/financialStore";
import { calculateMarginalTaxRate } from "@/data/taxBrackets";
import { calculateCompassGap } from "@/utils/optimizationEngine";
import { TAX_CONSTANTS_2026 } from "@/data/taxConstants";

function estimateCCB(income: number, children: number): number {
  if (children === 0) return 0;
  const { CCB } = TAX_CONSTANTS_2026;
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

export default function CompassGapVisualizer() {
  const { profile, isProfileComplete } = useFinancialStore();

  const projection = useMemo(() => {
    if (!profile || !isProfileComplete || profile.age < 18) return null;

    const marginalRate = calculateMarginalTaxRate(profile.grossIncome, profile.province);
    const annualContribution = profile.rrspContributions || 5000;
    const ccbValue = profile.childrenCount > 0 ? estimateCCB(profile.grossIncome, profile.childrenCount) : 0;

    return calculateCompassGap(
      profile.age,
      0,
      annualContribution,
      marginalRate,
      profile.childrenCount > 0,
      ccbValue,
      profile.mortgageBalance > 0,
      profile.mortgageRate || 0.055,
      profile.mortgageBalance || 0,
      25
    );
  }, [profile, isProfileComplete]);

  if (!projection || projection.projections.length === 0) {
    return null;
  }

  const data = projection.projections.filter((_, i) => i % 5 === 0 || i === projection.projections.length - 1);

  return (
    <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            The Compass Gap
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            25-year wealth projection
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Value Add</p>
          <p className="text-xl font-bold text-green-400">
            +${(projection.finalGap / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis 
              dataKey="year" 
              stroke="#737373" 
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
            />
            <YAxis 
              stroke="#737373" 
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: "#171717", 
                border: "1px solid #404040",
                borderRadius: "8px"
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="standardWealth" 
              name="Standard Path"
              stroke="#737373" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="optimizedWealth" 
              name="Compass Path"
              stroke="#22c55e" 
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-sm text-green-400 text-center">
          The Maple Compass adds <strong>${projection.finalGap.toLocaleString()}</strong> to your wealth over 25 years
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div className="bg-neutral-900 p-3 rounded">
          <p className="text-neutral-400">Standard Path (25yr)</p>
          <p className="text-white font-medium">${projection.standardTotal.toLocaleString()}</p>
        </div>
        <div className="bg-neutral-900 p-3 rounded">
          <p className="text-neutral-400">Compass Path (25yr)</p>
          <p className="text-green-400 font-medium">${projection.optimizedTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
