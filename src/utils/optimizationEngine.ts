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

export interface MedicalClaimResult {
  optimalClaimant: "self" | "spouse" | "both";
  selfCredit: number;
  spouseCredit: number;
  action: string;
}

export function calculateMedicalExpenseClaim(
  medicalExpenses: number,
  selfIncome: number,
  spouseIncome: number,
  province: Province
): MedicalClaimResult {
  const { MEDICAL } = TAX_CONSTANTS_2026;
  
  const selfFloor = Math.min(selfIncome * MEDICAL.FLOOR_RATE, MEDICAL.MAX_FLOOR);
  const spouseFloor = Math.min(spouseIncome * MEDICAL.FLOOR_RATE, MEDICAL.MAX_FLOOR);
  
  const selfClaimable = Math.max(0, medicalExpenses - selfFloor);
  const spouseClaimable = Math.max(0, medicalExpenses - spouseFloor);
  
  const selfRate = calculateMarginalTaxRate(selfIncome, province);
  const spouseRate = calculateMarginalTaxRate(spouseIncome, province);
  
  const selfCredit = selfClaimable * selfRate;
  const spouseCredit = spouseClaimable * spouseRate;
  
  if (selfIncome === spouseIncome || medicalExpenses <= Math.min(selfFloor, spouseFloor)) {
    return {
      optimalClaimant: "both",
      selfCredit,
      spouseCredit,
      action: "Claim on both if expenses exceed both floors",
    };
  }
  
  if (selfClaimable > 0 && spouseClaimable === 0) {
    return {
      optimalClaimant: "self",
      selfCredit,
      spouseCredit: 0,
      action: "You have the lower floor - claim all medical expenses",
    };
  }
  
  if (spouseClaimable > 0 && selfClaimable === 0) {
    return {
      optimalClaimant: "spouse",
      selfCredit: 0,
      spouseCredit,
      action: "Spouse has the lower floor - transfer claim to spouse",
    };
  }
  
  if (selfCredit > spouseCredit) {
    return {
      optimalClaimant: "self",
      selfCredit,
      spouseCredit: 0,
      action: `You get $${Math.round(selfCredit).toLocaleString()} more credit - claim on your return`,
    };
  }
  
  return {
    optimalClaimant: "spouse",
    selfCredit: 0,
    spouseCredit,
    action: `Spouse gets $${Math.round(spouseCredit).toLocaleString()} more credit - claim on spouse's return`,
  };
}

export interface CPPOASResult {
  cppAt60: number;
  cppAt65: number;
  cppAt70: number;
  oasAt65: number;
  oasAt70: number;
  oasAt75: number;
  guaranteedReturnCPP: number;
  guaranteedReturnOAS: number;
  recommendation: string;
}

export function calculateCPPOASDeferral(
  currentCPP: number,
  age: number,
  oasEligible: boolean
): CPPOASResult {
  const { CPP, OAS } = TAX_CONSTANTS_2026;
  
  const cppMonthlyIncrease = CPP.MONTHLY_INCREASE;
  const oasMonthlyIncrease = 0.006;
  
  const cppAt60 = currentCPP;
  const cppAt65 = currentCPP * (1 + cppMonthlyIncrease * 12 * 5);
  const cppAt70 = currentCPP * (1 + cppMonthlyIncrease * 12 * 10);
  
  const oasBase = OAS.MAX_MONTHLY * 12;
  const oasAt65 = oasEligible ? oasBase : 0;
  const oasAt70 = oasBase * (1 + oasMonthlyIncrease * 12 * 5);
  const oasAt75 = oasAt70 * (1 + OAS.AGE_UP_75);
  
  const cppIncrease65to70 = ((cppAt70 - cppAt65) / cppAt65) * 100;
  const oasIncrease65to70 = ((oasAt70 - oasAt65) / oasAt65) * 100;
  
  let recommendation = "";
  if (age < 60) {
    recommendation = `Wait until 70 for ${cppIncrease65to70.toFixed(0)}% higher CPP (risk-free)`;
  } else if (age < 65) {
    recommendation = `Consider waiting - each year delays adds ${(cppMonthlyIncrease * 100 * 12).toFixed(1)}% to your CPP`;
  } else if (age < 70) {
    recommendation = `OAS deferral to 70 gives ${oasIncrease65to70.toFixed(0)}% more + 10% if 75+`;
  } else {
    recommendation = "You're at maximum CPP/OAS - consider legacy planning";
  }
  
  return {
    cppAt60,
    cppAt65,
    cppAt70,
    oasAt65,
    oasAt70,
    oasAt75,
    guaranteedReturnCPP: cppMonthlyIncrease * 100 * 12,
    guaranteedReturnOAS: oasMonthlyIncrease * 100 * 12,
    recommendation,
  };
}

