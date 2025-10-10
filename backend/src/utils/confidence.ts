import { RecommendationWeights, DEFAULT_WEIGHTS } from '../types/index.js';

/**
 * Calcula o score de confiança normalizado [0, 1]
 * baseado em win rate, popularidade, tamanho da amostra e frescor dos dados
 */
export function calculateConfidence(
  winRate: number,
  popularity: number,
  sampleSize: number,
  lastUpdatedDays: number,
  weights: RecommendationWeights = DEFAULT_WEIGHTS
): number {
  // Normalizar winRate (0.3 a 0.7 -> 0 a 1)
  const normWinRate = Math.max(0, Math.min(1, (winRate - 0.3) / 0.4));

  // Normalizar popularity (0 a 0.5 -> 0 a 1)
  const normPopularity = Math.min(1, popularity * 2);

  // Normalizar sampleSize (logarítmico: 100 jogos = 0.5, 10000 = 1.0)
  const normSample = Math.min(1, Math.log10(sampleSize) / 4);

  // Normalizar freshness (30 dias = 1.0, 180 dias = 0.0)
  const normFreshness = Math.max(0, Math.min(1, 1 - (lastUpdatedDays / 180)));

  // Calcular score ponderado
  const confidence =
    weights.winRate * normWinRate +
    weights.popularity * normPopularity +
    weights.sampleSize * normSample +
    weights.freshness * normFreshness;

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calcula quantos dias se passaram desde a última atualização
 */
export function daysSinceUpdate(lastUpdated: string): number {
  const lastDate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula prioridade de item baseado em contexto de draft
 */
export function calculateItemPriority(
  baseWinRate: number,
  basePickRate: number,
  situationalBonus: number = 0
): number {
  // Base: winRate * pickRate + bônus situacional
  const base = (baseWinRate * 0.7 + basePickRate * 0.3);
  return Math.min(1, base + situationalBonus);
}
