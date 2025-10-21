import { HeroData, Matchup } from '../types/index.js';

export interface DraftSuggestion {
  heroId: number;
  heroName: string;
  score: number;
  reasons: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface DraftAnalysis {
  suggestedPicks: DraftSuggestion[];
  suggestedBans: DraftSuggestion[];
  teamComposition: {
    roles: {
      carry: number;
      support: number;
      offlane: number;
      mid: number;
      roaming: number;
    };
    missingRoles: string[];
    strengths: string[];
    weaknesses: string[];
  };
  countersNeeded: string[];
  synergyOpportunities: string[];
}

interface HeroMatchupData {
  heroId: number;
  heroName: string;
  winRate: number;
  matchups: Matchup[];
  roles: string[];
}

/**
 * DraftAnalyzer - Analisa draft atual e sugere picks/bans
 * Similar ao DotaPlus
 */
export class DraftAnalyzer {
  /**
   * Analisa o draft atual e retorna sugestões de picks e bans
   */
  async analyzeDraft(
    allyPicks: number[],
    enemyPicks: number[],
    allyBans: number[],
    enemyBans: number[],
    heroesData: Map<number, HeroMatchupData>
  ): Promise<DraftAnalysis> {
    const allBans = [...allyBans, ...enemyBans];
    const allPicks = [...allyPicks, ...enemyPicks];
    const unavailable = new Set([...allBans, ...allPicks]);

    // Analisar composição do time
    const teamComp = this.analyzeTeamComposition(allyPicks, heroesData);

    // Sugerir picks baseado em:
    // 1. Counters para inimigos
    // 2. Sinergias com aliados
    // 3. Roles faltando
    // 4. Win rate geral
    const suggestedPicks = this.suggestPicks(
      allyPicks,
      enemyPicks,
      unavailable,
      heroesData,
      teamComp.missingRoles
    );

    // Sugerir bans baseado em:
    // 1. Counters fortes contra nosso time
    // 2. Meta picks (high win rate)
    // 3. Heróis que sinergia bem com picks inimigos
    const suggestedBans = this.suggestBans(
      allyPicks,
      enemyPicks,
      unavailable,
      heroesData
    );

    return {
      suggestedPicks,
      suggestedBans,
      teamComposition: teamComp,
      countersNeeded: this.identifyCountersNeeded(enemyPicks, heroesData),
      synergyOpportunities: this.identifySynergyOpportunities(allyPicks, heroesData),
    };
  }

  /**
   * Analisa composição do time atual
   */
  private analyzeTeamComposition(
    picks: number[],
    heroesData: Map<number, HeroMatchupData>
  ) {
    const roles = {
      carry: 0,
      support: 0,
      offlane: 0,
      mid: 0,
      roaming: 0,
    };

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    picks.forEach((heroId) => {
      const hero = heroesData.get(heroId);
      if (!hero) return;

      // Contar roles
      if (hero.roles.includes('Carry')) roles.carry++;
      if (hero.roles.includes('Support')) roles.support++;
      if (hero.roles.includes('Durable') || hero.roles.includes('Initiator')) roles.offlane++;
      if (hero.roles.includes('Nuker') && !hero.roles.includes('Support')) roles.mid++;
      if (hero.roles.includes('Escape') || hero.roles.includes('Disabler')) roles.roaming++;
    });

    // Identificar roles faltando
    const missingRoles: string[] = [];
    if (roles.carry === 0) missingRoles.push('Carry');
    if (roles.support === 0) missingRoles.push('Support');
    if (roles.offlane === 0) missingRoles.push('Offlane/Initiator');
    if (roles.mid === 0) missingRoles.push('Mid/Nuker');

    // Identificar forças e fraquezas
    if (roles.support >= 2) strengths.push('Suporte forte');
    if (roles.carry >= 2) weaknesses.push('Muito farm dependente');
    if (picks.length > 0 && roles.support === 0) weaknesses.push('Falta de suporte');
    if (picks.length > 0 && roles.carry === 0) weaknesses.push('Falta de carry');

    return {
      roles,
      missingRoles,
      strengths,
      weaknesses,
    };
  }

