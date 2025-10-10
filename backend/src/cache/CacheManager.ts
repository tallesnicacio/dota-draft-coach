import NodeCache from 'node-cache';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const HEROES_CACHE_FILE = path.join(CACHE_DIR, 'heroes.json');
const DATA_CACHE_FILE = path.join(CACHE_DIR, 'heroData.json');

export class CacheManager {
  private cache: NodeCache;
  private ttl: number;
  private persistentCache: Map<string, any> = new Map();

  constructor(ttlSeconds: number = 21600) { // 6 horas padrão
    this.ttl = ttlSeconds;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: 600, // Check expired keys every 10 min
      useClones: false,
    });

    // Inicializar cache persistente
    this.initializePersistentCache();
  }

  /**
   * Inicializa cache persistente do disco
   */
  private async initializePersistentCache(): Promise<void> {
    try {
      // Garantir que o diretório existe
      await fs.mkdir(CACHE_DIR, { recursive: true });

      // Carregar cache de heróis
      try {
        const heroesData = await fs.readFile(HEROES_CACHE_FILE, 'utf-8');
        const heroes = JSON.parse(heroesData);
        this.cache.set('heroes:all', heroes, 86400); // 24h para heróis
        console.log('✅ Cache de heróis carregado do disco');
      } catch {
        console.log('ℹ️  Nenhum cache de heróis encontrado');
      }

      // Carregar cache de dados de heróis
      try {
        const dataCache = await fs.readFile(DATA_CACHE_FILE, 'utf-8');
        const data = JSON.parse(dataCache);
        for (const [key, value] of Object.entries(data)) {
          this.persistentCache.set(key, value);
          this.cache.set(key, value);
        }
        console.log(`✅ ${Object.keys(data).length} entradas de cache carregadas do disco`);
      } catch {
        console.log('ℹ️  Nenhum cache de dados encontrado');
      }
    } catch (error) {
      console.error('⚠️  Erro ao inicializar cache persistente:', error);
    }
  }

  /**
   * Gera chave de cache consistente
   */
  generateKey(hero: string | number, patch: string, mmr: number): string {
    return `hero:${hero}:patch:${patch}:mmr:${mmr}`;
  }

  /**
   * Obtém dados do cache
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, value: T, customTtl?: number): boolean {
    const result = this.cache.set(key, value, customTtl || this.ttl);

    // Salvar em cache persistente se for dados de herói ou a lista de heróis
    if (key === 'heroes:all') {
      this.saveHeroesCache(value);
    } else if (key.startsWith('hero:')) {
      this.persistentCache.set(key, value);
      this.saveDataCache();
    }

    return result;
  }

  /**
   * Salva cache de heróis no disco
   */
  private async saveHeroesCache(heroes: any): Promise<void> {
    try {
      await fs.writeFile(HEROES_CACHE_FILE, JSON.stringify(heroes, null, 2));
      console.log('💾 Cache de heróis salvo no disco');
    } catch (error) {
      console.error('⚠️  Erro ao salvar cache de heróis:', error);
    }
  }

  /**
   * Salva cache de dados no disco
   */
  private async saveDataCache(): Promise<void> {
    try {
      const data = Object.fromEntries(this.persistentCache);
      await fs.writeFile(DATA_CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('⚠️  Erro ao salvar cache de dados:', error);
    }
  }

  /**
   * Remove uma chave específica
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Limpa todo o cache
   */
  flush(): void {
    this.cache.flushAll();
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Verifica se uma chave existe
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export const cacheManager = new CacheManager(
  parseInt(process.env.CACHE_TTL || '21600')
);
