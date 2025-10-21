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

### WebSocket e Live Mode
```bash
# Live Mode está em feature/live-mode-phase-1
# WebSocket server inicia automaticamente com backend
# Path: ws://localhost:3001/ws
```

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
   - `GsiAdapter`: Normaliza payloads do Dota 2 GSI para schema interno (Live Mode)
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
   - `POST /api/gsi`: Recebe payloads do Dota 2 Game State Integration (Live Mode)
   - `GET /api/gsi/stats`: Estatísticas do Live Mode
   - **CORS habilitado** para desenvolvimento local

4. **WebSocket Layer** (`backend/src/websocket/`)
   - `LiveWebSocketServer`: Servidor WebSocket para atualizações em tempo real
   - `RoomManager`: Gerencia rooms por matchId para broadcast direcionado
   - **Path**: `/ws` no mesmo servidor HTTP (porta 3001)
   - **Auth**: Token-based authentication
   - **Heartbeat**: Ping/pong a cada 30s
   - **Rooms**: Clientes se inscrevem em matchIds para receber snapshots

5. **Frontend State** (`frontend/src/stores/`)
   - **Zustand** para state management (não Redux/Context)
   - Stores principais:
     - `useAppStore`: Estado geral (heroes, heroData, draft, config)
     - `useLiveStore`: Estado do Live Mode (snapshot, status, connection)
   - **Live Mode**: Estado separado para atualizações em tempo real do jogo
   - **Importante**: Draft context (allies/enemies) é recalculado ao adicionar/remover heróis

6. **UI Components** (`frontend/src/components/`)
   - `HeroSelector`: Seletor com busca e filtro por atributo
   - `HeroDataDisplay`: Exibe build, matchups, skills
   - `DraftPanel`: Gerencia aliados e inimigos
   - `Timers`: Sistema de timers com notificações
   - `LiveBadge`: Indicador de status do Live Mode (conectado/desconectado)
   - `LiveSetupBanner`: Instruções para configurar o GSI
   - `LiveDevTools`: Painel de debug (apenas dev mode)
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

### WebSocket em vez de Polling
- Live Mode usa WebSocket para updates em tempo real
- Mais eficiente que HTTP polling (menos overhead)
- Heartbeat mantém conexão ativa
- Auto-reconnect com exponential backoff
- Rooms permitem broadcast direcionado por matchId

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
- **Vitest** para backend e frontend
- **Coverage target**: >80% overall, >85% em módulos críticos
- Foco em: adapters, utils, recommendation engine, websocket
- Mock API calls (não fazer requests reais em testes)
- Integration tests para endpoints e WebSocket
- Test fixtures em `__fixtures__/` para payloads GSI

### Live Mode Específico
- **Deduplicação**: SHA256 hash para evitar broadcasts duplicados
- **SessionManager**: TTL de 5 minutos, cleanup automático
- **Rate Limiting**: 20 req/s no endpoint GSI
- **Auth**: Token obrigatório (GSI_AUTH_TOKEN env var)
- **Lazy Initialization**: WebSocket server só inicia quando getWsServer() é chamado
- **Graceful Shutdown**: SIGTERM handling para fechar conexões

## Live Mode (Game State Integration)

### O que é Live Mode?
Sistema que integra com o Dota 2 GSI (Game State Integration) para receber dados em tempo real durante partidas. Permite recomendações dinâmicas baseadas no estado atual do jogo.

### Arquitetura Live Mode
```
Dota 2 Client → POST /api/gsi → GsiAdapter → SessionManager → WebSocket Broadcast
                                       ↓
                                LiveSnapshot (schema canônico)
                                       ↓
                                Frontend (LiveClient + LiveStore)
```

### Componentes Principais

**Backend:**
- `GsiAdapter` (`backend/src/gsi/`): Normaliza payloads GSI → LiveSnapshot
- `SessionManager` (`backend/src/gsi/`): Gerencia sessões, deduplicação SHA256
- `LiveWebSocketServer` (`backend/src/websocket/`): WebSocket server com rooms
- `RoomManager` (`backend/src/websocket/`): Gerencia rooms por matchId

**Frontend:**
- `LiveClient` (`frontend/src/services/`): Cliente WebSocket com auto-reconnect
- `LiveStore` (`frontend/src/stores/`): Estado Zustand para Live Mode
- `RecommendationFusion`: Mescla dados live + OpenDota

### Configuração GSI

1. **Arquivo**: `.../dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg`
2. **Conteúdo**: Veja `LIVE_MODE_ARCHITECTURE.md` seção B
3. **Launch Option**: `-gamestateintegration` (Steam → Dota 2 → Propriedades)
4. **Endpoint**: `http://127.0.0.1:3001/api/gsi`

### Fluxo de Dados

1. Dota 2 envia POST a cada ~100ms + heartbeat 30s
2. Backend valida (auth, rate limit, schema)
3. GsiAdapter normaliza para LiveSnapshot
4. SessionManager deduplica por hash (evita broadcasts desnecessários)
5. WebSocket broadcast para clientes inscritos no matchId
6. Frontend atualiza UI em tempo real

### Timers Automáticos 100% (Live Mode Integration)

**O que é?**
Sistema COMPLETAMENTE automático de timers baseado no tempo do jogo (gameTime do GSI). Nenhuma intervenção manual necessária - todos os eventos importantes são calculados e exibidos automaticamente.

