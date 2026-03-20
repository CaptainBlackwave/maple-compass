"use client";

import { useEffect, useState } from "react";
import { useFinancialStore } from "@/store/financialStore";

interface EconomicMetric {
  label: string;
  value: string;
  subtext: string;
  trend?: "up" | "down" | "neutral";
}

export default function EconomicPulse() {
  const { updateEconomicData } = useFinancialStore();
  const [metrics, setMetrics] = useState<EconomicMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEconomicData() {
      try {
        const [primeData, inflationData, fxData] = await Promise.all([
          fetch(
            "https://api.bankofcanada.ca/v1/observations/AVG_MORTGAGE_RATE/json"
          ).then((r) => r.json()),
          fetch(
            "https://api.bankofcanada.ca/v1/observations/v41690914/json"
          ).then((r) => r.json()),
          fetch(
            "https://api.bankofcanada.ca/v1/observations/FXUSDCAD/json"
          ).then((r) => r.json()),
        ]);

        const primeRate = primeData?.observations?.[0]?.AVG_MORTGAGE_RATE?.v;
        const inflationValue =
          inflationData?.observations?.[inflationData.observations.length - 1]
            ?.v41690914?.v;
        const cadUsdRaw = fxData?.observations?.[fxData.observations.length - 1]
          ?.FXUSDCAD?.v;
        const cadUsd = cadUsdRaw !== undefined ? parseFloat(cadUsdRaw as string) : null;

        const inflationRaw = inflationValue as string | undefined;
        const formattedInflation = inflationRaw !== undefined && inflationRaw !== null
          ? (parseFloat(inflationRaw) * 100).toFixed(1)
          : null;

        const primeRateValue = primeRate !== undefined && primeRate !== null 
          ? parseFloat(primeRate as string) / 100 
          : null;

        updateEconomicData({
          primeRate: primeRateValue,
          inflationRate:
            formattedInflation !== null
              ? parseFloat(formattedInflation)
              : null,
          cadUsdRate: cadUsd,
          lastUpdated: new Date().toISOString(),
        });

        const newMetrics: EconomicMetric[] = [];

        if (primeRateValue !== null) {
          newMetrics.push({
            label: "Prime Rate",
            value: `${primeRateValue.toFixed(2)}%`,
            subtext: "For debt comparison",
          });
        }

        if (formattedInflation !== null) {
          const inflationNum = parseFloat(formattedInflation);
          newMetrics.push({
            label: "Inflation (CPI)",
            value: `${formattedInflation}%`,
            subtext: "Target: real returns above this",
            trend: inflationNum > 2 ? "up" : "neutral",
          });
        }

        if (cadUsd !== null) {
          newMetrics.push({
            label: "CAD/USD",
            value: `$${cadUsd.toFixed(4)}`,
            subtext: "Exchange rate",
          });
        }

        setMetrics(newMetrics);
        setError(null);
      } catch (err) {
        setError("Could not fetch economic data");
        setMetrics([
          {
            label: "Prime Rate",
            value: "6.95%",
            subtext: "Estimate as of March 2026",
          },
          {
            label: "Inflation (CPI)",
            value: "2.3%",
            subtext: "Estimate as of March 2026",
          },
          {
            label: "CAD/USD",
            value: "$0.6925",
            subtext: "Estimate as of March 2026",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchEconomicData();
  }, [updateEconomicData]);

  return (
    <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Economic Pulse
        </h2>
        <span className="text-xs text-neutral-400">
          Bank of Canada Data
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-neutral-900 rounded-lg p-4"
            >
              <p className="text-xs text-neutral-400 mb-1">
                {metric.label}
              </p>
              <p className="text-2xl font-bold text-white">
                {metric.value}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {metric.subtext}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-neutral-500 mt-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
