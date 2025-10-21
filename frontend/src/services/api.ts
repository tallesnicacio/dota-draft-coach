import { Hero } from '@/types/dota';

const API_BASE_URL = '/api';

// Cache de heróis para resolver nomes e imagens
let heroesCache: Hero[] = [];

// Constantes de cache localStorage
const HEROES_CACHE_KEY = 'dota2_heroes_cache';
const HEROES_CACHE_TIMESTAMP_KEY = 'dota2_heroes_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

interface BackendHero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  img?: string;
}

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
