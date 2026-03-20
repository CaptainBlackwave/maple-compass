export const TAX_CONSTANTS_2026 = {
  OAS: {
    CLAWBACK_START: 95323,
    FULL_CLAWBACK: 148179,
    RATE: 0.15,
  },
  CPP: {
    YMPE: 74600,
    RATE: 0.0595,
    EXEMPT: 3500,
  },
  CPP2: {
    YAMPE: 85000,
    RATE: 0.04,
  },
  EI: {
    MAX_INSURABLE: 68900,
    RATE: 0.0163,
  },
  CCB: {
    BASE_INCOME_THRESHOLD: 38237,
    CHILD_TIERS: [
      { child: 1, maxBenefit: 7483, reductionRate: 0.07 },
      { child: 2, maxBenefit: 6720, reductionRate: 0.07 },
      { child: 3, maxBenefit: 5956, reductionRate: 0.07 },
      { child: 4, maxBenefit: 5193, reductionRate: 0.07 },
    ],
  },
  CARBON_REBATE: {
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
  },
  GST_CREDIT: {
    THRESHOLD_SINGLES: 533,
    THRESHOLD_FAMILY: 1056,
    BASE_AMOUNT_SINGLES: 319,
    BASE_AMOUNT_FAMILY: 598,
    BOOST_2026: 0.25,
  },
  RDSP: {
    BOND_INCOME_THRESHOLD: 38237,
    GRANT_INCOME_THRESHOLD: 117045,
    BOND_AMOUNT: 1000,
    GRANT_MATCH: 3.5,
    GRANT_TRIGGER: 1500,
    MAX_GRANT: 3500,
    MAX_BOND: 11000,
  },
  RESP: {
    CESG_RATE: 0.20,
    CESG_MAX_ANNUAL: 500,
    CESG_MAX_LIFETIME: 7200,
    MAX_CONTRIBUTION: 50000,
    CHILD_AGE_LIMIT: 17,
    CATCH_UP_YEARS: 1,
  },
  DONATION: {
    FEDERAL_TIER1_RATE: 0.15,
    FEDERAL_TIER2_RATE: 0.29,
    TIER_THRESHOLD: 200,
  },
  BPA: {
    FEDERAL: 16452,
  },
} as const;

export const HIGH_INTEREST_DEBT_THRESHOLD = 0.07;
export const DEFAULT_MORTGAGE_RATE = 0.055;
export const DEFAULT_CONSERVATIVE_RETURN = 0.045;

export type TaxConstants = typeof TAX_CONSTANTS_2026;
