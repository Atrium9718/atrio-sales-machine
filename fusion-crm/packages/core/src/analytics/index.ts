import Decimal from 'decimal.js';

export function computeSalesPace(input: {
  monthTarget: Decimal;
  achievedSoFar: Decimal;
  dayOfMonth: number;
  daysInMonth: number;
}): { expectedByNow: Decimal; deviationPercent: number; status: 'ON_TRACK' | 'BEHIND' | 'AHEAD' } {
  if (input.daysInMonth <= 0) {
    throw new Error("daysInMonth must be greater than 0");
  }
  if (input.monthTarget.lte(0)) {
    return {
      expectedByNow: new Decimal(0),
      deviationPercent: 0,
      status: 'ON_TRACK'
    };
  }

  const expectedByNow = input.monthTarget.mul(input.dayOfMonth).div(input.daysInMonth);
  
  if (expectedByNow.eq(0)) {
    return {
      expectedByNow,
      deviationPercent: input.achievedSoFar.gt(0) ? 100 : 0,
      status: input.achievedSoFar.gt(0) ? 'AHEAD' : 'ON_TRACK'
    };
  }

  const deviationPercent = input.achievedSoFar.minus(expectedByNow).div(expectedByNow).mul(100).toNumber();
  
  let status: 'ON_TRACK' | 'BEHIND' | 'AHEAD' = 'ON_TRACK';
  if (deviationPercent < -5) {
    status = 'BEHIND';
  } else if (deviationPercent > 5) {
    status = 'AHEAD';
  }

  return {
    expectedByNow,
    deviationPercent,
    status
  };
}

export function computeForecastClose(input: {
  dailyValues: { date: Date; amount: Decimal }[];
  daysRemaining: number;
}): { projectedTotal: Decimal; method: string } {
  if (input.daysRemaining < 0) {
    throw new Error("daysRemaining cannot be negative");
  }
  
  const totalSoFar = input.dailyValues.reduce((sum, v) => sum.plus(v.amount), new Decimal(0));
  
  if (input.daysRemaining === 0) {
    return { projectedTotal: totalSoFar, method: 'Ninguno (0 días restantes)' };
  }

  if (input.dailyValues.length === 0) {
    return { projectedTotal: new Decimal(0), method: 'Cero histórico' };
  }

  // Calculate moving average of the last 5 available days
  const sortedValues = [...input.dailyValues].sort((a, b) => a.date.getTime() - b.date.getTime());
  const lastDays = sortedValues.slice(-5);
  const sumLastDays = lastDays.reduce((sum, v) => sum.plus(v.amount), new Decimal(0));
  const movingAvg = sumLastDays.div(lastDays.length);

  const projectedTotal = totalSoFar.plus(movingAvg.mul(input.daysRemaining));
  
  return { 
    projectedTotal, 
    method: `Promedio móvil de los últimos ${lastDays.length} días con registro` 
  };
}

export function computePortfolioConcentration(input: {
  opportunities: { clientId: string; weightedValue: Decimal }[];
}): { byClient: { clientId: string; percent: number }[]; maxConcentrationPercent: number; isAnomalous: boolean } {
  if (input.opportunities.length === 0) {
    return { byClient: [], maxConcentrationPercent: 0, isAnomalous: false };
  }

  const grouped = new Map<string, Decimal>();
  let totalValue = new Decimal(0);

  for (const opp of input.opportunities) {
    const current = grouped.get(opp.clientId) || new Decimal(0);
    grouped.set(opp.clientId, current.plus(opp.weightedValue));
    totalValue = totalValue.plus(opp.weightedValue);
  }

  if (totalValue.eq(0)) {
     return {
       byClient: Array.from(grouped.keys()).map(id => ({ clientId: id, percent: 0 })),
       maxConcentrationPercent: 0,
       isAnomalous: false
     };
  }

  const byClient = Array.from(grouped.entries()).map(([clientId, val]) => {
    return {
      clientId,
      percent: val.div(totalValue).mul(100).toNumber()
    };
  });

  const maxConcentrationPercent = Math.max(...byClient.map(c => c.percent));
  
  // Statistical anomaly: standard dev method or simpler threshold
  // We use a threshold of 30% for a single client concentration alert
  // as 3 std devs is complex on small datasets, keeping it deterministically thresholded or a mix.
  let isAnomalous = false;
  if (byClient.length <= 1 && maxConcentrationPercent === 100) {
     isAnomalous = true;
  } else {
     const mean = 100 / byClient.length;
     const variance = byClient.reduce((acc, val) => acc + Math.pow(val.percent - mean, 2), 0) / byClient.length;
     const stdDev = Math.sqrt(variance);
     isAnomalous = maxConcentrationPercent > (mean + 3 * stdDev) || maxConcentrationPercent > 40; 
  }

  return {
    byClient: byClient.sort((a,b) => b.percent - a.percent),
    maxConcentrationPercent,
    isAnomalous
  };
}

export function computeFollowUpAging(input: {
  quotes: { id: string; clientId: string; amount: Decimal; lastActivityAt: Date }[];
  now: Date;
  thresholdDays: number;
}): { id: string; clientId: string; amount: Decimal; daysSinceContact: number }[] {
  const result = [];
  
  for (const quote of input.quotes) {
    const diffMs = input.now.getTime() - quote.lastActivityAt.getTime();
    const daysSinceContact = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (daysSinceContact > input.thresholdDays) {
      result.push({
        id: quote.id,
        clientId: quote.clientId,
        amount: quote.amount,
        daysSinceContact
      });
    }
  }
  
  return result.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}

export function computeAtRiskClients(input: {
  clients: { id: string; historicalValue: Decimal; lastOrderAt: Date | null }[];
  now: Date;
  minHistoricalValue: Decimal;
  inactivityDays: number;
}): { id: string; historicalValue: Decimal; daysInactive: number }[] {
  const result = [];
  
  for (const client of input.clients) {
    if (client.historicalValue.gte(input.minHistoricalValue)) {
      if (client.lastOrderAt === null) {
        // Never ordered but has historical value? Edge case
        result.push({
          id: client.id,
          historicalValue: client.historicalValue,
          daysInactive: Infinity
        });
        continue;
      }
      
      const diffMs = input.now.getTime() - client.lastOrderAt.getTime();
      const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (daysInactive > input.inactivityDays) {
        result.push({
          id: client.id,
          historicalValue: client.historicalValue,
          daysInactive
        });
      }
    }
  }
  
  return result.sort((a, b) => b.daysInactive - a.daysInactive);
}

export function rankSalesByRep(input: {
  achievedByUser: { userId: string; amount: Decimal }[];
  targetByUser: { userId: string; amount: Decimal }[];
}): { userId: string; amount: Decimal; target: Decimal; percentAchieved: number }[] {
  const targets = new Map(input.targetByUser.map(t => [t.userId, t.amount]));
  const achieved = new Map(input.achievedByUser.map(a => [a.userId, a.amount]));
  
  // Get all unique user IDs
  const allUserIds = new Set([...targets.keys(), ...achieved.keys()]);
  
  const ranking = Array.from(allUserIds).map(userId => {
    const amount = achieved.get(userId) || new Decimal(0);
    const target = targets.get(userId) || new Decimal(0);
    
    let percentAchieved = 0;
    if (target.gt(0)) {
      percentAchieved = amount.div(target).mul(100).toNumber();
    } else if (amount.gt(0)) {
      percentAchieved = 100; // No target but achieved something
    }
    
    return {
      userId,
      amount,
      target,
      percentAchieved
    };
  });
  
  return ranking.sort((a, b) => b.percentAchieved - a.percentAchieved);
}
