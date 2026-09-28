import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  computePortfolioConcentration,
  computeFollowUpAging
} from './index';

describe('Pruebas de Rendimiento (Bloque E)', () => {
  it('should process 5,000 opportunities in under 2 seconds', () => {
    const opps = Array.from({ length: 5000 }).map((_, i) => ({
      clientId: `CLIENT_${i % 500}`, // 500 unique clients
      weightedValue: new Decimal(Math.random() * 1000000)
    }));

    const start = performance.now();
    const result = computePortfolioConcentration({ opportunities: opps });
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(2000);
    expect(result.byClient.length).toBe(500);
  });

  it('should process 20,000 quotes in under 2 seconds', () => {
    const quotes = Array.from({ length: 20000 }).map((_, i) => ({
      id: `QUOTE_${i}`,
      clientId: `CLIENT_${i % 1000}`,
      amount: new Decimal(1000),
      lastActivityAt: new Date(Date.now() - (Math.random() * 20 * 24 * 60 * 60 * 1000)) // 0 to 20 days ago
    }));

    const start = performance.now();
    const result = computeFollowUpAging({ 
      quotes, 
      now: new Date(), 
      thresholdDays: 7 
    });
    const end = performance.now();

    const duration = end - start;
    expect(duration).toBeLessThan(2000);
    expect(result).toBeDefined();
  });
});

describe('Pruebas RBAC (Bloque F)', () => {
  it('should not expose cost or margin properties in analytical outputs', () => {
    // Simulamos la verificación de estructura de datos
    // Ninguna de nuestras interfaces (y por tanto, los retornos de las funciones)
    // contiene 'costo', 'margen', 'rentabilidad'
    
    // Lo verificamos introspectando las claves del resultado de ranking
    const result = computePortfolioConcentration({ opportunities: [{ clientId: 'A', weightedValue: new Decimal(100) }] });
    
    const clientKeys = Object.keys(result.byClient[0]);
    expect(clientKeys).not.toContain('cost');
    expect(clientKeys).not.toContain('margin');
    expect(clientKeys).not.toContain('profitability');
  });
});
