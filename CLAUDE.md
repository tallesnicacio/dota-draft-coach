# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos Essenciais

### Desenvolvimento
```bash
# Roda backend + frontend simultaneamente
npm run dev

# Backend apenas (porta 3001)
npm run dev:backend

# Frontend apenas (porta 5173)
npm run dev:frontend

# Testes
npm test
cd backend && npm run test -- --watch  # Watch mode
```

### Build e Deploy
```bash
npm run build          # Build completo (backend + frontend)
npm start              # Produção (apenas backend serve frontend)
```

### Estrutura de Comandos
- Backend usa `tsx watch` para hot reload
- Frontend usa Vite HMR
- Monorepo com workspaces npm

## Arquitetura High-Level

### Fluxo de Dados Principal
```
OpenDota API → OpenDotaAdapter → RecommendationEngine → Cache → Frontend
                        ↓
                 Schema Interno
```

### Camadas Principais

1. **Adapter Layer** (`backend/src/adapters/`)
   - `OpenDotaAdapter`: Busca dados da API OpenDota, normaliza para schema interno
   - `RecommendationEngine`: Aplica lógica de recomendação baseada em draft context
   - **Key Insight**: Todas as APIs externas passam pelo adapter, que normaliza para o schema interno definido em `types/index.ts`

2. **Cache Layer** (`backend/src/cache/`)
   - `CacheManager`: Cache em memória com TTL de 6h por padrão
   - Chave: `hero:{id}:patch:{patch}:mmr:{mmr}`
   - **Fallback**: Se API falhar, serve cache stale com warning
   - **Retry**: Exponential backoff em 429/5xx

3. **API Layer** (`backend/src/routes/`)
   - `GET /api/heroes`: Lista heróis (cache 24h)
   - `GET /api/heroes/:id`: Dados base do herói
   - `POST /api/heroes/:id/recommendations`: Recomendações ajustadas por draft
   - **CORS habilitado** para desenvolvimento local

4. **Frontend State** (`frontend/src/stores/`)
   - **Zustand** para state management (não Redux/Context)
   - Store único: `useAppStore`
   - Estado: heroes, selectedHero, heroData, allies, enemies, patch, mmr, timers
   - **Importante**: Draft context (allies/enemies) é recalculado ao adicionar/remover heróis

5. **UI Components** (`frontend/src/components/`)
   - `HeroSelector`: Seletor com busca e filtro por atributo
   - `HeroDataDisplay`: Exibe build, matchups, skills
   - `DraftPanel`: Gerencia aliados e inimigos
   - `Timers`: Sistema de timers com notificações
   - **Mobile-first**: Bottom navigation, touch-friendly

### Sistema de Recomendações

**Lógica de Modificadores** (`RecommendationEngine.ts`):
- Analisa composição inimiga/aliada via IDs
- Aplica bônus de prioridade a itens baseado em tags (ITEM_TAGS)
- Exemplo: BKB +15% prioridade se `hasHeavyMagic`
- Gera itens situacionais dinamicamente

**Cálculo de Confiança** (`utils/confidence.ts`):
```typescript
confidence = w1*winRate + w2*popularity + w3*sampleSize + w4*freshness
```
- Pesos padrão: 0.40, 0.25, 0.20, 0.15
- Normalizado para [0, 1]

### Cache e Resilência

**Estratégia de Cache**:
1. Tenta buscar do cache (CacheManager)
2. Se miss, busca da API com retry
3. Se API falhar, serve cache stale com warning
4. Cache TTL configurável via .env (CACHE_TTL)

**Retry Logic**:
- Max 3 tentativas
- Delay: 1s * 2^retry
- Apenas em 429 (rate limit) ou 5xx

### PWA e Timers

**Service Worker** (`vite-plugin-pwa`):
- Cache de assets e API responses
- Notificações push para timers
- Funciona offline (fallback para cache)

**Timers** (`components/Timers.tsx`):
- Presets: Runa, Stack, Pull, Roshan, Glyph, Scan
- Armazenados no Zustand store
- Intervalo de 1s verifica timers ativos
- Notificação via Web Notifications API

## Decisões de Design Importantes

### Por que Zustand em vez de Redux?
- Menos boilerplate
- API mais simples
- Suficiente para escopo da app (estado pequeno)
- Performance equivalente

### Por que Cache em Memória em vez de Redis?
- Simplicidade para MVP
- Escala até ~10k usuários
- Deploy mais fácil (sem dependência externa)
- **Trade-off**: Cache não persiste entre restarts

### Por que Monorepo?
- Compartilha tipos entre frontend/backend
- Deploy conjunto mais simples
- Desenvolvimento local facilitado (npm workspaces)

### Schema Interno vs API Direto
- API OpenDota pode mudar
- Schema interno mantém contrato estável com frontend
- Facilita trocar de API no futuro (Stratz, etc)
- Adapter isola mudanças

## Padrões de Código

### Backend
- **ES Modules**: Sempre use `.js` em imports (não `.ts`)
- **Async/Await**: Preferir sobre Promises.then()
- **Error Handling**: Try/catch em todas as rotas, com fallback para cache
- **Types**: Todo export público tem type definido

### Frontend
- **Hooks**: Componentes funcionais apenas
- **Store**: Use Zustand hooks, não prop drilling
- **API**: Sempre via `apiService`, nunca fetch direto
- **Loading**: Skeletons durante carregamento, não spinners quando possível

### Testing
- **Vitest** para backend
- Foco em: adapters, utils, recommendation engine
- Mock API calls (não fazer requests reais em testes)

## Troubleshooting Comum

### Porta em Uso (EADDRINUSE)
- **Erro**: `Error: listen EADDRINUSE: address already in use :::3001`
- **Causa**: Outra instância do backend já está rodando na porta 3001
- **Solução**:
  ```bash
  # Opção 1: Use o script de diagnóstico
  ./scripts/check-ports.sh

  # Opção 2: Manual
  lsof -ti:3001        # Encontra o PID
  kill $(lsof -ti:3001) # Mata o processo
  ```
- **Prevenção**: Sempre use `npm run dev` em vez de `npm start &` para desenvolvimento

### WebSocket Connection Error
- **Erro**: `WebSocket connection error` no frontend
- **Causa Mais Comum**: Backend não está rodando ou porta 3001 em uso
- **Solução**:
  1. Verifique se o backend está rodando: `lsof -ti:3001`
  2. Se não estiver, inicie com `npm run dev`
  3. Se estiver, verifique logs do backend para outros erros
- **Teste**: Acesse `ws://localhost:3001/ws` no navegador (deve retornar 400 Bad Request, não erro de conexão)

### CORS Error
- Backend deve estar rodando na porta 3001
- Frontend proxy configurado em `vite.config.ts`
- Checar `cors()` middleware no Express

### Cache não Funcionando
- Verificar `CACHE_TTL` no .env
- Logs: CacheManager loga hits/misses
- Endpoint debug: `GET /api/cache/stats`

### API Rate Limit (429)
- Adicionar `OPEN_DOTA_API_KEY` no .env
- Backoff automático já implementado
- Cache reduz chamadas em 90%+

### Timers não Notificam
- Permissão de notificação no browser
- HTTPS necessário em produção
- Service Worker deve estar registrado

## Convenções de Commit

- feat: Nova funcionalidade
- fix: Bug fix
- refactor: Refatoração sem mudança de comportamento
- docs: Documentação
- test: Testes
- chore: Configs, deps

## Links Úteis

- OpenDota API: https://docs.opendota.com
- Dota 2 Item IDs: https://github.com/odota/dotaconstants
- Patch notes: https://www.dota2.com/patches
