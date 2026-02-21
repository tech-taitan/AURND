/**
 * R&D Tax Offset Calculator
 *
 * Calculates the R&D Tax Incentive offset based on:
 * - Entity's aggregated turnover (determines refundable vs non-refundable)
 * - Total notional R&D deductions
 * - Company tax rate
 *
 * Rates as of FY 2024-25:
 * - Refundable offset (turnover < $20M): Company tax rate + 18.5%
 * - Non-refundable offset (turnover >= $20M):
 *   - Base: Company tax rate + 8.5% (for expenditure up to 2% intensity)
 *   - Premium: Company tax rate + 16.5% (for expenditure above 2% intensity)
 */

export interface TaxOffsetInput {
  notionalDeductions: number
  aggregatedTurnover: number
  totalExpenditure: number // Total expenditure for R&D intensity calculation
  companyTaxRate?: number // Default: 25% for base rate entities, 30% otherwise
  isBaseTaxRateEntity?: boolean // Turnover < $50M
}

export interface TaxOffsetResult {
  offsetType: "REFUNDABLE" | "NON_REFUNDABLE"
  totalOffset: number
  effectiveRate: number
  breakdown: {
    baseAmount: number
    premiumAmount?: number
    rdIntensity?: number
  }
  companyTaxRate: number
}

// Constants for FY 2024-25
const REFUNDABLE_PREMIUM = 0.185 // 18.5% above company tax rate
const NON_REFUNDABLE_BASE_PREMIUM = 0.085 // 8.5% above company tax rate
const NON_REFUNDABLE_HIGH_PREMIUM = 0.165 // 16.5% above company tax rate
const INTENSITY_THRESHOLD = 0.02 // 2% R&D intensity threshold
const TURNOVER_THRESHOLD = 20_000_000 // $20M threshold for refundable offset
const BASE_RATE_TURNOVER_THRESHOLD = 50_000_000 // $50M for base tax rate entity
const BASE_TAX_RATE = 0.25 // 25% for base rate entities
const STANDARD_TAX_RATE = 0.30 // 30% for other entities

export function calculateTaxOffset(input: TaxOffsetInput): TaxOffsetResult {
  const {
    notionalDeductions,
    aggregatedTurnover,
    totalExpenditure,
    companyTaxRate: providedTaxRate,
    isBaseTaxRateEntity,
  } = input

  // Determine company tax rate
  const companyTaxRate =
    providedTaxRate ??
    (isBaseTaxRateEntity ?? aggregatedTurnover < BASE_RATE_TURNOVER_THRESHOLD
      ? BASE_TAX_RATE
      : STANDARD_TAX_RATE)

  // Determine offset type based on aggregated turnover
  const isRefundable = aggregatedTurnover < TURNOVER_THRESHOLD

  if (isRefundable) {
    // Refundable offset calculation
    const effectiveRate = companyTaxRate + REFUNDABLE_PREMIUM
    const totalOffset = notionalDeductions * effectiveRate

    return {
      offsetType: "REFUNDABLE",
      totalOffset,
      effectiveRate,
      breakdown: {
        baseAmount: totalOffset,
      },
      companyTaxRate,
    }
  }

  // Non-refundable offset calculation (two-tier system)
  // R&D intensity = notional deductions / total expenditure
  const rdIntensity = totalExpenditure > 0
    ? notionalDeductions / totalExpenditure
    : 0

  if (rdIntensity <= INTENSITY_THRESHOLD) {
    // All at base rate (8.5% premium)
    const effectiveRate = companyTaxRate + NON_REFUNDABLE_BASE_PREMIUM
    const totalOffset = notionalDeductions * effectiveRate

    return {
      offsetType: "NON_REFUNDABLE",
      totalOffset,
      effectiveRate,
      breakdown: {
        baseAmount: totalOffset,
        rdIntensity,
      },
      companyTaxRate,
    }
  }

  // Two-tier calculation
  // Amount at 2% intensity threshold
  const baseThresholdAmount = totalExpenditure * INTENSITY_THRESHOLD
  const premiumAmount = notionalDeductions - baseThresholdAmount

  const baseOffset = baseThresholdAmount * (companyTaxRate + NON_REFUNDABLE_BASE_PREMIUM)
  const premiumOffset = premiumAmount * (companyTaxRate + NON_REFUNDABLE_HIGH_PREMIUM)
  const totalOffset = baseOffset + premiumOffset

  // Calculate blended effective rate
  const effectiveRate = totalOffset / notionalDeductions

  return {
    offsetType: "NON_REFUNDABLE",
    totalOffset,
    effectiveRate,
    breakdown: {
      baseAmount: baseOffset,
      premiumAmount: premiumOffset,
      rdIntensity,
    },
    companyTaxRate,
  }
}

/**
 * Calculate the minimum notional deduction required to be eligible for the offset
 * (excludes RSP and CRC contributions which have no minimum)
 */
export function meetsMinimumThreshold(
  notionalDeductions: number,
  rspAmount: number = 0,
  crcAmount: number = 0
): { eligible: boolean; message: string } {
  const MINIMUM_THRESHOLD = 20_000

  // If only RSP or CRC expenditure, no minimum applies
  if (notionalDeductions <= rspAmount + crcAmount) {
    return {
      eligible: true,
      message: "Eligible (RSP/CRC expenditure only - no minimum threshold applies)",
    }
  }

  // Check if non-RSP/CRC expenditure meets threshold
  const nonRspCrcAmount = notionalDeductions - rspAmount - crcAmount
  if (nonRspCrcAmount >= MINIMUM_THRESHOLD) {
    return {
      eligible: true,
      message: `Eligible (notional deductions of ${formatCurrency(notionalDeductions)} meet the $20,000 threshold)`,
    }
  }

  return {
    eligible: false,
    message: `Not eligible - non-RSP/CRC expenditure of ${formatCurrency(nonRspCrcAmount)} is below the $20,000 minimum threshold`,
  }
}

/**
 * Calculate registration deadline (10 months after income year end)
 */
export function calculateRegistrationDeadline(incomeYearEnd: Date): Date {
  const deadline = new Date(incomeYearEnd)
  deadline.setMonth(deadline.getMonth() + 10)
  return deadline
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Summary function for quick offset estimation
 */
export function estimateOffset(
  notionalDeductions: number,
  aggregatedTurnover: number
): {
  offsetType: string
  estimatedOffset: number
  effectiveRate: string
} {
  const result = calculateTaxOffset({
    notionalDeductions,
    aggregatedTurnover,
    totalExpenditure: aggregatedTurnover, // Approximate
  })

  return {
    offsetType: result.offsetType === "REFUNDABLE" ? "Refundable" : "Non-refundable",
    estimatedOffset: Math.round(result.totalOffset),
    effectiveRate: `${(result.effectiveRate * 100).toFixed(1)}%`,
  }
}
