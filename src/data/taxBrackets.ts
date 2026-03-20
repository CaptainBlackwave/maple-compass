export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface ProvincialTaxBracket extends TaxBracket {
  surtax?: {
    threshold: number;
    rate: number;
  };
}

export const federalBrackets: TaxBracket[] = [
  { min: 0, max: 55867, rate: 0.15 },
  { min: 55867, max: 111733, rate: 0.205 },
  { min: 111733, max: 173205, rate: 0.26 },
  { min: 173205, max: 246752, rate: 0.29 },
  { min: 246752, max: Infinity, rate: 0.33 },
];

export const provincialBrackets: Record<string, ProvincialTaxBracket[]> = {
  AB: [
    { min: 0, max: 148269, rate: 0.10 },
    { min: 148269, max: 177922, rate: 0.12 },
    { min: 177922, max: 237230, rate: 0.13 },
    { min: 237230, max: 355845, rate: 0.14 },
    { min: 355845, max: Infinity, rate: 0.15 },
  ],
  BC: [
    { min: 0, max: 47937, rate: 0.0506 },
    { min: 47937, max: 95875, rate: 0.077 },
    { min: 95875, max: 110076, rate: 0.105 },
    { min: 110076, max: 133664, rate: 0.1229 },
    { min: 133664, max: 181232, rate: 0.147 },
    { min: 181232, max: 252752, rate: 0.168 },
    { min: 252752, max: Infinity, rate: 0.205 },
  ],
  MB: [
    { min: 0, max: 47000, rate: 0.108 },
    { min: 47000, max: 100000, rate: 0.1275 },
    { min: 100000, max: Infinity, rate: 0.174 },
  ],
  NB: [
    { min: 0, max: 49234, rate: 0.094 },
    { min: 49234, max: 98469, rate: 0.1482 },
    { min: 98469, max: 185064, rate: 0.1652 },
    { min: 185064, max: Infinity, rate: 0.1784 },
  ],
  NL: [
    { min: 0, max: 43128, rate: 0.0729 },
    { min: 43128, max: 86256, rate: 0.1148 },
    { min: 86256, max: 154244, rate: 0.1535 },
    { min: 154244, max: 215973, rate: 0.1673 },
    { min: 215973, max: Infinity, rate: 0.1948 },
  ],
  NS: [
    { min: 0, max: 29590, rate: 0.0879 },
    { min: 29590, max: 59180, rate: 0.1495 },
    { min: 59180, max: 93000, rate: 0.1667 },
    { min: 93000, max: 150000, rate: 0.175 },
    { min: 150000, max: Infinity, rate: 0.21 },
  ],
  NT: [
    { min: 0, max: 48326, rate: 0.1205 },
    { min: 48326, max: 96655, rate: 0.1405 },
    { min: 96655, max: 157139, rate: 0.1605 },
    { min: 157139, max: Infinity, rate: 0.1905 },
  ],
  NU: [
    { min: 0, max: 51446, rate: 0.11 },
    { min: 51446, max: 102893, rate: 0.12 },
    { min: 102893, max: 167250, rate: 0.13 },
    { min: 167250, max: Infinity, rate: 0.145 },
  ],
  ON: [
    { min: 0, max: 51446, rate: 0.0505 },
    { min: 51446, max: 102894, rate: 0.0915 },
    { min: 102894, max: 150000, rate: 0.1116 },
    { min: 150000, max: 220000, rate: 0.1216 },
    { min: 220000, max: Infinity, rate: 0.1316 },
    {
      min: 0,
      max: Infinity,
      rate: 0,
      surtax: { threshold: 5000, rate: 0.20 },
    },
  ],
  PE: [
    { min: 0, max: 35000, rate: 0.098 },
    { min: 35000, max: 70000, rate: 0.125 },
    { min: 70000, max: 140000, rate: 0.166 },
    { min: 140000, max: Infinity, rate: 0.1875 },
  ],
  QC: [
    { min: 0, max: 51780, rate: 0.14 },
    { min: 51780, max: 103545, rate: 0.19 },
    { min: 103545, max: 126000, rate: 0.24 },
    { min: 126000, max: Infinity, rate: 0.2575 },
  ],
  SK: [
    { min: 0, max: 52057, rate: 0.105 },
    { min: 52057, max: 104117, rate: 0.125 },
    { min: 104117, max: 148734, rate: 0.145 },
    { min: 148734, max: 181232, rate: 0.165 },
    { min: 181232, max: Infinity, rate: 0.185 },
  ],
  YT: [
    { min: 0, max: 55202, rate: 0.064 },
    { min: 55202, max: 110403, rate: 0.108 },
    { min: 110403, max: 181232, rate: 0.129 },
    { min: 181232, max: 250000, rate: 0.15 },
    { min: 250000, max: Infinity, rate: 0.165 },
  ],
};

export function calculateMarginalTaxRate(
  income: number,
  province: string,
  brackets: Record<string, ProvincialTaxBracket[]> = provincialBrackets
): number {
  const federal = calculateFederalTax(income);
  const provincial = calculateProvincialTax(income, province, brackets);
  return federal.rate + provincial.rate;
}

function calculateFederalTax(income: number): { tax: number; rate: number } {
  let tax = 0;
  let remaining = income;
  let marginalRate = 0;

  for (const bracket of federalBrackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    marginalRate = bracket.rate;
    remaining -= taxableInBracket;
  }

  return { tax, rate: marginalRate };
}

function calculateProvincialTax(
  income: number,
  province: string,
  brackets: Record<string, ProvincialTaxBracket[]>
): { tax: number; rate: number } {
  const provinceBrackets = brackets[province];
  if (!provinceBrackets) return { tax: 0, rate: 0 };

  let tax = 0;
  let remaining = income;
  let marginalRate = 0;

  for (const bracket of provinceBrackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    marginalRate = bracket.rate;
    remaining -= taxableInBracket;
  }

  if (province === "ON" && income > 5000) {
    const surtaxThreshold = 5000;
    const surtaxableAmount = Math.max(0, tax - surtaxThreshold);
    tax += surtaxableAmount * 0.2;
  }

  return { tax, rate: marginalRate };
}

export function calculateTaxSavings(
  contribution: number,
  marginalRate: number
): number {
  return contribution * marginalRate;
}
