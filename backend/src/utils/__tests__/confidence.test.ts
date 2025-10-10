import { describe, it, expect } from 'vitest';
import { calculateConfidence, daysSinceUpdate, calculateItemPriority } from '../confidence.js';

describe('calculateConfidence', () => {
  it('deve retornar 0-1 normalizado', () => {
    const confidence = calculateConfidence(0.52, 0.15, 5000, 30);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('deve dar mais peso a win rate alto', () => {
    const highWr = calculateConfidence(0.60, 0.10, 5000, 30);
    const lowWr = calculateConfidence(0.45, 0.10, 5000, 30);
    expect(highWr).toBeGreaterThan(lowWr);
  });

  it('deve penalizar dados antigos', () => {
    const fresh = calculateConfidence(0.52, 0.15, 5000, 10);
    const stale = calculateConfidence(0.52, 0.15, 5000, 150);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('deve favorecer amostras grandes', () => {
    const largeSample = calculateConfidence(0.52, 0.15, 10000, 30);
    const smallSample = calculateConfidence(0.52, 0.15, 500, 30);
    expect(largeSample).toBeGreaterThan(smallSample);
  });
});

describe('daysSinceUpdate', () => {
  it('deve calcular dias corretamente', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const days = daysSinceUpdate(oneDayAgo);
    expect(days).toBe(1);
  });

  it('deve retornar 0 para data atual', () => {
    const now = new Date().toISOString();
    const days = daysSinceUpdate(now);
    expect(days).toBe(0);
  });
});

describe('calculateItemPriority', () => {
  it('deve combinar win rate e pick rate', () => {
    const priority = calculateItemPriority(0.55, 0.30, 0);
    expect(priority).toBeGreaterThan(0);
    expect(priority).toBeLessThanOrEqual(1);
  });

  it('deve adicionar bônus situacional', () => {
    const base = calculateItemPriority(0.50, 0.20, 0);
    const bonus = calculateItemPriority(0.50, 0.20, 0.15);
    expect(bonus).toBeGreaterThan(base);
  });

  it('deve limitar prioridade a 1', () => {
    const priority = calculateItemPriority(0.90, 0.90, 0.90);
    expect(priority).toBeLessThanOrEqual(1);
  });
});
