import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  computeSalesPace,
  computeForecastClose,
  computePortfolioConcentration,
  computeFollowUpAging,
  computeAtRiskClients,
  rankSalesByRep
} from './index';

describe('Analytics Puras', () => {

  describe('computeSalesPace', () => {
    it('should throw error if daysInMonth is <= 0', () => {
      expect(() => computeSalesPace({ monthTarget: new Decimal(100), achievedSoFar: new Decimal(10), dayOfMonth: 5, daysInMonth: 0 })).toThrow();
    });
    
    it('should handle zero month target', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(0), achievedSoFar: new Decimal(10), dayOfMonth: 5, daysInMonth: 30 });
      expect(res.expectedByNow.toNumber()).toBe(0);
      expect(res.status).toBe('ON_TRACK');
      expect(res.deviationPercent).toBe(0);
    });

    it('should handle expectedByNow = 0 when dayOfMonth = 0 with no sales', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(100), achievedSoFar: new Decimal(0), dayOfMonth: 0, daysInMonth: 30 });
      expect(res.expectedByNow.toNumber()).toBe(0);
      expect(res.status).toBe('ON_TRACK');
      expect(res.deviationPercent).toBe(0);
    });

    it('should return AHEAD if expectedByNow = 0 and achieved > 0', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(100), achievedSoFar: new Decimal(10), dayOfMonth: 0, daysInMonth: 30 });
      expect(res.status).toBe('AHEAD');
      expect(res.deviationPercent).toBe(100);
    });

    it('should be ON_TRACK when exactly on pace', () => {
      // Target 300, day 10/30 => expected 100
      const res = computeSalesPace({ monthTarget: new Decimal(300), achievedSoFar: new Decimal(100), dayOfMonth: 10, daysInMonth: 30 });
      expect(res.expectedByNow.toNumber()).toBe(100);
      expect(res.status).toBe('ON_TRACK');
      expect(res.deviationPercent).toBe(0);
    });

    it('should be ON_TRACK when within 5% deviation', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(300), achievedSoFar: new Decimal(96), dayOfMonth: 10, daysInMonth: 30 });
      expect(res.status).toBe('ON_TRACK');
      expect(res.deviationPercent).toBe(-4);
    });

    it('should be BEHIND when strictly below -5% deviation', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(300), achievedSoFar: new Decimal(90), dayOfMonth: 10, daysInMonth: 30 });
      expect(res.status).toBe('BEHIND');
      expect(res.deviationPercent).toBe(-10);
    });

    it('should be AHEAD when strictly above 5% deviation', () => {
      const res = computeSalesPace({ monthTarget: new Decimal(300), achievedSoFar: new Decimal(110), dayOfMonth: 10, daysInMonth: 30 });
      expect(res.status).toBe('AHEAD');
      expect(res.deviationPercent).toBeCloseTo(10, 5);
    });
  });

  describe('computeForecastClose', () => {
    it('should throw if daysRemaining is negative', () => {
      expect(() => computeForecastClose({ dailyValues: [], daysRemaining: -1 })).toThrow();
    });

    it('should return totalSoFar if 0 days remaining', () => {
      const res = computeForecastClose({ dailyValues: [{ date: new Date(), amount: new Decimal(50) }], daysRemaining: 0 });
      expect(res.projectedTotal.toNumber()).toBe(50);
      expect(res.method).toContain('0 días');
    });

    it('should return 0 if no historical data', () => {
      const res = computeForecastClose({ dailyValues: [], daysRemaining: 10 });
      expect(res.projectedTotal.toNumber()).toBe(0);
      expect(res.method).toContain('Cero histórico');
    });

    it('should project using average of all days if < 5 days available', () => {
      const res = computeForecastClose({ 
        dailyValues: [
          { date: new Date('2023-01-01'), amount: new Decimal(10) },
          { date: new Date('2023-01-02'), amount: new Decimal(20) }
        ], 
        daysRemaining: 10 
      });
      // totalSoFar = 30, avg = 15. projected = 30 + 15*10 = 180
      expect(res.projectedTotal.toNumber()).toBe(180);
      expect(res.method).toContain('últimos 2 días');
    });

    it('should project using average of only last 5 days if > 5 days available', () => {
      const dates = Array.from({length: 10}, (_, i) => new Date(`2023-01-\${i+1 < 10 ? '0' : ''}\${i+1}`));
      const res = computeForecastClose({ 
        dailyValues: dates.map((date, i) => ({ date, amount: new Decimal(10) })), 
        daysRemaining: 5 
      });
      // totalSoFar = 100, last 5 avg = 10. projected = 100 + 5*10 = 150
      expect(res.projectedTotal.toNumber()).toBe(150);
      expect(res.method).toContain('últimos 5 días');
    });

    it('should handle zero amount in some days', () => {
      const res = computeForecastClose({ 
        dailyValues: [
          { date: new Date('2023-01-01'), amount: new Decimal(0) },
          { date: new Date('2023-01-02'), amount: new Decimal(0) }
        ], 
        daysRemaining: 10 
      });
      expect(res.projectedTotal.toNumber()).toBe(0);
    });

    it('should sort dates correctly before slicing', () => {
      const res = computeForecastClose({ 
        dailyValues: [
          { date: new Date('2023-01-05'), amount: new Decimal(50) },
          { date: new Date('2023-01-01'), amount: new Decimal(10) },
        ], 
        daysRemaining: 1 
      });
      // total: 60, avg: 30, projected: 60 + 30*1 = 90
      expect(res.projectedTotal.toNumber()).toBe(90);
    });

    it('should handle fractional decimals correctly', () => {
      const res = computeForecastClose({ 
        dailyValues: [{ date: new Date(), amount: new Decimal("10.5") }], 
        daysRemaining: 2 
      });
      // total: 10.5, avg: 10.5, projected: 10.5 + 21 = 31.5
      expect(res.projectedTotal.toNumber()).toBe(31.5);
    });
  });

  describe('computePortfolioConcentration', () => {
    it('should handle empty opportunities', () => {
      const res = computePortfolioConcentration({ opportunities: [] });
      expect(res.byClient).toHaveLength(0);
      expect(res.maxConcentrationPercent).toBe(0);
      expect(res.isAnomalous).toBe(false);
    });

    it('should handle total value = 0', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [{ clientId: 'A', weightedValue: new Decimal(0) }] 
      });
      expect(res.byClient[0].percent).toBe(0);
      expect(res.maxConcentrationPercent).toBe(0);
      expect(res.isAnomalous).toBe(false);
    });

    it('should group by clientId and sum values', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [
          { clientId: 'A', weightedValue: new Decimal(10) },
          { clientId: 'A', weightedValue: new Decimal(10) },
          { clientId: 'B', weightedValue: new Decimal(20) },
        ] 
      });
      expect(res.byClient.find(c => c.clientId === 'A')?.percent).toBe(50);
      expect(res.byClient.find(c => c.clientId === 'B')?.percent).toBe(50);
      expect(res.maxConcentrationPercent).toBe(50);
    });

    it('should sort clients by percent descending', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [
          { clientId: 'A', weightedValue: new Decimal(10) },
          { clientId: 'B', weightedValue: new Decimal(90) },
        ] 
      });
      expect(res.byClient[0].clientId).toBe('B');
      expect(res.byClient[1].clientId).toBe('A');
    });

    it('should mark as anomalous if single client has 100%', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [{ clientId: 'A', weightedValue: new Decimal(10) }] 
      });
      expect(res.isAnomalous).toBe(true);
    });

    it('should not mark anomalous for evenly distributed clients', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [
          { clientId: 'A', weightedValue: new Decimal(25) },
          { clientId: 'B', weightedValue: new Decimal(25) },
          { clientId: 'C', weightedValue: new Decimal(25) },
          { clientId: 'D', weightedValue: new Decimal(25) },
        ] 
      });
      expect(res.isAnomalous).toBe(false);
    });

