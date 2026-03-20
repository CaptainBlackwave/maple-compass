# The Maple Compass

A privacy-first, tax-optimized financial roadmap for Canadians.

![Privacy Score: 100/100](https://img.shields.io/badge/Privacy-100%2F100-green)
![Next.js](https://img.shields.io/badge/Next.js-16-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Principles

- **Zero-Knowledge**: No data ever leaves your browser. No database, no cookies, no tracking.
- **Local-First**: All calculations happen on the client side using JavaScript.
- **Action-Oriented**: Instead of "tracking," the app provides "steering"—telling you exactly what to do with your next $100.

## Features

### Economic Pulse Dashboard
Automatically fetches the current Canadian economic climate from the Bank of Canada Valet API:
- Prime Rate (for debt comparison)
- CPI/Inflation (for "real" return targets)
- CAD/USD exchange rate

### Privacy-First Profiler
Input your financial details—all stored locally in your browser:
- Gross Income, Province, Age
- Total High-Interest Debt & Interest Rate
- Emergency Fund Status
- FHSA/TFSA/RRSP contribution room
- Home Ownership Status & Mortgage Details
- Employer Match Status
- Number of Children (for CCB calculation)

### The Maple Stack
A logic-based list of financial moves sorted by mathematical efficiency:

| Level | Priority | Description |
|-------|----------|-------------|
| 1 | Employer Match | 100% instant ROI (free money) |
| 2 | Safety Net | Emergency fund of 3+ months |
| 3 | High-Interest Fire | Debt interest > 7% |
| 4 | FHSA/Tax Alpha | RRSP/FHSA with CCB optimization |
| 5 | Mortgage Accelerator / Wealth Builder |

### Smart Analysis

- **RRSP vs TFSA Engine**: Compares your current marginal tax rate vs. expected retirement tax rate
- **FHSA Priority**: Automatically prioritizes FHSA for first-time homebuyers/renters
- **Mortgage vs Market**: Compares your mortgage rate against GIC returns
- **OAS Clawback Warning**: Warns when income approaches the $81,761 threshold
- **Carbon Rebate Estimator**: Calculates estimated Climate Action Incentive Payment (CAIP)

### Quebec Support
Handles Quebec's unique tax system:
- Separate QPP contribution rates
- QPIP (Quebec Parental Insurance Plan) considerations
- Different provincial tax brackets

### Data Management
- **Export**: Download your data as encrypted JSON
- **Import**: Restore your data from a previous export
- **Wipe**: One-click to delete all local data

## Tech Stack

- **Framework**: Next.js 16 (Static Site Generation)
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand with localStorage persist
- **APIs**: Bank of Canada Valet API

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

## Privacy

This app is designed with privacy as the top priority:
- Zero network requests to trackers
- All data stored in localStorage only
- One-click "Wipe All Data" button
- No cookies, no accounts, no login
- JSON export/import for data portability

## Tax Data

Uses 2026 CRA Federal and Provincial tax brackets for all 13 provinces and territories.

## License

MIT
