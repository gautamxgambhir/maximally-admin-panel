/**
 * Analytics Property Tests
 * 
 * Property-based tests for analytics calculations.
 * Requirements: 8.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePeriodComparison,
  verifyPeriodComparisonAccuracy,
  getTimeRangeBoundaries,
  getPreviousPeriodBoundaries,
  getGranularityForTimeRange,
  groupByGranularity,
  calculateTimeSeriesTotal,
  detectTimeSeriesAnomalies,
  createMetricCard,
  formatMetricValue,
  calculateGrowthRate,
  exportToCSV,
} from './analyticsCore';
import type { TimeSeriesDataPoint, AnalyticsTimeRange } from '@/types/analytics';

describe('Analytics Property Tests', () => {
  /**
   * Property 15: Period Comparison Accuracy
   * 
   * For any metric comparison between periods, the percentage change SHALL be
   * calculated as ((current - previous) / previous) * 100.
   * 
   * Validates: Requirements 8.4
   */
  describe('Property 15: Period Comparison Accuracy', () => {
    it('should correctly calculate percentage change for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }), // previous must be > 0 for standard calculation
          (current, previous) => {
            const comparison = calculatePeriodComparison(current, previous);
            
            // Verify the percentage change formula
            const expectedPercentage = ((current - previous) / previous) * 100;
            expect(Math.abs(comparison.percentageChange - expectedPercentage)).toBeLessThan(0.0001);
            
            // Verify change calculation
            expect(comparison.change).toBe(current - previous);
            
            // Verify trend direction
            if (current > previous) {
              expect(comparison.trend).toBe('up');
            } else if (current < previous) {
              expect(comparison.trend).toBe('down');
            } else {
              expect(comparison.trend).toBe('stable');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero previous value correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          (current) => {
            const comparison = calculatePeriodComparison(current, 0);
            
            // When previous is 0:
            // - If current is also 0, percentage change should be 0
            // - If current > 0, percentage change should be 100 (representing growth from nothing)
            // - If current < 0, percentage change should be -100
            if (current === 0) {
              expect(comparison.percentageChange).toBe(0);
              expect(comparison.trend).toBe('stable');
            } else if (current > 0) {
              expect(comparison.percentageChange).toBe(100);
              expect(comparison.trend).toBe('up');
            } else {
              expect(comparison.percentageChange).toBe(-100);
              expect(comparison.trend).toBe('down');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should pass verification for all calculated comparisons', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (current, previous) => {
            const comparison = calculatePeriodComparison(current, previous);
            expect(verifyPeriodComparisonAccuracy(comparison)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain mathematical consistency', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          (current, previous) => {
            const comparison = calculatePeriodComparison(current, previous);
            
            // Verify: current = previous + change
            expect(comparison.current).toBe(current);
            expect(comparison.previous).toBe(previous);
            expect(comparison.current).toBe(comparison.previous + comparison.change);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Time Range Boundaries', () => {
    it('should return valid date ranges for all time range options', () => {
      const timeRanges: AnalyticsTimeRange[] = ['24h', '7d', '30d', '90d', '1y'];
      
      for (const timeRange of timeRanges) {
        const { start, end } = getTimeRangeBoundaries(timeRange);
        
        // End should be after start
        expect(end.getTime()).toBeGreaterThan(start.getTime());
        
        // End should be close to now
        const now = new Date();
        expect(Math.abs(end.getTime() - now.getTime())).toBeLessThan(1000); // Within 1 second
      }
    });

    it('should return correct duration for each time range', () => {
      const expectedDurations: Record<AnalyticsTimeRange, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000,
        'custom': 30 * 24 * 60 * 60 * 1000, // Default for custom
      };

      for (const [timeRange, expectedDuration] of Object.entries(expectedDurations)) {
        const { start, end } = getTimeRangeBoundaries(timeRange as AnalyticsTimeRange);
        const actualDuration = end.getTime() - start.getTime();
        
        // Allow 1 second tolerance
        expect(Math.abs(actualDuration - expectedDuration)).toBeLessThan(1000);
      }
    });
  });

  describe('Previous Period Boundaries', () => {
    it('should return a period of equal duration immediately before the current period', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
          fc.integer({ min: 1, max: 365 }),
          (startDate, durationDays) => {
            const start = startDate;
            const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
            
            const { start: prevStart, end: prevEnd } = getPreviousPeriodBoundaries(start, end);
            
            // Previous period should have same duration
            const currentDuration = end.getTime() - start.getTime();
            const previousDuration = prevEnd.getTime() - prevStart.getTime();
            expect(previousDuration).toBe(currentDuration);
            
            // Previous period should end exactly when current period starts
            expect(prevEnd.getTime()).toBe(start.getTime());
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Granularity Selection', () => {
    it('should return appropriate granularity for each time range', () => {
      const expectedGranularities: Record<AnalyticsTimeRange, string> = {
        '24h': 'hour',
        '7d': 'day',
        '30d': 'day',
        '90d': 'week',
        '1y': 'month',
        'custom': 'day',
      };

      for (const [timeRange, expectedGranularity] of Object.entries(expectedGranularities)) {
        const granularity = getGranularityForTimeRange(timeRange as AnalyticsTimeRange);
        expect(granularity).toBe(expectedGranularity);
      }
    });
  });

  describe('Time Series Total Calculation', () => {
    it('should correctly sum all values in time series', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 100 }),
          (values) => {
            const data: TimeSeriesDataPoint[] = values.map((value, index) => ({
              date: `2024-01-${String(index + 1).padStart(2, '0')}`,
              value,
            }));
            
            const total = calculateTimeSeriesTotal(data);
            const expectedTotal = values.reduce((sum, v) => sum + v, 0);
            
            expect(total).toBe(expectedTotal);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return 0 for empty array', () => {
      expect(calculateTimeSeriesTotal([])).toBe(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect values that deviate significantly from the mean', () => {
      // Create data with a clear outlier
      const normalValues = Array(10).fill(100);
      const dataWithOutlier: TimeSeriesDataPoint[] = [
        ...normalValues.map((v, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, value: v })),
        { date: '2024-01-11', value: 500 }, // Clear outlier
      ];
      
      const anomalies = detectTimeSeriesAnomalies(dataWithOutlier, 2);
      
      // The outlier should be detected
      expect(anomalies).toContain(10); // Index of the outlier
    });

    it('should not detect anomalies in uniform data', () => {
      const uniformData: TimeSeriesDataPoint[] = Array(10).fill(null).map((_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 100,
      }));
      
      const anomalies = detectTimeSeriesAnomalies(uniformData, 2);
      
      // No anomalies in uniform data
      expect(anomalies).toHaveLength(0);
    });

    it('should return empty array for insufficient data', () => {
      const shortData: TimeSeriesDataPoint[] = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 200 },
      ];
      
      const anomalies = detectTimeSeriesAnomalies(shortData, 2);
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('Metric Card Creation', () => {
    it('should correctly calculate change type based on comparison', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          (current, previous) => {
            const card = createMetricCard('test', 'Test Metric', current, previous);
            
            if (current > previous) {
              expect(card.changeType).toBe('increase');
            } else if (current < previous) {
              expect(card.changeType).toBe('decrease');
            } else {
              expect(card.changeType).toBe('neutral');
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Metric Value Formatting', () => {
    it('should format large numbers with K/M suffixes', () => {
      expect(formatMetricValue(1500, 'number')).toBe('1.5K');
      expect(formatMetricValue(1500000, 'number')).toBe('1.5M');
      expect(formatMetricValue(500, 'number')).toBe('500');
    });

    it('should format percentages correctly', () => {
      expect(formatMetricValue(75.5, 'percentage')).toBe('75.5%');
      expect(formatMetricValue(100, 'percentage')).toBe('100.0%');
    });
  });

  describe('Growth Rate Calculation', () => {
    it('should match period comparison percentage change', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          (current, previous) => {
            const growthRate = calculateGrowthRate(current, previous);
            const comparison = calculatePeriodComparison(current, previous);
            
            expect(Math.abs(growthRate - comparison.percentageChange)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('CSV Export', () => {
    it('should include all headers and data rows', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
              value: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (data) => {
            const headers = ['date', 'value'];
            const csv = exportToCSV(data, headers);
            const lines = csv.split('\n');
            
            // First line should be headers
            expect(lines[0]).toBe('date,value');
            
            // Should have header + data rows
            expect(lines.length).toBe(data.length + 1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle empty data', () => {
      const csv = exportToCSV([], ['date', 'value']);
      expect(csv).toBe('date,value\n');
    });

    it('should escape values containing commas', () => {
      const data = [{ name: 'Test, with comma', value: 100 }];
      const csv = exportToCSV(data, ['name', 'value']);
      
      expect(csv).toContain('"Test, with comma"');
    });
  });
});