**Eventos Rastreados (Todos Automáticos):**
- ✅ **Bounty Runes** 💰: 0:00, 3:00, 6:00, 9:00... (a cada 3 min)
- ✅ **Power Runes** ⚡: 7:00, 14:00, 21:00... (a cada 7 min)
- ✅ **Water Runes** 💧: 2:00, 4:00, 6:00... (a cada 2 min)
- ✅ **Lotus Pool** 🪷: 7:00, 10:00, 13:00... (a cada 3 min)
- ✅ **Tormentor** 👹: 20:00, 30:00, 40:00... (a cada 10 min)
- ✅ **Outpost XP** 🏰: 10:00, 15:00, 20:00... (a cada 5 min)
- ✅ **Stack Camp** 🏕️: X:53 (a cada minuto)

**Arquitetura:**
```
GSI → LiveSnapshot (gameTime) → useGameTimers → Calcula próximos eventos → Cria timers automaticamente
                                                                                       ↓
                                                                        UI (badge "Auto" ⚡)
```

**Implementação:**
- `gameTimers.ts` (`frontend/src/utils/`): Cálculo de eventos baseado em tempo
- `useGameTimers` hook (`frontend/src/hooks/`): Monitora gameTime e cria timers
- `useAutoPicks` hook (`frontend/src/hooks/`): Detecta heróis do draft automaticamente
- Tipo `Timer` com 13 tipos de eventos diferentes
- Timers aparecem antes do spawn (pre-notification window)

**Picks Automáticos:**
- ✅ **Herói do jogador**: Detectado via `snapshot.hero.id`
- ✅ **Aliados**: Detectados via `snapshot.draftHints.allyHeroes`
- ✅ **Inimigos**: Detectados via `snapshot.draftHints.enemyHeroes`
- Preenche BuildStore automaticamente durante o jogo

**Testing:**
```bash
# 1. Rodar backend e frontend
npm run dev

# 2. Em outra aba, simular jogo completo
npx tsx scripts/test-game-timers.ts

# 3. Verificar no frontend:
# - Ative Live Mode no LiveBadge
# - Timers aparecem automaticamente conforme o tempo
# - Heróis aparecem no draft automaticamente
# - Badge "Auto" ⚡ em todos os timers
```

**Como Funciona:**
1. GSI envia `gameTime` (segundos desde início do jogo)
2. `getActiveGameEvents()` calcula quais eventos devem aparecer AGORA
3. Timer é criado X segundos antes do spawn (configurable per event)
4. Timer desaparece automaticamente após spawn
5. Próximo evento do mesmo tipo é calculado automaticamente

**Configuração de Eventos (`DOTA_EVENTS`):**
```typescript
{
  type: 'power-rune',
  firstSpawn: 420,    // 7:00
  interval: 420,      // Every 7 minutes
  preNotify: 60,      // Show 1min before
}
```

**Deduplicação:**
- Apenas um timer ativo por tipo de evento
- Timer é atualizado quando evento anterior termina
- Não há timers duplicados ou conflitantes

### Testing Live Mode

```bash
# Rodar backend
npm run dev:backend

# Em outra aba, simular GSI (mock)
# TODO: Criar mock-gsi-sender.ts quando necessário

# Verificar logs
# Backend deve mostrar: "GSI snapshot processed"
```

### Estado do Desenvolvimento

**Fases Completas (6/9):**
- ✅ Fase 1: Backend Foundation (GsiAdapter, SessionManager)
- ✅ Fase 2: API Endpoint (POST /gsi)
- ✅ Fase 3: WebSocket Server
- ✅ Fase 4: Frontend Client
- ✅ Fase 5: UI Components
- ✅ Fase 6: Recommendation Fusion

**Pendente:**
- ⏳ Fase 7: E2E Tests
- ⏳ Fase 8: Documentation
- ⏳ Fase 9: Beta Release

**Branch**: `feature/live-mode-phase-1`
**Documentos**: `LIVE_MODE_ARCHITECTURE.md`, `LIVE_MODE_IMPLEMENTATION.md`, `LIVE_MODE_PROGRESS.md`

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

## Padrões Importantes e Gotchas

### Imports no Backend (ES Modules)
- **SEMPRE** use extensão `.js` em imports TypeScript do backend
- Exemplo: `import { foo } from './bar.js'` (mesmo que o arquivo seja `bar.ts`)
- Motivo: Node.js ES modules requer extensão explícita

### WebSocket Lazy Initialization
- WebSocket server NÃO inicia automaticamente
- Use `getWsServer()` para inicializar sob demanda
- Importante para testes (não inicia em NODE_ENV=test)
- Exemplo:
  ```typescript
  import { getWsServer } from '../server.js';
  const wsServer = getWsServer(); // Inicia se ainda não iniciou
  wsServer.broadcastSnapshot(snapshot);
  ```

### Deduplicação de Snapshots
- Dota 2 envia muitos POSTs idênticos
- SessionManager usa SHA256 hash para deduplicar
- Taxa de dedup esperada: >70%
- Retorna 204 No Content se duplicado (não faz broadcast)

### Error Handling em Routes
- Sempre use try/catch em rotas async
- Fallback para cache se API OpenDota falhar
- Log estruturado com contexto (matchId, heroId, etc)
- Rate limiting automático (express-rate-limit)

### Structured Logging
- Use logger específico: `gsiLogger`, `wsLogger`, `apiLogger`
- Logs em JSON (pino)
- Pretty print em dev (pino-pretty)
- Health checks não são logados (autoLogging.ignore)

### Circular Dependencies
- WebSocket server e routes/gsi têm potencial circular dependency
- Solução: import dinâmico `const { getWsServer } = await import('../server.js')`
- Veja `routes/gsi.ts` para exemplo

## Links Úteis

- OpenDota API: https://docs.opendota.com
- Dota 2 Item IDs: https://github.com/odota/dotaconstants
- Dota 2 GSI Documentation: https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Game_State_Integration
- Patch notes: https://www.dota2.com/patches
