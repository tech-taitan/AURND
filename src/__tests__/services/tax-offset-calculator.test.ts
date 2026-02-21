import { describe, it, expect } from 'vitest'
import { 
  calculateTaxOffset, 
  meetsMinimumThreshold, 
  calculateRegistrationDeadline,
  estimateOffset 
} from '@/services/tax-offset-calculator.service'

describe('TaxOffsetCalculator', () => {
  describe('calculateTaxOffset', () => {
    it('should calculate refundable offset for entities with turnover < $20M', () => {
      const result = calculateTaxOffset({
        notionalDeductions: 1_000_000,
        aggregatedTurnover: 15_000_000,
        totalExpenditure: 1_000_000,
      })

      // For turnover < $20M: refundable offset applies
      expect(result.offsetType).toBe('REFUNDABLE')
      expect(result.totalOffset).toBeGreaterThan(0)
      // Effective rate should be company tax rate (25%) + 18.5% premium = 43.5%
      expect(result.effectiveRate).toBeCloseTo(0.435, 2)
    })

    it('should calculate non-refundable offset for entities with turnover >= $20M', () => {
      const result = calculateTaxOffset({
        notionalDeductions: 1_000_000,
        aggregatedTurnover: 50_000_000,
        totalExpenditure: 1_000_000,
      })

      // For turnover >= $20M: non-refundable offset applies
      expect(result.offsetType).toBe('NON_REFUNDABLE')
      expect(result.totalOffset).toBeGreaterThan(0)
    })

    it('should apply higher premium for R&D intensive entities', () => {
      // Low intensity (< 2%)
      const lowIntensityResult = calculateTaxOffset({
        notionalDeductions: 100_000,
        aggregatedTurnover: 50_000_000,
        totalExpenditure: 50_000_000, // 0.2% intensity
      })

      // High intensity (> 2%)
      const highIntensityResult = calculateTaxOffset({
        notionalDeductions: 2_000_000,
        aggregatedTurnover: 50_000_000,
        totalExpenditure: 50_000_000, // 4% intensity
      })

      // High intensity should have a premium component
      expect(highIntensityResult.breakdown.premiumAmount).toBeGreaterThan(0)
      expect(highIntensityResult.effectiveRate).toBeGreaterThan(lowIntensityResult.effectiveRate)
    })

    it('should handle zero notional deductions', () => {
      const result = calculateTaxOffset({
        notionalDeductions: 0,
        aggregatedTurnover: 10_000_000,
        totalExpenditure: 0,
      })

      expect(result.totalOffset).toBe(0)
    })

    it('should use base tax rate (25%) for entities with turnover < $50M', () => {
      const result = calculateTaxOffset({
        notionalDeductions: 1_000_000,
        aggregatedTurnover: 40_000_000,
        totalExpenditure: 1_000_000,
      })

      expect(result.companyTaxRate).toBe(0.25)
    })

    it('should use standard tax rate (30%) for entities with turnover >= $50M', () => {
      const result = calculateTaxOffset({
        notionalDeductions: 1_000_000,
        aggregatedTurnover: 60_000_000,
        totalExpenditure: 1_000_000,
      })

      expect(result.companyTaxRate).toBe(0.30)
    })
  })

  describe('meetsMinimumThreshold', () => {
    it('should return eligible when expenditure meets minimum threshold', () => {
      const result = meetsMinimumThreshold(25_000)
      expect(result.eligible).toBe(true)
    })

    it('should return not eligible when expenditure is below minimum threshold', () => {
      const result = meetsMinimumThreshold(15_000)
      expect(result.eligible).toBe(false)
    })
  })

  describe('calculateRegistrationDeadline', () => {
    it('should calculate registration deadline as 10 months after income year end', () => {
      const incomeYearEnd = new Date('2024-06-30')
      const deadline = calculateRegistrationDeadline(incomeYearEnd)
      
      // Deadline should be 10 months after year end (April 30 next year)
      expect(deadline.getMonth()).toBe(3) // April (0-indexed)
      expect(deadline.getFullYear()).toBe(2025)
    })
  })

  describe('estimateOffset', () => {
    it('should estimate offset based on expenditure and turnover', () => {
      const estimate = estimateOffset(1_000_000, 15_000_000)
      
      expect(estimate.estimatedOffset).toBeGreaterThan(0)
      expect(estimate.offsetType).toBe('Refundable')
    })

    it('should estimate non-refundable offset for high turnover entities', () => {
      const estimate = estimateOffset(1_000_000, 50_000_000)
      
      expect(estimate.offsetType).toBe('Non-refundable')
    })
  })
})