it('should mark anomalous for historical case: 88% concentration', () => {       const res = computePortfolioConcentration({         opportunities: [           { clientId: 'Megacorp', weightedValue: new Decimal(88) },           { clientId: 'B', weightedValue: new Decimal(7) },           { clientId: 'C', weightedValue: new Decimal(3) },           { clientId: 'D', weightedValue: new Decimal(2) },         ]       });       expect(res.maxConcentrationPercent).toBe(88);       expect(res.byClient[0].clientId).toBe('Megacorp');       expect(res.byClient[0].percent).toBe(88);       expect(res.isAnomalous).toBe(true);     });

    it('should mark anomalous if one client > 40%', () => {
      const res = computePortfolioConcentration({ 
        opportunities: [
          { clientId: 'A', weightedValue: new Decimal(45) },
          { clientId: 'B', weightedValue: new Decimal(20) },
          { clientId: 'C', weightedValue: new Decimal(20) },
          { clientId: 'D', weightedValue: new Decimal(15) },
        ] 
      });
      expect(res.isAnomalous).toBe(true);
    });

    it('should mark anomalous if max > mean + 3 stddev', () => {
      const opportunities = [];
      for(let i = 0; i < 20; i++) {
         opportunities.push({ clientId: `C\${i}`, weightedValue: new Decimal(1) });
      }
      opportunities.push({ clientId: 'A', weightedValue: new Decimal(15) });
      // Total 35. 'A' has 15/35 = 42.8% (also > 40, so double trigger)
      const res = computePortfolioConcentration({ opportunities });
      expect(res.isAnomalous).toBe(true);
    });
  });

  describe('computeFollowUpAging', () => {
    it('should return empty if no quotes', () => {
      const res = computeFollowUpAging({ quotes: [], now: new Date(), thresholdDays: 5 });
      expect(res).toHaveLength(0);
    });

    it('should filter quotes exactly on threshold', () => {
      const now = new Date('2023-01-10T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [{ id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-05T12:00:00Z') }], 
        now, 
        thresholdDays: 5 
      });
      expect(res).toHaveLength(0);
    });

    it('should include quotes exceeding threshold', () => {
      const now = new Date('2023-01-10T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [{ id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-04T11:00:00Z') }], 
        now, 
        thresholdDays: 5 
      });
      expect(res).toHaveLength(1);
      expect(res[0].daysSinceContact).toBe(6); // Math.floor(6.04)
    });

    it('should handle dates in the future (negative days)', () => {
      const now = new Date('2023-01-10T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [{ id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-11T12:00:00Z') }], 
        now, 
        thresholdDays: 5 
      });
      expect(res).toHaveLength(0);
    });

    it('should sort by oldest (highest daysSinceContact) first', () => {
      const now = new Date('2023-01-20T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [
          { id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-10T12:00:00Z') }, // 10 days
          { id: '2', clientId: 'B', amount: new Decimal(100), lastActivityAt: new Date('2023-01-05T12:00:00Z') }, // 15 days
        ], 
        now, 
        thresholdDays: 5 
      });
      expect(res[0].id).toBe('2');
      expect(res[1].id).toBe('1');
    });

    it('should return multiple quotes', () => {
      const now = new Date('2023-01-20T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [
          { id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-10T12:00:00Z') },
          { id: '2', clientId: 'B', amount: new Decimal(100), lastActivityAt: new Date('2023-01-05T12:00:00Z') },
          { id: '3', clientId: 'C', amount: new Decimal(100), lastActivityAt: new Date('2023-01-18T12:00:00Z') }, // 2 days, excluded
        ], 
        now, 
        thresholdDays: 5 
      });
      expect(res).toHaveLength(2);
    });

    it('should not mutate original quotes array', () => {
      const now = new Date('2023-01-10T12:00:00Z');
      const quotes = [{ id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-01T12:00:00Z') }];
      computeFollowUpAging({ quotes, now, thresholdDays: 5 });
      expect(quotes).toHaveLength(1);
    });

    it('should handle zero threshold', () => {
      const now = new Date('2023-01-10T12:00:00Z');
      const res = computeFollowUpAging({ 
        quotes: [{ id: '1', clientId: 'A', amount: new Decimal(100), lastActivityAt: new Date('2023-01-09T11:00:00Z') }], // 1 day
        now, 
        thresholdDays: 0 
      });
      expect(res).toHaveLength(1);
    });
  });

  describe('computeAtRiskClients', () => {
    it('should return empty if no clients', () => {
      const res = computeAtRiskClients({ clients: [], now: new Date(), minHistoricalValue: new Decimal(100), inactivityDays: 30 });
      expect(res).toHaveLength(0);
    });

    it('should filter out clients below minHistoricalValue', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(50), lastOrderAt: new Date('2022-01-01T12:00:00Z') }], 
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(0);
    });

    it('should include clients above minHistoricalValue and above inactivityDays', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(150), lastOrderAt: new Date('2022-12-01T12:00:00Z') }], // ~62 days
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(1);
      expect(res[0].daysInactive).toBe(62);
    });

    it('should exclude clients above minHistoricalValue but below inactivityDays', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(150), lastOrderAt: new Date('2023-01-15T12:00:00Z') }], // 17 days
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(0);
    });

    it('should handle clients with lastOrderAt = null (edge case)', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(150), lastOrderAt: null }], 
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(1);
      expect(res[0].daysInactive).toBe(Infinity);
    });

    it('should sort by daysInactive descending', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [
          { id: '1', historicalValue: new Decimal(150), lastOrderAt: new Date('2022-12-01T12:00:00Z') }, // 62
          { id: '2', historicalValue: new Decimal(150), lastOrderAt: new Date('2022-11-01T12:00:00Z') }, // 92
        ], 
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res[0].id).toBe('2');
      expect(res[1].id).toBe('1');
    });

    it('should handle exactly at minHistoricalValue', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(100), lastOrderAt: new Date('2022-12-01T12:00:00Z') }], 
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(1);
    });

    it('should handle negative daysInactive if lastOrder is in future', () => {
      const now = new Date('2023-02-01T12:00:00Z');
      const res = computeAtRiskClients({ 
        clients: [{ id: '1', historicalValue: new Decimal(150), lastOrderAt: new Date('2023-03-01T12:00:00Z') }], 
        now, 
        minHistoricalValue: new Decimal(100), 
        inactivityDays: 30 
      });
      expect(res).toHaveLength(0);
    });
  });

  describe('rankSalesByRep', () => {
    it('should return empty if both input arrays are empty', () => {
      const res = rankSalesByRep({ achievedByUser: [], targetByUser: [] });
      expect(res).toHaveLength(0);
    });

    it('should rank correctly with targets and achieved', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [
          { userId: '1', amount: new Decimal(100) },
          { userId: '2', amount: new Decimal(50) }
        ], 
        targetByUser: [
          { userId: '1', amount: new Decimal(100) }, // 100%
          { userId: '2', amount: new Decimal(40) }  // 125%
        ] 
      });
      expect(res[0].userId).toBe('2');
      expect(res[1].userId).toBe('1');
    });

    it('should handle user with achieved but no target', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [{ userId: '1', amount: new Decimal(100) }], 
        targetByUser: [] 
      });
      expect(res[0].percentAchieved).toBe(100);
      expect(res[0].target.toNumber()).toBe(0);
    });

    it('should handle user with target but no achieved', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [], 
        targetByUser: [{ userId: '1', amount: new Decimal(100) }] 
      });
      expect(res[0].percentAchieved).toBe(0);
      expect(res[0].amount.toNumber()).toBe(0);
    });

    it('should handle target = 0 and achieved = 0', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [{ userId: '1', amount: new Decimal(0) }], 
        targetByUser: [{ userId: '1', amount: new Decimal(0) }] 
      });
      expect(res[0].percentAchieved).toBe(0);
    });

    it('should sort correctly when multiple reps have same percentage', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [
          { userId: '1', amount: new Decimal(100) },
          { userId: '2', amount: new Decimal(200) }
        ], 
        targetByUser: [
          { userId: '1', amount: new Decimal(100) }, // 100%
          { userId: '2', amount: new Decimal(200) }  // 100%
        ] 
      });
      // the sort order is stable or dependent on JS engine for exact tie, 
      // but they should both be there with 100%
      expect(res).toHaveLength(2);
      expect(res[0].percentAchieved).toBe(100);
      expect(res[1].percentAchieved).toBe(100);
    });

    it('should correctly join disparate sets of users', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [{ userId: '1', amount: new Decimal(100) }], 
        targetByUser: [{ userId: '2', amount: new Decimal(100) }] 
      });
      expect(res).toHaveLength(2);
      const u1 = res.find(u => u.userId === '1');
      const u2 = res.find(u => u.userId === '2');
      expect(u1?.percentAchieved).toBe(100);
      expect(u2?.percentAchieved).toBe(0);
    });

    it('should handle fractional percentages correctly', () => {
      const res = rankSalesByRep({ 
        achievedByUser: [{ userId: '1', amount: new Decimal(33) }], 
        targetByUser: [{ userId: '1', amount: new Decimal(100) }] 
      });
      expect(res[0].percentAchieved).toBe(33);
    });
  });
});
