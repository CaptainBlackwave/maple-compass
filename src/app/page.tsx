import EconomicPulse from "@/components/EconomicPulse";
import Profiler from "@/components/Profiler";
import MapleStack from "@/components/MapleStack";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            The Maple Compass
          </h1>
          <p className="text-neutral-400 text-sm md:text-base">
            Your tax-optimized financial roadmap • Zero knowledge, 100% Canadian
          </p>
        </header>

        <div className="space-y-6">
          <EconomicPulse />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Profiler />
            <MapleStack />
          </div>

          <footer className="mt-12 pt-6 border-t border-neutral-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Privacy Score: 100/100</span>
              </div>
              <p>All calculations happen in your browser. No data is ever sent to any server.</p>
              <p>2026 CRA Tax Brackets</p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
