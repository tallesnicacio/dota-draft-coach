import { Hero, HeroBuild, MMRBucket, Patch } from '@/types/dota';
import { getItemInfo } from '@/constants/items';

const API_BASE_URL = '/api';

// Cache de heróis para resolver nomes e imagens
let heroesCache: Hero[] = [];

// Constantes de cache localStorage
const HEROES_CACHE_KEY = 'dota2_heroes_cache';
const HEROES_CACHE_TIMESTAMP_KEY = 'dota2_heroes_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

interface DraftContext {
  allies: number[];
  enemies: number[];
}

interface BackendHero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  img?: string;
}

interface BackendHeroBuild {
  hero: string;
  heroId: number;
  patch: string;
  mmr: number;
  coreBuild: {
    starting: Array<{ itemId: number; itemName: string; priority: number; pickRate: number }>;
    early: Array<{ itemId: number; itemName: string; priority: number; pickRate: number }>;
    mid: Array<{ itemId: number; itemName: string; priority: number; pickRate: number }>;
    situational: Array<{ itemId: number; itemName: string; priority: number; pickRate: number }>;
    luxury?: Array<{ itemId: number; itemName: string; priority: number; pickRate: number }>;
  };
  skillOrder: {
    levels: number[];
    talents: Array<{
      level: number;
      option: string;
      description: string;
      pickRate: number;
    }>;
    reasoning: string;
  };
  matchups: {
    countersToMe: Array<{
      heroId: number;
      heroName: string;
      advantage: number;
      sampleSize: number;
      reasoning: string;
    }>;
    goodVs: Array<{
      heroId: number;
      heroName: string;
      advantage: number;
      sampleSize: number;
      reasoning: string;
    }>;
    synergies: Array<any>;
  };
  indicators: {
    winRate: number;
    popularity: number;
    sampleSize: number;
    lastUpdated: string;
    confidence: number;
  };
}

// Mapear MMR bucket para valor numérico
const mmrBucketToValue = (bucket: MMRBucket): number => {
  switch (bucket) {
    case 'Herald-Crusader': return 1000;
    case 'Archon-Legend': return 2500;
    case 'Ancient-Divine': return 4000;
    case 'Immortal': return 6000;
    default: return 3000;
  }
};

// Converter atributo do backend para formato do frontend
const convertAttribute = (attr: string): 'str' | 'agi' | 'int' | 'universal' => {
  switch (attr.toLowerCase()) {
    case 'str':
    case 'strength': return 'str';
    case 'agi':
    case 'agility': return 'agi';
    case 'int':
    case 'intelligence': return 'int';
    default: return 'universal';
  }
};

