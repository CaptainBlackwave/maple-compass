import { TAX_CONSTANTS_2026 } from "@/data/taxConstants";
import { calculateMarginalTaxRate } from "@/data/taxBrackets";
import type { Province } from "@/store/financialStore";

export interface OptimizationResult {
  rdspOpportunity: {
    eligible: boolean;
    bondEligible: boolean;
    grantEligible: boolean;
    bondAmount: number;
    grantAmount: number;
    action: string;
    instantReturn: number;
  } | null;
  respOpportunity: {
    catchUpYears: number;
    maxCatchUpContribution: number;
    grantAmount: number;
    action: string;
  } | null;
  gstOpportunity: {
    currentCredit: number;
    unlockedCredit: number;
    thresholdGap: number;
    action: string;
  } | null;
  donationOpportunity: {
    currentCredit: number;
    extraToThreshold: number;
    additionalCredit: number;
    action: string;
  } | null;
  provincialArbitrage: {
    fromProvince: Province;
    toProvince: Province;
    taxSavings: number;
    action: string;
  } | null;
  hbpVsNewContribution: {
    hbpPayment: number;
    fhsaDeduction: number;
    recommendation: "hpb" | "fhsa" | "either";
    savings: number;
  } | null;
  survivalMode: {
    federalTaxFree: number;
    provincialTaxFree: number;
    totalTaxFree: number;
  };
}

export function calculateRDSPOpportunity(
  hasDTC: boolean,
  income2024: number,
  rdspContributions: number
): OptimizationResult["rdspOpportunity"] {
  if (!hasDTC) return null;

  const { RDSP } = TAX_CONSTANTS_2026;
  const bondEligible = income2024 <= RDSP.BOND_INCOME_THRESHOLD;
  const grantEligible = income2024 <= RDSP.GRANT_INCOME_THRESHOLD;

  let bondAmount = 0;
  let grantAmount = 0;

  if (bondEligible && rdspContributions === 0) {
    bondAmount = RDSP.BOND_AMOUNT;
  }

  if (grantEligible && rdspContributions >= RDSP.GRANT_TRIGGER) {
    grantAmount = Math.min(
      rdspContributions * RDSP.GRANT_MATCH,
      RDSP.MAX_GRANT
    );
  }

  if (!bondEligible && !grantEligible) {
    return {
      eligible: true,
      bondEligible: false,
      grantEligible: false,
      bondAmount: 0,
      grantAmount: 0,
      action: "RDSP contributions are not matched, but grows tax-free",
      instantReturn: 0,
    };
  }

  return {
    eligible: true,
    bondEligible,
    grantEligible,
    bondAmount,
    grantAmount,
    action: bondEligible
      ? `Contribute $1,500 to get $1,000 bond + $3,500 grant`
      : grantEligible
      ? `Contribute $1,500 to get $3,500 grant`
      : "Maximize RDSP for tax-free growth",
    instantReturn: bondAmount + grantAmount,
  };
}

export function calculateRESPOpportunity(
  childAge: number,
  currentBalance: number,
  annualContribution: number
): OptimizationResult["respOpportunity"] {
  if (childAge === 0 || childAge > TAX_CONSTANTS_2026.RESP.CHILD_AGE_LIMIT) {
    return null;
  }

  const { RESP } = TAX_CONSTANTS_2026;
  const yearsLeft = RESP.CHILD_AGE_LIMIT - childAge + 1;
  const maxLifetime = RESP.CESG_MAX_LIFETIME;
  
  const estimatedContributions = annualContribution * yearsLeft;
  const estimatedGrant = Math.min(
    estimatedContributions * RESP.CESG_RATE,
    maxLifetime - currentBalance
  );

  if (currentBalance >= maxLifetime) {
    return {
      catchUpYears: 0,
      maxCatchUpContribution: 0,
      grantAmount: 0,
      action: "RESP is fully maxed",
    };
  }

  const canCarryForward = yearsLeft >= RESP.CATCH_UP_YEARS;
  const maxCatchUp = canCarryForward ? RESP.MAX_CONTRIBUTION * RESP.CATCH_UP_YEARS : 0;
  
  const currentYearGrant = Math.min(
    annualContribution * RESP.CESG_RATE,
    RESP.CESG_MAX_ANNUAL
  );

  const catchUpGrant = annualContribution >= 2500 
    ? RESP.CESG_MAX_ANNUAL 
    : annualContribution * RESP.CESG_RATE;

  return {
    catchUpYears: canCarryForward ? RESP.CATCH_UP_YEARS : 0,
    maxCatchUpContribution: maxCatchUp,
    grantAmount: catchUpGrant,
    action: currentYearGrant < RESP.CESG_MAX_ANNUAL
      ? `Add $${2500 - annualContribution} more to get full $500 grant`
      : `You're getting the max $${catchUpGrant} grant this year`,
  };
}