export interface CapitalGainsResult {
  inclusionRate: number;
  taxableGain: number;
  estimatedTax: number;
  warning: string | null;
}

export function calculateCapitalGainsTax(
  capitalGain: number,
  income: number,
  province: Province
): CapitalGainsResult {
  const { CAPITAL_GAINS } = TAX_CONSTANTS_2026;
  
  let inclusionRate = Number(TAX_CONSTANTS_2026.CAPITAL_GAINS.INCLUSION_RATE_1);
  let warning: string | null = null;
  
  if (capitalGain > CAPITAL_GAINS.THRESHOLD) {
    inclusionRate = Number(TAX_CONSTANTS_2026.CAPITAL_GAINS.INCLUSION_RATE_2);
    warning = `Warning: ${((Number(CAPITAL_GAINS.INCLUSION_RATE_2) - Number(CAPITAL_GAINS.INCLUSION_RATE_1)) * 100).toFixed(0)}% inclusion rate triggers on gains over $${(CAPITAL_GAINS.THRESHOLD / 1000).toFixed(0)}k`;
  }
  
  const taxableGain = capitalGain * inclusionRate;
  const marginalRate = calculateMarginalTaxRate(income + taxableGain, province);
  const estimatedTax = taxableGain * marginalRate;
  
  if (capitalGain > CAPITAL_GAINS.THRESHOLD * 2 && income > 173205) {
    warning = (warning || "") + " - AMT may apply";
  }
  
  return {
    inclusionRate,
    taxableGain,
    estimatedTax,
    warning,
  };
}

export interface GSTHousingRebateResult {
  eligible: boolean;
  rebate: number;
  action: string;
}

export function calculateGSTHousingRebate(
  isFirstTimeBuyer: boolean,
  homePrice: number,
  isNewConstruction: boolean
): GSTHousingRebateResult {
  const { GST_HOUSING } = TAX_CONSTANTS_2026;
  
  if (!isFirstTimeBuyer || !isNewConstruction) {
    return {
      eligible: false,
      rebate: 0,
      action: "GST housing rebate requires first-time buyer + new construction",
    };
  }
  
  let rebate = 0;
  if (homePrice <= GST_HOUSING.FULL_REBATE_MAX) {
    rebate = homePrice * GST_HOUSING.RATE;
  } else if (homePrice <= GST_HOUSING.PARTIAL_REBATE_MAX) {
    const maxRebate = GST_HOUSING.FULL_REBATE_MAX * GST_HOUSING.RATE;
    const phaseOut = (homePrice - GST_HOUSING.FULL_REBATE_MAX) / (GST_HOUSING.PARTIAL_REBATE_MAX - GST_HOUSING.FULL_REBATE_MAX);
    rebate = maxRebate * (1 - phaseOut);
  }
  
  return {
    eligible: true,
    rebate: Math.round(rebate),
    action: `Potential $${Math.round(rebate).toLocaleString()} GST rebate on new construction`,
  };
}

export interface AMTResult {
  isAMT: boolean;
  amtTax: number;
  regularTax: number;
  additionalTax: number;
  warning: string | null;
}

export function calculateAMT(
  income: number,
  capitalGains: number,
  donations: number,
  provincialCredits: number
): AMTResult {
  const { AMT, CAPITAL_GAINS } = TAX_CONSTANTS_2026;
  
  const taxableGains = capitalGains * CAPITAL_GAINS.INCLUSION_RATE_1;
  const amtIncome = income + taxableGains + donations * 0.3;
  
  const isAMT = amtIncome > AMT.THRESHOLD;
  
  const amtTax = amtIncome > AMT.THRESHOLD ? (amtIncome - AMT.THRESHOLD) * AMT.RATE : 0;
  const regularTax = income * calculateMarginalTaxRate(income, "ON") * 0.3;
  
  const additionalTax = Math.max(0, amtTax - regularTax - provincialCredits);
  
  let warning: string | null = null;
  if (isAMT && additionalTax > 0) {
    warning = `AMT applies: $${Math.round(additionalTax).toLocaleString()} extra tax due to high donations + capital gains`;
  }
  
  return {
    isAMT,
    amtTax,
    regularTax,
    additionalTax,
    warning,
  };
}