// Converter Hero do backend para formato do frontend
const convertHero = (backendHero: BackendHero): Hero => {
  // Extrair o nome limpo do herói do campo name (remove "npc_dota_hero_")
  const heroName = backendHero.name.replace('npc_dota_hero_', '');

  return {
    id: backendHero.id.toString(),
    name: backendHero.name,
    displayName: backendHero.localized_name,
    image: backendHero.img && backendHero.img.startsWith('http')
      ? backendHero.img
      : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`,
    primaryAttribute: convertAttribute(backendHero.primary_attr),
  };
};

// Helper para buscar herói por ID no cache
const getHeroById = (heroId: number): Hero | undefined => {
  return heroesCache.find(h => h.id === heroId.toString());
};

// Converter Build do backend para formato do frontend
const convertBuild = (backendBuild: BackendHeroBuild): HeroBuild => {
  // Extrair nome do herói para construir URL da imagem
  const heroName = backendBuild.hero.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

  // Converter skill order: levels para sequence de skills
  const skillSequence = backendBuild.skillOrder.levels.map(level => {
    // 1 = Q, 2 = W, 3 = E, 4 = R
    const skillMap: { [key: number]: string } = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
    return skillMap[level] || 'Q';
  });

  // Converter talents para array de números (níveis onde escolhe talents)
  const talents = backendBuild.skillOrder.talents.map(t => t.level);

  // Converter items usando o mapeamento
  const convertItems = (items: Array<{ itemId: number; itemName: string }>, phase: string) => {
    return items.map(item => {
      const itemInfo = getItemInfo(item.itemId);
      return itemInfo.displayName;
    });
  };

  // Converter matchups com imagens corretas dos heróis
  const convertMatchup = (heroId: number, backendHeroName: string) => {
    const hero = getHeroById(heroId);

    // Se encontrou no cache, usa os dados do cache (nome e imagem corretos)
    if (hero) {
      console.log(`✅ Herói ${heroId} encontrado no cache: ${hero.displayName}`);
      return {
        heroName: hero.displayName,
        heroImage: hero.image,
      };
    }

    // Fallback: se não encontrou no cache, usa o nome do backend
    // (mas provavelmente será "Hero 93", então a imagem falhará)
    console.warn(`⚠️ Herói ${heroId} não encontrado no cache. Nome do backend: ${backendHeroName}. Cache tem ${heroesCache.length} heróis.`);
    return {
      heroName: backendHeroName,
      heroImage: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/default.png`,
    };
  };

  return {
    hero: backendBuild.hero,
    heroImage: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`,
    patch: backendBuild.patch as Patch,
    mmrBucket: 'Ancient-Divine', // Será sobrescrito pelo contexto
    coreBuild: {
      starting: convertItems(backendBuild.coreBuild.starting, 'starting'),
      early: convertItems(backendBuild.coreBuild.early, 'early'),
      mid: convertItems(backendBuild.coreBuild.mid, 'mid'),
      situational: [
        ...convertItems(backendBuild.coreBuild.situational || [], 'situational'),
        ...convertItems(backendBuild.coreBuild.luxury || [], 'luxury'),
      ],
    },
    skillOrder: {
      sequence: skillSequence,
      talents: talents,
    },
    matchups: {
      countersToMe: backendBuild.matchups.countersToMe.map(m => {
        const { heroName, heroImage } = convertMatchup(m.heroId, m.heroName);
        return {
          hero: heroName,
          heroImage,
          winRateDelta: m.advantage, // Já é negativo para counters
          note: m.reasoning,
        };
      }),
      goodVs: backendBuild.matchups.goodVs.map(m => {
        const { heroName, heroImage } = convertMatchup(m.heroId, m.heroName);
        return {
          hero: heroName,
          heroImage,
          winRateDelta: m.advantage,
          note: m.reasoning,
        };
      }),
      synergies: backendBuild.matchups.synergies.map(s => {
        const { heroName, heroImage } = convertMatchup(s.heroId, s.heroName || 'Unknown');
        return {
          hero: heroName,
          heroImage,
          note: s.reasoning || 'Boa sinergia',
        };
      }),
    },
    confidence: backendBuild.indicators.confidence,
    sampleSize: backendBuild.indicators.sampleSize,
    lastUpdated: backendBuild.indicators.lastUpdated,
  };
};

export const apiService = {
  /**
   * Busca lista de todos os heróis (com cache localStorage)
   */
  async getHeroes(): Promise<Hero[]> {
    try {
      // Verificar cache local primeiro
      const cached = localStorage.getItem(HEROES_CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(HEROES_CACHE_TIMESTAMP_KEY);

      if (cached && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('✅ Heróis carregados do cache local');
          heroesCache = JSON.parse(cached);
          return heroesCache;
        }
      }

      // Buscar da API se cache expirou ou não existe
      console.log('🌐 Buscando heróis da API...');
      const response = await fetch(`${API_BASE_URL}/heroes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: BackendHero[] = await response.json();
      const heroes = data.map(convertHero);

      // Salvar no cache local e memória
      heroesCache = heroes;
      localStorage.setItem(HEROES_CACHE_KEY, JSON.stringify(heroes));
      localStorage.setItem(HEROES_CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('💾 Heróis salvos no cache local');

      return heroes;
    } catch (error) {
      console.error('Erro ao buscar heróis:', error);

      // Tentar usar cache mesmo que expirado em caso de erro
      const cached = localStorage.getItem(HEROES_CACHE_KEY);
      if (cached) {
        console.log('⚠️  Usando cache expirado devido a erro na API');
        heroesCache = JSON.parse(cached);
        return heroesCache;
      }

      throw error;
    }
  },

  /**
   * Busca dados de um herói específico
   */
  async getHeroData(
    heroId: string,
    patch: Patch,
    mmrBucket: MMRBucket
  ): Promise<HeroBuild> {
    try {
      const mmr = mmrBucketToValue(mmrBucket);
      console.log(`Buscando dados do herói ${heroId} (patch: ${patch}, mmr: ${mmr})`);

      // Garantir que o cache de heróis esteja populado
      if (heroesCache.length === 0) {
        console.log('Cache de heróis vazio, buscando lista de heróis...');
        await this.getHeroes();
      }

      const response = await fetch(
        `${API_BASE_URL}/heroes/${heroId}?patch=${patch}&mmr=${mmr}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendHeroBuild = await response.json();
      console.log('Dados recebidos do backend:', data);

      const build = convertBuild(data);
      build.mmrBucket = mmrBucket;
      build.patch = patch;

      console.log('Build convertida:', build);
      return build;
    } catch (error) {
      console.error('Erro ao buscar dados do herói:', error);
      throw error;
    }
  },

  /**
   * Busca recomendações ajustadas pelo draft context
   */
  async getRecommendations(
    heroId: string,
    patch: Patch,
    mmrBucket: MMRBucket,
    allies: Hero[],
    enemies: Hero[]
  ): Promise<HeroBuild> {
    try {
      const mmr = mmrBucketToValue(mmrBucket);
      const context: DraftContext = {
        allies: allies.map(h => parseInt(h.id)),
        enemies: enemies.map(h => parseInt(h.id)),
      };

      // Garantir que o cache de heróis esteja populado
      if (heroesCache.length === 0) {
        console.log('Cache de heróis vazio, buscando lista de heróis...');
        await this.getHeroes();
      }

      const response = await fetch(
        `${API_BASE_URL}/heroes/${heroId}/recommendations?patch=${patch}&mmr=${mmr}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(context),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendHeroBuild = await response.json();
      const build = convertBuild(data);
      build.mmrBucket = mmrBucket;
      build.patch = patch;

      return build;
    } catch (error) {
      console.error('Erro ao buscar recomendações:', error);
      throw error;
    }
  },

  /**
   * Health check do backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('/health');
      return response.ok;
    } catch (error) {
      console.error('Backend health check falhou:', error);
      return false;
    }
  },
};