export function calculateGSTOpportunity(
  income: number,
  isSingle: boolean,
  rrspContribution: number
): OptimizationResult["gstOpportunity"] {
  const { GST_CREDIT } = TAX_CONSTANTS_2026;
  
  const threshold = isSingle 
    ? GST_CREDIT.THRESHOLD_SINGLES 
    : GST_CREDIT.THRESHOLD_FAMILY;
  
  const baseAmount = isSingle 
    ? GST_CREDIT.BASE_AMOUNT_SINGLES 
    : GST_CREDIT.BASE_AMOUNT_FAMILY;
  
  const boostedAmount = baseAmount * (1 + GST_CREDIT.BOOST_2026);
  
  const netIncome = Math.max(0, income - rrspContribution);
  const thresholdGap = Math.max(0, threshold - netIncome);
  
  if (thresholdGap <= 0) {
    return {
      currentCredit: 0,
      unlockedCredit: 0,
      thresholdGap: 0,
      action: "Income above GST credit threshold",
    };
  }

  const currentCredit = netIncome < threshold ? boostedAmount : 0;
  const unlockedCredit = netIncome < threshold ? 0 : boostedAmount;
  
  return {
    currentCredit,
    unlockedCredit,
    thresholdGap,
    action: thresholdGap > 0
      ? `RRSP of $${thresholdGap} could unlock $${boostedAmount.toFixed(0)} GST credit`
      : "Already receiving GST credit",
  };
}

export function calculateDonationOpportunity(
  donations: number,
  province: Province
): OptimizationResult["donationOpportunity"] {
  const { DONATION } = TAX_CONSTANTS_2026;
  
  if (donations === 0) {
    return null;
  }

  const marginalRate = calculateMarginalTaxRate(donations, province);
  
  const tier1Donation = Math.min(donations, DONATION.TIER_THRESHOLD);
  const tier2Donation = Math.max(0, donations - DONATION.TIER_THRESHOLD);
  
  const federalCredit = 
    tier1Donation * DONATION.FEDERAL_TIER1_RATE +
    tier2Donation * DONATION.FEDERAL_TIER2_RATE;
  
  const provincialCredit = tier2Donation * marginalRate;
  const totalCredit = federalCredit + provincialCredit;

  const extraToThreshold = donations < DONATION.TIER_THRESHOLD 
    ? DONATION.TIER_THRESHOLD - donations 
    : 0;

  let additionalCredit = 0;
  if (extraToThreshold > 0) {
    const additionalDonation = extraToThreshold;
    const addlFederal = additionalDonation * (DONATION.FEDERAL_TIER2_RATE - DONATION.FEDERAL_TIER1_RATE);
    const addlProvincial = additionalDonation * marginalRate;
    additionalCredit = addlFederal + addlProvincial;
  }

  return {
    currentCredit: totalCredit,
    extraToThreshold,
    additionalCredit,
    action: extraToThreshold > 0
      ? `Add $${extraToThreshold} to get $${additionalCredit.toFixed(0)} more tax credit`
      : "You're in the optimal donation tier",
  };
}

