# The Maple Compass

A privacy-first, tax-optimized financial roadmap for Canadians.

![Privacy Score: 100/100](https://img.shields.io/badge/Privacy-100%2F100-green)
![Next.js](https://img.shields.io/badge/Next.js-16-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Principles

- **Zero-Knowledge**: No data ever leaves your browser. No database, no cookies, no tracking.
- **Local-First**: All calculations happen on the client side using JavaScript.
- **Action-Oriented**: Instead of "tracking," the app provides "steering"—telling you exactly what to do with your next $100.

---

## Core Features

### Economic Pulse Dashboard
Automatically fetches real-time Canadian economic data from the Bank of Canada Valet API:
- Prime Rate (for debt comparison)
- CPI/Inflation (for "real" return targets)
- CAD/USD exchange rate

### Privacy-First Profiler
Input your financial details—all stored locally in your browser:
- Gross Income, Province, Age
- Total High-Interest Debt & Interest Rate
- Emergency Fund Status
- FHSA/TFSA/RRSP contribution room & annual contributions
- Home Ownership Status & Mortgage Details
- Employer Match Status
- Number of Children (for CCB calculation)
- RDSP (Disability Tax Credit eligibility)
- RESP (Children's education savings)
- Medical Expenses & Spouse Income
- Capital Gains
- Estate Assets (Primary/Secondary property, RRIF)
- Self-Employment & Corporate Income
- Moving Province (for tax arbitrage)

### The Maple Stack
A 6-level priority queue for your next $100 (dynamically reordered based on your situation):

| Level | Priority | Description |
|-------|----------|-------------|
| 1 | Employer Match | 100% instant ROI (free money) |
| 2 | FHSA | Best of both worlds (first-time buyers) |
| 3 | High-Interest Debt Fire | Debt > 7% - moves up for high earners |
| 4 | Emergency Fund | 3-6 months (scaled by inflation) |
| 5 | RRSP/Tax Alpha | CCB boost + OAS protection |
| 6 | TFSA | Wealth builder |

---

## Advanced Tax Optimization

### RRSP vs TFSA Decision Engine
Compares your **Effective Marginal Tax Rate** (MTR) vs. expected retirement tax rate. Includes:
- CCB phase-out "hidden tax" (7-19% for children)
- RRSP annual limit detection ($33,810 max)
- Automatic pivot to TFSA when RRSP is maxed

### OAS Clawback Protection (Fixed Logic)
- **2026 Threshold**: $95,323 (Line 23400 Net Income)
- **Full Recovery**: $148,179 (receives $0 OAS)
- Shows "OAS Fully Recovered" status instead of just warning
- Notes that RRSP won't help recover at very high incomes (~would need $600k+)

### Mortgage vs Market (with Tax Drag - Fixed)
**Correct Formula**: `Breakeven Return = GIC Rate / (1 - Marginal Tax Rate)`

At 54% MTR (high income in NS):
- 5.5% mortgage ÷ (1 - 0.54) = **12% breakeven**
- No GIC pays 12% → Recommendation: **Pay Mortgage**

### CPP/OAS Deferral Simulator
Shows guaranteed "risk-free" returns:
- CPP: +8.4% per year delayed (0.7%/month)
- OAS: +7.2% per year delayed (+10% at age 75)
- Alerts for optimal start ages

### Payroll Milestone Predictor
Predicts when CPP/EI maxes out each year:
- Shows exact month when deductions cease
- Calculates "extra take-home pay" to redirect to TFSA
- Critical for high earners (often hits by Feb/Mar)

### Medical Expense Spousal-Switch
Calculates min(3% income, $2,890) floor and suggests the lower-income spouse claim medical expenses.

### Capital Gains Alert
- First $250,000: 50% inclusion rate
- Over $250,000: 66.67% inclusion rate
- Warns of "Inclusion Jump"

---

## Government Benefits & Credits

### Canada Child Benefit (CCB)
- Optimizes RRSP to reduce AFNI and increase CCB
- Shows CCB boost as "instant return" on RRSP contributions
- July payment increases when RRSP lowers income

### Carbon Rebate (CAIP)
- Province-specific base amounts
- Rural supplement (+20%)
- Income-adjusted (higher for <$65k, lower for >$80k)

### GST/HST Credit
- 25% boost in 2026
- Quarterly payments (Jan, Apr, Jul, Oct)
- Shows gap to threshold and potential unlock amount

### GST New Housing Rebate
- Full 5% rebate on new builds up to $1M
- Partial rebate up to $1.5M
- First-time buyer priority

### RDSP (Disability Savings Plan)
- $1,000 Bond (income < $38,237)
- $3,500 Grant on $1,500 contribution (income < $117,045)
- Level 0 priority in Maple Stack when DTC eligible

### RESP Catch-Up Logic
- CESG: 20% match on first $2,500 ($500/year max)
- Carry-forward: Can catch up 1 previous year
- Shows optimal contribution to maximize grants

### MHRTC (Multigenerational Home Renovation)
- 15% credit on up to $50,000 expenses
- Must be for senior (65+) to qualify

### Charitable Donation Tiering
- First $200: ~15% credit
- Over $200: ~29-33% credit
- Alerts when adding $50 more triggers higher tier

---

## Provincial & Specialized Features

### Quebec Support
- Separate QPP rates (6.4%)
- QPIP considerations
- Unique provincial tax brackets

### Provincial Tax Arbitrage
Calculates tax delta if moving provinces before year-end.

### Alternative Minimum Tax (AMT) Watchdog
Warns when donations + capital gains may trigger AMT at $173,205+.

### Basic Personal Amount (BPA) Clawback
- Gradual reduction starts at $181,440
- Floors at $258,482

---

## Estate & Corporate Planning

### Estate Tax Simulator (Death & Taxes)
Calculates "Deemed Disposition" tax hit:
- Primary Residence: Tax-free
- Secondary Property: 50%/66.67% capital gains
- RRIF/RRSP: 100% taxed as income
- Shows strategies: life insurance, gifting, intergen transfers

### Corporate Compensation Optimizer
Solves Salary vs. Dividends dilemma:
- Salary: Generates 18% RRSP room + CPP benefits
- Dividends: Avoids 11.9% total CPP hit
- Compares grossed-up dividend tax credits

---

## Visualizations

### The Compass Gap Visualizer
25-year wealth projection showing:
- **Line A**: Standard path (5% return, after-tax contributions)
- **Line B**: Compass path (6% + CCB optimization + mortgage savings)
- **Gap**: "The Maple Compass Value Add"

### 2026 Cash Flow Roadmap
Interactive payment calendar showing:
- CCB monthly (20th of each month)
- GST/HST credit (quarterly)
- Carbon rebate (quarterly)
- Tax refund (April - based on RRSP contributions)
- CPP/EI maxed alerts (extra monthly take-home)

### RRSP Refund Simulator
- Shows contribution → refund flow
- Displays estimated refund with progress bar
- Refund timing: ~April after filing

---

## Privacy & Security

- **Zero trackers**: No analytics, no cookies
- **Local storage only**: Data stays in browser
- **AES-GCM encryption**: Optional encrypted localStorage (Web Crypto API)
- **One-click wipe**: Clears all data instantly
- **JSON export/import**: Portable backups
- **PWA-ready**: Manifest configured for offline use

---

## Tech Stack

- **Framework**: Next.js 16 (Static Site Generation)
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand with localStorage persist
- **Visualization**: Recharts
- **APIs**: Bank of Canada Valet API

---

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun build

# Run linting
bun lint

# Type checking
bun typecheck
```

---

## 2026 Tax Constants

| Category | Value |
|----------|-------|
| OAS Clawback Start | $95,323 |
| OAS Full Recovery | $148,179 |
| CPP YMPE | $74,600 (5.95%) |
| CPP2 YAMPE | $85,000 (4.0%) |
| EI Max Insurable | $68,900 (1.63%) |
| RRSP Max Contribution | $33,810 |
| TFSA Limit | $7,000 |
| BPA Federal | $16,452 |
| BPA Reduction Start | $181,440 |
| BPA Floor | $258,482 |
| CCB Base Threshold | $38,237 |
| Capital Gains Threshold | $250,000 |
| AMT Threshold | $173,205 |
| Medical Floor | min(3% income, $2,890) |
| GST Housing Full | $1,000,000 |
| GST Housing Partial | $1,500,000 |
| MHRTC Max Credit | $7,500 |

---

## License

MIT