  /**
   * Sugere picks baseado em múltiplos fatores
   */
  private suggestPicks(
    allyPicks: number[],
    enemyPicks: number[],
    unavailable: Set<number>,
    heroesData: Map<number, HeroMatchupData>,
    missingRoles: string[]
  ): DraftSuggestion[] {
    const suggestions: DraftSuggestion[] = [];

    heroesData.forEach((hero, heroId) => {
      if (unavailable.has(heroId)) return;

      const reasons: string[] = [];
      let score = 0;

      // Fator 1: Win rate base (0-30 pontos)
      score += hero.winRate * 30;

      // Fator 2: Counter para inimigos (0-40 pontos)
      let counterScore = 0;
      enemyPicks.forEach((enemyId) => {
        const matchup = hero.matchups.find((m) => m.heroId === enemyId);
        if (matchup && matchup.advantage > 0) {
          counterScore += matchup.advantage * 10;
          reasons.push(`Counter para ${matchup.heroName} (+${matchup.advantage.toFixed(1)}%)`);
        }
      });
      score += Math.min(counterScore, 40);

      // Fator 3: Sinergia com aliados (0-20 pontos)
      let synergyScore = 0;
      allyPicks.forEach((allyId) => {
        const ally = heroesData.get(allyId);
        if (!ally) return;

        // Heróis com mesmos tags têm sinergia
        const commonRoles = hero.roles.filter((r) => ally.roles.includes(r));
        if (commonRoles.length > 0) {
          synergyScore += 5;
        }
      });
      score += Math.min(synergyScore, 20);

      // Fator 4: Preenche role faltando (0-10 pontos)
      if (missingRoles.some((role) => hero.roles.includes(role))) {
        score += 10;
        reasons.push(`Preenche role: ${missingRoles.find((r) => hero.roles.includes(r))}`);
      }

      // Determinar prioridade
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (score >= 70) priority = 'high';
      else if (score >= 50) priority = 'medium';

      if (score > 30) {
        // Só sugerir se score mínimo
        suggestions.push({
          heroId,
          heroName: hero.heroName,
          score,
          reasons,
          priority,
        });
      }
    });

    // Ordenar por score e retornar top 10
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Sugere bans baseado em counters e meta
   */
  private suggestBans(
    allyPicks: number[],
    enemyPicks: number[],
    unavailable: Set<number>,
    heroesData: Map<number, HeroMatchupData>
  ): DraftSuggestion[] {
    const suggestions: DraftSuggestion[] = [];

    heroesData.forEach((hero, heroId) => {
      if (unavailable.has(heroId)) return;

      const reasons: string[] = [];
      let score = 0;

      // Fator 1: Win rate alto = meta pick (0-30 pontos)
      if (hero.winRate > 0.52) {
        score += (hero.winRate - 0.50) * 150; // 52% = 3 pontos, 54% = 6 pontos
        reasons.push(`Meta pick (${(hero.winRate * 100).toFixed(1)}% WR)`);
      }

      // Fator 2: Counter forte contra nosso time (0-50 pontos)
      let counterScore = 0;
      allyPicks.forEach((allyId) => {
        const matchup = hero.matchups.find((m) => m.heroId === allyId);
        if (matchup && matchup.advantage > 0) {
          counterScore += matchup.advantage * 15;
          reasons.push(`Counter para nossa ${matchup.heroName} (+${matchup.advantage.toFixed(1)}%)`);
        }
      });
      score += Math.min(counterScore, 50);

      // Fator 3: Sinergia com picks inimigos (0-20 pontos)
      let synergyScore = 0;
      enemyPicks.forEach((enemyId) => {
        const enemy = heroesData.get(enemyId);
        if (!enemy) return;

        // Se compartilham roles, podem ter sinergia
        const commonRoles = hero.roles.filter((r) => enemy.roles.includes(r));
        if (commonRoles.length > 1) {
          synergyScore += 7;
          reasons.push(`Sinergia com ${enemy.heroName}`);
        }
      });
      score += Math.min(synergyScore, 20);

      // Determinar prioridade
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (score >= 60) priority = 'high';
      else if (score >= 40) priority = 'medium';

      if (score > 20) {
        // Só sugerir se score mínimo
        suggestions.push({
          heroId,
          heroName: hero.heroName,
          score,
          reasons,
          priority,
        });
      }
    });

    // Ordenar por score e retornar top 8
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  /**
   * Identifica quais counters são necessários
   */
  private identifyCountersNeeded(
    enemyPicks: number[],
    heroesData: Map<number, HeroMatchupData>
  ): string[] {
    const countersNeeded: string[] = [];

    enemyPicks.forEach((enemyId) => {
      const enemy = heroesData.get(enemyId);
      if (!enemy) return;

      // Heróis com high win rate precisam de counter
      if (enemy.winRate > 0.53) {
        countersNeeded.push(`${enemy.heroName} (meta pick)`);
      }

      // Heróis com roles específicas que precisam de counter
      if (enemy.roles.includes('Carry')) {
        countersNeeded.push(`Carry inimigo: ${enemy.heroName}`);
      }
      if (enemy.roles.includes('Initiator')) {
        countersNeeded.push(`Iniciador inimigo: ${enemy.heroName}`);
      }
    });

    return countersNeeded;
  }

  /**
   * Identifica oportunidades de sinergia
   */
  private identifySynergyOpportunities(
    allyPicks: number[],
    heroesData: Map<number, HeroMatchupData>
  ): string[] {
    const opportunities: string[] = [];

    // Identificar padrões de sinergia comuns
    const hasInitiator = allyPicks.some((id) => {
      const hero = heroesData.get(id);
      return hero?.roles.includes('Initiator');
    });

    const hasDisabler = allyPicks.some((id) => {
      const hero = heroesData.get(id);
      return hero?.roles.includes('Disabler');
    });

    const hasNuker = allyPicks.some((id) => {
      const hero = heroesData.get(id);
      return hero?.roles.includes('Nuker');
    });

    if (hasInitiator && !hasNuker) {
      opportunities.push('Adicionar Nuker para combo com Initiator');
    }

    if (hasDisabler && !hasNuker) {
      opportunities.push('Adicionar Nuker para aproveitar disables');
    }

    if (allyPicks.length >= 2 && !hasInitiator) {
      opportunities.push('Time precisa de Initiator para teamfights');
    }

    return opportunities;
  }
}