export interface MHRTCResult {
  eligible: boolean;
  credit: number;
  action: string;
}

export function calculateMHRTC(
  renovationExpenses: number,
  isForSenior: boolean,
  seniorAge: number
): MHRTCResult {
  const { MHRTC } = TAX_CONSTANTS_2026;
  
  if (!isForSenior || seniorAge < MHRTC.SENIOR_AGE) {
    return {
      eligible: false,
      credit: 0,
      action: "MHRTC requires renovations for a senior (65+) to qualify",
    };
  }
  
  const eligibleExpenses = Math.min(renovationExpenses, MHRTC.MAX_EXPENSE);
  const credit = eligibleExpenses * MHRTC.RATE;
  
  return {
    eligible: true,
    credit: Math.round(credit),
    action: `15% credit on $${eligibleExpenses.toLocaleString()} = $${Math.round(credit).toLocaleString()} back`,
  };
}

export function calculateBPAClawback(income: number): { bpa: number; clawback: number } {
  const { BPA } = TAX_CONSTANTS_2026;
  
  if (income <= BPA.REDUCTION_START) {
    return { bpa: BPA.FEDERAL, clawback: 0 };
  }
  
  if (income >= BPA.REDUCTION_FLOOR) {
    const minBPA = BPA.FEDERAL * (1 - BPA.MAX_REDUCTION);
    return { bpa: minBPA, clawback: BPA.FEDERAL - minBPA };
  }
  
  const progress = (income - BPA.REDUCTION_START) / (BPA.REDUCTION_FLOOR - BPA.REDUCTION_START);
  const reduction = progress * BPA.MAX_REDUCTION;
  const bpa = BPA.FEDERAL * (1 - reduction);
  
  return {
    bpa: Math.round(bpa),
    clawback: Math.round(BPA.FEDERAL - bpa),
  };
}

export interface EstateTaxResult {
  primaryResidenceTax: number;
  secondaryPropertyTax: number;
  rrifTax: number;
  totalEstateTax: number;
  strategies: string[];
}

export function calculateEstateTax(
  primaryResidenceValue: number,
  secondaryPropertyValue: number,
  rrifBalance: number,
  province: Province
): EstateTaxResult {
  const { CAPITAL_GAINS } = TAX_CONSTANTS_2026;
  
  const primaryResidenceTax = 0;
  
  const secondaryPropertyGain = secondaryPropertyValue * 0.5;
  let secondaryPropertyTax = 0;
  if (secondaryPropertyGain > 0) {
    let taxableGain = secondaryPropertyGain;
    if (secondaryPropertyGain > CAPITAL_GAINS.THRESHOLD) {
      const highRateGain = secondaryPropertyGain - CAPITAL_GAINS.THRESHOLD;
      const lowRateGain = CAPITAL_GAINS.THRESHOLD;
      taxableGain = lowRateGain * CAPITAL_GAINS.INCLUSION_RATE_1 + highRateGain * CAPITAL_GAINS.INCLUSION_RATE_2;
    } else {
      taxableGain = secondaryPropertyGain * CAPITAL_GAINS.INCLUSION_RATE_1;
    }
    const marginalRate = calculateMarginalTaxRate(rrifBalance + taxableGain + 50000, province);
    secondaryPropertyTax = taxableGain * marginalRate;
  }
  
  const marginalRate = calculateMarginalTaxRate(rrifBalance, province);
  const rrifTax = rrifBalance * marginalRate;
  
  const totalEstateTax = primaryResidenceTax + secondaryPropertyTax + rrifTax;
  
  const strategies: string[] = [];
  if (rrifBalance > 100000) {
    strategies.push("Consider life insurance to cover RRIF tax liability");
  }
  if (secondaryPropertyValue > 0) {
    strategies.push("Consider gifting property to children before death (subject to rules)");
  }
  if (totalEstateTax > 500000) {
    strategies.push("Explore Intergenerational Business Transfer rules");
  }
  strategies.push("Utilize TFSAs for tax-free legacy");
  
  return {
    primaryResidenceTax,
    secondaryPropertyTax: Math.round(secondaryPropertyTax),
    rrifTax: Math.round(rrifTax),
    totalEstateTax: Math.round(totalEstateTax),
    strategies,
  };
}

export interface CorpCompensationResult {
  salaryBenefit: number;
  dividendBenefit: number;
  rrspRoomGenerated: number;
  cppBenefit: number;
  recommendation: string;
  salaryAmount: number;
  dividendAmount: number;
}