export function calculateProvincialArbitrage(
  fromProvince: Province,
  toProvince: Province,
  income: number
): OptimizationResult["provincialArbitrage"] {
  if (fromProvince === toProvince) return null;

  const marginalRateFrom = calculateMarginalTaxRate(income, fromProvince);
  const marginalRateTo = calculateMarginalTaxRate(income, toProvince);
  
  const taxSavings = (marginalRateFrom - marginalRateTo) * income;

  if (taxSavings <= 0) {
    return {
      fromProvince,
      toProvince,
      taxSavings: 0,
      action: `Moving to ${toProvince} won't save provincial tax at your income level`,
    };
  }

  return {
    fromProvince,
    toProvince,
    taxSavings,
    action: `Moving to ${toProvince} before Dec 31 saves ~$${Math.round(taxSavings).toLocaleString()} in provincial tax`,
  };
}

export function calculateHBPvsFHSA(
  hbpBalance: number,
  marginalRate: number,
  fhsaRoom: number,
  rrspRoom: number
): OptimizationResult["hbpVsNewContribution"] {
  if (hbpBalance <= 0) return null;

  const minHBPpayment = hbpBalance / 10;
  const taxSavingsHBP = minHBPpayment * marginalRate;
  
  const maxFHSA = Math.min(fhsaRoom, 40000);
  const taxSavingsFHSA = maxFHSA * marginalRate;

  if (taxSavingsFHSA > taxSavingsHBP) {
    return {
      hbpPayment: minHBPpayment,
      fhsaDeduction: maxFHSA,
      recommendation: "fhsa",
      savings: taxSavingsFHSA - taxSavingsHBP,
    };
  }

  return {
    hbpPayment: minHBPpayment,
    fhsaDeduction: maxFHSA,
    recommendation: "hpb",
    savings: taxSavingsHBP - taxSavingsFHSA,
  };
}

export function calculateSurvivalMode(income: number, province: Province): OptimizationResult["survivalMode"] {
  const { BPA } = TAX_CONSTANTS_2026;
  
  const federalTaxFree = BPA.FEDERAL;
  const provincialTaxFree = calculateProvincialTaxFree(income, province);
  const totalTaxFree = federalTaxFree + provincialTaxFree;
  
  return {
    federalTaxFree,
    provincialTaxFree,
    totalTaxFree,
  };
}

function calculateProvincialTaxFree(income: number, province: Province): number {
  const provincialCredits: Record<Province, number> = {
    AB: 21885,
    BC: 12580,
    MB: 15780,
    NB: 11985,
    NL: 11106,
    NS: 11481,
    NT: 17944,
    NU: 17569,
    ON: 12399,
    PE: 14000,
    QC: 18056,
    SK: 20785,
    YT: 15000,
  };
  
  return provincialCredits[province] || 10000;
}

export function runFullOptimization(profile: {
  hasDTC: boolean;
  income2024: number;
  rdspContributions: number;
  childAge: number;
  respBalance: number;
  annualRESPContribution: number;
  isSingle: boolean;
  grossIncome: number;
  rrspContributions: number;
  donations: number;
  province: Province;
  hbpBalance: number;
  fhsaRoom: number;
  rrspRoom: number;
  movingToProvince?: Province;
}): OptimizationResult {
  return {
    rdspOpportunity: calculateRDSPOpportunity(
      profile.hasDTC,
      profile.income2024,
      profile.rdspContributions
    ),
    respOpportunity: calculateRESPOpportunity(
      profile.childAge,
      profile.respBalance,
      profile.annualRESPContribution
    ),
    gstOpportunity: calculateGSTOpportunity(
      profile.grossIncome,
      profile.isSingle,
      profile.rrspContributions
    ),
    donationOpportunity: calculateDonationOpportunity(
      profile.donations,
      profile.province
    ),
    provincialArbitrage: profile.movingToProvince
      ? calculateProvincialArbitrage(
          profile.province,
          profile.movingToProvince,
          profile.grossIncome
        )
      : null,
    hbpVsNewContribution: calculateHBPvsFHSA(
      profile.hbpBalance,
      calculateMarginalTaxRate(profile.grossIncome, profile.province),
      profile.fhsaRoom,
      profile.rrspRoom
    ),
    survivalMode: calculateSurvivalMode(profile.grossIncome, profile.province),
  };
}