export function calculateCorpCompensation(
  corpIncome: number,
  desiredTakeHome: number,
  province: Province,
  isSmallBusiness: boolean = true
): CorpCompensationResult {
  const { CPP, DIVIDENDS } = TAX_CONSTANTS_2026;
  
  const maxSalary = Math.min(corpIncome, CPP.YMPE);
  const rrspRoomGenerated = maxSalary * 0.18;
  
  const salaryTax = calculateMarginalTaxRate(maxSalary, province) * maxSalary;
  const cppEmployee = Math.min(maxSalary - CPP.EXEMPT, CPP.YMPE) * CPP.RATE;
  const cppEmployer = Math.min(maxSalary - CPP.EXEMPT, CPP.YMPE) * CPP.RATE;
  const eiEmployee = Math.min(maxSalary, 68900) * 0.0163;
  
  const salaryNet = maxSalary - salaryTax - cppEmployee - eiEmployee;
  const cppBenefit = cppEmployee + cppEmployer;
  
  const grossupRate = isSmallBusiness ? DIVIDENDS.NON_ELIGIBLE_GROSSUP : DIVIDENDS.ELIGIBLE_GROSSUP;
  const creditRate = DIVIDENDS.FEDERAL_CREDIT_RATE + (province === "ON" ? DIVIDENDS.ON_PROVINCIAL_RATE : DIVIDENDS.BC_PROVINCIAL_RATE);
  
  const dividendGrossed = desiredTakeHome * grossupRate;
  const dividendTax = dividendGrossed * (calculateMarginalTaxRate(dividendGrossed, province) - creditRate);
  const dividendNet = dividendGrossed - Math.max(0, dividendTax);
  
  const salaryBenefit = rrspRoomGenerated * 0.30;
  const dividendBenefit = 0;
  
  let recommendation = "";
  if (rrspRoomGenerated * 0.30 > dividendBenefit + cppBenefit * 0.5) {
    recommendation = `Salary is more efficient: $${Math.round(rrspRoomGenerated).toLocaleString()} RRSP room + $${Math.round(cppBenefit).toLocaleString()} CPP value`;
  } else {
    recommendation = "Dividends may be preferred for cash flow if RRSP room is not needed";
  }
  
  return {
    salaryBenefit: Math.round(salaryBenefit),
    dividendBenefit: Math.round(dividendBenefit),
    rrspRoomGenerated: Math.round(rrspRoomGenerated),
    cppBenefit: Math.round(cppBenefit),
    recommendation,
    salaryAmount: Math.round(maxSalary),
    dividendAmount: Math.round(dividendGrossed),
  };
}

export interface YearlyProjection {
  year: number;
  standardWealth: number;
  optimizedWealth: number;
}

export interface CompassGapResult {
  projections: YearlyProjection[];
  finalGap: number;
  standardTotal: number;
  optimizedTotal: number;
}

export function calculateCompassGap(
  currentAge: number,
  currentSavings: number,
  annualContribution: number,
  marginalTaxRate: number,
  hasCCB: boolean,
  ccbValue: number,
  hasMortgage: boolean,
  mortgageRate: number,
  mortgageBalance: number,
  years: number = 25
): CompassGapResult {
  const standardReturn = 0.05;
  const optimizedReturn = 0.06;
  
  let standardWealth = currentSavings;
  let optimizedWealth = currentSavings;
  
  const projections: YearlyProjection[] = [];
  
  for (let year = 0; year <= years; year++) {
    projections.push({
      year: currentAge + year,
      standardWealth: Math.round(standardWealth),
      optimizedWealth: Math.round(optimizedWealth),
    });
    
    const standardContribution = annualContribution * (1 - marginalTaxRate);
    const optimizedContribution = annualContribution;
    
    standardWealth = standardWealth * (1 + standardReturn) + standardContribution;
    
    let optimizedGrowth = optimizedWealth * (1 + optimizedReturn);
    let optimizedContributionAdjusted = optimizedContribution;
    
    if (hasCCB && year < 18) {
      optimizedGrowth += ccbValue * 0.5;
    }
    
    if (hasMortgage && mortgageBalance > 0) {
      const interestSaved = mortgageBalance * mortgageRate * 0.3;
      optimizedGrowth += interestSaved;
    }
    
    optimizedWealth = optimizedGrowth + optimizedContributionAdjusted;
  }
  
  const finalGap = optimizedWealth - standardWealth;
  
  return {
    projections,
    finalGap: Math.round(finalGap),
    standardTotal: Math.round(standardWealth),
    optimizedTotal: Math.round(optimizedWealth),
  };
}
