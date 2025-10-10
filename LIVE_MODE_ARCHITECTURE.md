# Live Mode Architecture - Dota 2 Coach GSI Integration

**Documento:** Arquitetura e Especificações Técnicas
**Versão:** 1.0.0
**Data:** 2025-10-10
**Status:** 🟡 AGUARDANDO APROVAÇÃO
**Arquiteto:** Claude Code + Talles Nicacio

---

## Índice

- [A. Diagrama Textual do Fluxo](#a-diagrama-textual-do-fluxo)
- [B. Especificação do .cfg](#b-especificação-do-cfg)
- [C. Contrato da Rota /gsi](#c-contrato-da-rota-gsi)
- [D. Contrato do WebSocket /ws/live](#d-contrato-do-websocket-wslive)
- [E. Tabela de Mapeamento GSI → Schema](#e-tabela-de-mapeamento-gsi--schema)
- [F. Plano de Testes](#f-plano-de-testes)
- [G. Checklist de Readiness](#g-checklist-de-readiness)
- [H. Guia de Troubleshooting](#h-guia-de-troubleshooting)
- [I. Plano de Rollout](#i-plano-de-rollout)

---

# A. Diagrama Textual do Fluxo

## Visão Geral do Live Mode

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOTA 2 CLIENT                                  │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  gamestate_integration_coach.cfg                              │      │
│  │  - URI: http://127.0.0.1:53000/gsi                           │      │
│  │  - Auth Token: COACH_LOCAL_SECRET                            │      │
│  │  - Throttle: 100ms                                           │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│                              │ HTTP POST (JSON payload)                │
│                              │ Every 100ms + Heartbeat 30s             │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND - Express Server (Port 3001)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  POST /gsi Endpoint                                        │        │
│  │  ┌─────────────────────────────────────────────────┐      │        │
│  │  │ 1. Auth Middleware                               │      │        │
│  │  │    - Validate auth.token === COACH_LOCAL_SECRET │      │        │
│  │  │    - Check IP === 127.0.0.1 (loopback only)     │      │        │
│  │  │    - Optional: HMAC signature validation        │      │        │
│  │  │    ❌ 401 if invalid                             │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 2. Rate Limiter                                 │      │        │
│  │  │    - Max 20 req/sec per IP                      │      │        │
│  │  │    - Prevent DoS on loopback                    │      │        │
│  │  │    ❌ 429 if exceeded                            │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 3. Content-Type Validator                       │      │        │
│  │  │    - Must be application/json                   │      │        │
│  │  │    ❌ 415 if invalid                             │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 4. Payload Validator                            │      │        │
│  │  │    - Check required fields (provider, map...)   │      │        │
│  │  │    - Schema validation (Zod)                    │      │        │
│  │  │    ❌ 422 if malformed                           │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 5. GsiAdapter.normalize()                       │      │        │
│  │  │    - Extract relevant fields                    │      │        │
│  │  │    - Map to canonical schema                    │      │        │
│  │  │    - Enrich with metadata (timestamp, version)  │      │        │
│  │  │    Returns: LiveSnapshot                        │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 6. SessionManager.updateSession()               │      │        │
│  │  │    - Get/create session by matchId + steamId    │      │        │
│  │  │    - Compute hash of snapshot                   │      │        │
│  │  │    - Compare with last hash (dedup)             │      │        │
│  │  │    - If same: return 204 (no broadcast)         │      │        │
│  │  │    - If different: continue                     │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 7. DeltaCompressor (optional)                   │      │        │
│  │  │    - Compute diff from previous snapshot        │      │        │
│  │  │    - Only send changed fields                   │      │        │
│  │  │    - Reduce WS bandwidth                        │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │  ┌─────────────────────▼──────────────────────────┐      │        │
│  │  │ 8. EventBus.emit('snapshot', data)              │      │        │
│  │  │    - Internal pub/sub                           │      │        │
│  │  │    - Decouples /gsi from WS                     │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │                         │                                  │        │
│  │                         ▼                                  │        │
│  │                    Response 200 OK                         │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  WebSocket Server (ws://127.0.0.1:3001/ws/live)           │        │
│  │  ┌─────────────────────────────────────────────────┐      │        │
│  │  │ On Connection                                    │      │        │
│  │  │  - Add client to pool                           │      │        │
│  │  │  - Send initial handshake message               │      │        │
│  │  │  - Subscribe to EventBus                        │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │  ┌─────────────────────────────────────────────────┐      │        │
│  │  │ On EventBus.emit('snapshot')                    │      │        │
│  │  │  - Broadcast to all connected clients           │      │        │
│  │  │  - Throttle: max 1 message / 100ms per client   │      │        │
│  │  │  - If client slow: drop old messages (backpressure) │  │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  │  ┌─────────────────────────────────────────────────┐      │        │
│  │  │ Heartbeat (every 5s)                            │      │        │
│  │  │  - Send ping to all clients                     │      │        │
│  │  │  - Expect pong within 3s                        │      │        │
│  │  │  - Disconnect if no pong                        │      │        │
│  │  └─────────────────────────────────────────────────┘      │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  SessionManager (in-memory)                                │        │
│  │  - Map<sessionId, LiveSession>                            │        │
│  │  - TTL: 5 minutes of inactivity                           │        │
│  │  - Cleanup: every 60s                                     │        │
│  │  - Metrics: active_sessions, total_events, dedup_hits     │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │  Observability                                             │        │
│  │  - Structured logs (pino): matchId, steamId, eventType     │        │
│  │  - Metrics: gsi_events_total, ws_clients, latency_ms      │        │
│  │  - Health endpoint: GET /health/live                       │        │
│  └────────────────────────────────────────────────────────────┘        │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   │ WebSocket (JSON messages)
                                   │
┌──────────────────────────────────▼───────────────────────────────────────┐
│                    FRONTEND - React App (Port 5173)                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  LiveClient Service (services/liveClient.ts)              │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ - Connect to ws://127.0.0.1:3001/ws/live        │      │         │
│  │  │ - Auto-reconnect with exponential backoff       │      │         │
│  │  │ - Handle: snapshot, heartbeat, error messages   │      │         │
│  │  │ - Emit events to LiveStore                      │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  └────────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  LiveStore (Zustand)                                       │         │
│  │  State:                                                    │         │
│  │    - enabled: boolean                                      │         │
│  │    - status: 'disconnected' | 'connecting' | 'connected'   │         │
│  │    - snapshot: LiveSnapshot | null                         │         │
│  │    - matchId: string | null                                │         │
│  │    - lastUpdate: timestamp                                 │         │
│  │    - reliability: 'high' | 'medium' | 'low'                │         │
│  │  Actions:                                                  │         │
│  │    - updateSnapshot(snapshot)                              │         │
│  │    - setStatus(status)                                     │         │
│  │    - toggle()                                              │         │
│  │    - reset()                                               │         │
│  └────────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  RecommendationFusion                                      │         │
│  │  mergeLiveWithRecommendations(live, draft, patch, mmr)    │         │
│  │  - Combine live snapshot with OpenDota data                │         │
│  │  - Adjust item priorities based on live context            │         │
│  │  - Example: enemy picked Silencer → elevate BKB priority   │         │
│  │  - Example: low HP → suggest survival items                │         │
│  │  - Returns: EnhancedBuild                                  │         │
│  └────────────────────────────────────────────────────────────┘         │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  UI Components                                             │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ LiveBadge (top bar)                             │      │         │
│  │  │  - Shows "🔴 LIVE" when connected               │      │         │
│  │  │  - Timestamp of last update                     │      │         │
│  │  │  - Reliability indicator                        │      │         │
│  │  │  - Toggle button (enable/disable)               │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ BuildPanel (with live overrides)                │      │         │
│  │  │  - Highlight owned items (green border)         │      │         │
│  │  │  - Show gold needed for next item               │      │         │
│  │  │  - Gray out if can't afford                     │      │         │
│  │  │  - Badge "situational" if draftHints suggest    │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ SkillsPanel (with live levels)                  │      │         │
│  │  │  - Show current skill levels                    │      │         │
│  │  │  - Dim cooldowns (gray if on CD)                │      │         │
│  │  │  - Suggest next skill based on game phase       │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ Timers (with live clock)                        │      │         │
│  │  │  - Sync with map.clockTime                      │      │         │
│  │  │  - Auto-calculate next rune, stack, Roshan      │      │         │
│  │  │  - Push notifications 30s before event          │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ MatchupsPanel (partial draft)                   │      │         │
│  │  │  - Show detected enemies from GSI               │      │         │
│  │  │  - Update counters as draft unfolds             │      │         │
│  │  │  - Limitation: only visible enemies             │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  │  ┌─────────────────────────────────────────────────┐      │         │
│  │  │ LiveSetupBanner (if not configured)             │      │         │
│  │  │  - "How to enable Live Mode"                    │      │         │
│  │  │  - Step-by-step instructions                    │      │         │
│  │  │  - Link to LIVE_MODE_SETUP.md                   │      │         │
│  │  │  - Diagnostic: port reachable? heartbeat ok?    │      │         │
│  │  └─────────────────────────────────────────────────┘      │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  Persistence (SessionStorage with TTL)                     │         │
│  │  - Key: "dota2coach:live:snapshot"                        │         │
│  │  - TTL: 60 seconds                                         │         │
│  │  - Rehydrate on page reload if fresh                       │         │
│  │  - Clear on match end or disconnect                        │         │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │  DevTools Panel (debug mode)                               │         │
│  │  - Packets per second                                      │         │
│  │  - Last heartbeat timestamp                                │         │
│  │  - Fields received (collapsible JSON)                      │         │
│  │  - Connection status history                               │         │
│  │  - Manual reconnect button                                 │         │
│  └────────────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados Resumido

1. **Dota 2 Client** envia POST para `/gsi` a cada ~100ms + heartbeat 30s
2. **Backend valida** auth, rate limit, content-type, payload
3. **GsiAdapter** normaliza payload GSI → LiveSnapshot canônico
4. **SessionManager** deduplica por hash (evita broadcasts idênticos)
5. **EventBus** emite evento `snapshot` internamente
6. **WebSocket Server** escuta EventBus e faz broadcast para clientes conectados
7. **Frontend LiveClient** recebe via WS e atualiza LiveStore (Zustand)
8. **RecommendationFusion** combina live + OpenDota para build enriquecida
9. **UI Components** reagem ao LiveStore e exibem dados em tempo real

---

# B. Especificação do .cfg

## Arquivo de Configuração GSI

### Nome do Arquivo
```
gamestate_integration_coach.cfg
```

### Localização por Sistema Operacional

**Windows:**
```
C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_coach.cfg
```

**Linux (Steam):**
```
~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg
```
ou
```
~/.local/share/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg
```

**macOS:**
```
~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg
```

### Conteúdo Completo do Arquivo

```cfg
"Dota2 Coach Live"
{
  "uri"        "http://127.0.0.1:53000/gsi"
  "timeout"    "5.0"
  "buffer"     "0.1"
  "throttle"   "0.1"
  "heartbeat"  "30.0"
  "data"
  {
    "provider"  "1"
    "map"       "1"
    "player"    "1"
    "hero"      "1"
    "abilities" "1"
    "items"     "1"
    "draft"     "1"
    "buildings" "0"
    "wearables" "0"
  }
  "auth"
  {
    "token" "COACH_LOCAL_SECRET"
  }
}
```

### Explicação dos Campos

#### Identificador
```
"Dota2 Coach Live"
```
- Nome único da integração
- Aparece nos logs do Dota 2
- Deve ser único por integração

#### URI
```
"uri" "http://127.0.0.1:53000/gsi"
```
- Endpoint HTTP que receberá os POSTs
- **IMPORTANTE:** Deve ser localhost (127.0.0.1)
- Porta: 53000 (customizável via env var)
- Path: `/gsi`
- Não use HTTPS (não suportado pelo GSI)

#### Timeout
```
"timeout" "5.0"
```
- Tempo máximo (segundos) que o Dota espera resposta HTTP
- Recomendado: 3.0–5.0 segundos
- Se exceder: Dota loga erro mas continua enviando

#### Buffer
```
"buffer" "0.1"
```
- Tempo (segundos) que o Dota aguarda antes de enviar mudanças acumuladas
- Menor valor = mais responsivo, mais POSTs
- Recomendado: 0.1 (100ms)

#### Throttle
```
"throttle" "0.1"
```
- Intervalo mínimo (segundos) entre POSTs consecutivos
- Evita spam em mudanças rápidas
- Recomendado: 0.1–0.2 (100–200ms)

#### Heartbeat
```
"heartbeat" "30.0"
```
- Intervalo (segundos) para enviar POST mesmo sem mudanças
- Usado para detectar se servidor está vivo
- Recomendado: 30.0 segundos
- Backend deve resetar timeout ao receber heartbeat

#### Data Flags (0 = desabilitado, 1 = habilitado)

```
"provider"  "1"   // Info do provedor (nome, appid, version, timestamp)
"map"       "1"   // Estado do mapa (tempo, fase, dire/radiant, win_team)
"player"    "1"   // Info do jogador (steamid, name, activity, kills, deaths, gold, etc.)
"hero"      "1"   // Info do herói (id, name, level, xp, health, mana, alive, respawn, buffs, debuffs)
"abilities" "1"   // Habilidades (id, level, can_cast, passive, cooldown, ultimate)
"items"     "1"   // Itens em slots (id, name, can_cast, cooldown, passive, charges)
"draft"     "1"   // Draft info (pick order, teams) - limitado se não é observer
"buildings" "0"   // Estado de torres/quartéis (não usado, desabilitado para performance)
"wearables" "0"   // Cosméticos (não usado)
```

**Por que desabilitamos buildings/wearables?**
- Reduz tamanho do payload (~30–40%)
- Não são relevantes para nossas recomendações
- Melhor performance

#### Auth Token
```
"auth"
{
  "token" "COACH_LOCAL_SECRET"
}
```
- Token de autenticação enviado em todo POST
- **IMPORTANTE:** Deve ser o mesmo configurado no backend (env var `GSI_AUTH_TOKEN`)
- Recomendado: string aleatória longa (min 32 chars)
- Geração sugerida: `openssl rand -hex 32`
- **Segurança:** Mesmo sendo local, previne abusos de outros apps locais

### Ativação no Dota 2

#### Launch Option (obrigatório para algumas versões)
```
-gamestateintegration
```

**Como adicionar:**
1. Steam → Biblioteca → Dota 2 (botão direito) → Propriedades
2. Opções de Inicialização
3. Adicionar: `-gamestateintegration`
4. Fechar e reiniciar Dota 2

**Nota:** Versões recentes do Dota podem não precisar desta flag, mas recomendamos sempre incluir.

### Verificação da Instalação

1. **Arquivo criado corretamente?**
   ```bash
   # Linux/Mac
   ls -la ~/.steam/steam/steamapps/common/dota\ 2\ beta/game/dota/cfg/gamestate_integration/

   # Windows (PowerShell)
   dir "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\"
   ```

2. **Sintaxe correta?**
   - Chaves `{` `}` balanceadas
   - Todas as strings entre aspas `"`
   - Valores numéricos sem aspas (exceto quando string)

3. **Backend rodando?**
   ```bash
   curl http://127.0.0.1:53000/health/live
   # Deve retornar: {"status":"ok","gsi_enabled":true}
   ```

4. **Testar no Dota:**
   - Abrir Dota 2
   - Entrar em partida de demonstração (hero demo)
   - Verificar logs do backend: deve receber POSTs

### Limitações por Contexto

**Como Jogador (player perspective):**
- ✅ Vê: Seu herói, seus itens, seus stats, tempo de mapa
- ✅ Vê: Inimigos visíveis no mapa (parcial)
- ❌ Não vê: Itens/levels de inimigos na fog of war
- ❌ Não vê: Draft completo (apenas picks visíveis)

**Como Observador (observer/caster):**
- ✅ Vê: Todos os heróis, itens, levels
- ✅ Vê: Draft completo
- ✅ Vê: Roshan timer, wards
- ✅ Vê: Fog of war para ambos times

**Recomendação:**
Para testing inicial, use **Hero Demo** (player perspective).
Para testing completo, use **Custom Lobby** como observador.

### Security Notes

1. **Bind apenas em loopback:**
   Backend deve escutar em `127.0.0.1`, nunca `0.0.0.0`

2. **Token obrigatório:**
   Backend deve rejeitar POSTs sem token válido (401)

3. **Rate limiting:**
   Max 20 req/s do loopback (proteção contra bugs/loops)

4. **Opcional - HMAC:**
   Para paranoia extra, backend pode verificar assinatura HMAC do corpo:
   ```
   X-GSI-Signature: sha256=<hmac_hex>
   ```
   Usando shared secret (mesmo token).

---

# C. Contrato da Rota /gsi

## Endpoint: `POST /gsi`

### Descrição
Recebe payloads do Dota 2 Game State Integration, valida, normaliza e propaga para clientes WebSocket.

### Base URL
```
http://127.0.0.1:53000/gsi
```
- Protocolo: HTTP (não HTTPS)
- Host: 127.0.0.1 (loopback obrigatório)
- Porta: 53000 (configurável via `GSI_PORT` env var)

### Headers Obrigatórios

#### Request Headers (enviados pelo Dota 2)
```http
Content-Type: application/json
Content-Length: <tamanho_do_body>
```

#### Request Headers (opcionais, custom)
```http
X-GSI-Signature: sha256=<hmac_hex>
```
- Assinatura HMAC-SHA256 do corpo
- Secret: mesmo valor de `auth.token` do .cfg
- Formato: `sha256=<hex_digest>`
- Se presente, backend deve validar

### Autenticação

#### Via Body (padrão)
```json
{
  "auth": {
    "token": "COACH_LOCAL_SECRET"
  },
  ...
}
```
- Backend compara com env var `GSI_AUTH_TOKEN`
- Deve ser exact match (case-sensitive)

#### Validação no Backend
```typescript
if (req.body.auth?.token !== process.env.GSI_AUTH_TOKEN) {
  return res.status(401).json({
    error: 'unauthorized',
    message: 'Invalid GSI auth token'
  });
}
```

### Rate Limiting

**Limite:** 20 requisições/segundo por IP

**Headers de Resposta:**
```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1696950065
```

**Resposta em caso de excesso (HTTP 429):**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Max 20 requests per second",
  "retry_after_seconds": 1
}
```

### Request Body - Estrutura GSI

#### Exemplo Mínimo (Heartbeat)
```json
{
  "auth": {
    "token": "COACH_LOCAL_SECRET"
  },
  "provider": {
    "name": "Dota 2",
    "appid": 570,
    "version": 53,
    "timestamp": 1696950000
  }
}
```

#### Exemplo Completo (In-Game)
```json
{
  "auth": {
    "token": "COACH_LOCAL_SECRET"
  },
  "provider": {
    "name": "Dota 2",
    "appid": 570,
    "version": 53,
    "timestamp": 1696950123
  },
  "map": {
    "name": "start",
    "matchid": "7890123456",
    "game_time": 754,
    "clock_time": 734,
    "daytime": true,
    "nightstalker_night": false,
    "game_state": "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
    "paused": false,
    "win_team": "none",
    "customgamename": "",
    "ward_purchase_cooldown": 0
  },
  "player": {
    "steamid": "76561198012345678",
    "accountid": "12345678",
    "name": "Player Name",
    "activity": "playing",
    "kills": 5,
    "deaths": 2,
    "assists": 8,
    "last_hits": 87,
    "denies": 12,
    "kill_streak": 2,
    "commands_issued": 1542,
    "kill_list": {
      "npc_dota_hero_antimage": 1,
      "npc_dota_hero_axe": 1
    },
    "team_name": "radiant",
    "gold": 2450,
    "gold_reliable": 1200,
    "gold_unreliable": 1250,
    "gold_from_hero_kills": 850,
    "gold_from_creep_kills": 3200,
    "gold_from_income": 1100,
    "gold_from_shared": 50,
    "gpm": 512,
    "xpm": 628
  },
  "hero": {
    "xpos": -1254,
    "ypos": 3456,
    "id": 46,
    "name": "npc_dota_hero_templar_assassin",
    "level": 12,
    "xp": 8420,
    "alive": true,
    "respawn_seconds": 0,
    "buyback_cost": 850,
    "buyback_cooldown": 0,
    "health": 1420,
    "max_health": 1680,
    "health_percent": 84,
    "mana": 512,
    "max_mana": 780,
    "mana_percent": 65,
    "silenced": false,
    "stunned": false,
    "disarmed": false,
    "magicimmune": false,
    "hexed": false,
    "muted": false,
    "break": false,
    "smoked": false,
    "has_debuff": false,
    "talent_1": false,
    "talent_2": false,
    "talent_3": true,
    "talent_4": false,
    "talent_5": false,
    "talent_6": false,
    "talent_7": false,
    "talent_8": false
  },
  "abilities": {
    "ability0": {
      "name": "templar_assassin_refraction",
      "level": 3,
      "can_cast": true,
      "passive": false,
      "ability_active": false,
      "cooldown": 0,
      "ultimate": false
    },
    "ability1": {
      "name": "templar_assassin_meld",
      "level": 2,
      "can_cast": true,
      "passive": false,
      "ability_active": false,
      "cooldown": 3,
      "ultimate": false
    },
    "ability2": {
      "name": "templar_assassin_psi_blades",
      "level": 4,
      "can_cast": false,
      "passive": true,
      "ability_active": false,
      "cooldown": 0,
      "ultimate": false
    },
    "ability3": {
      "name": "templar_assassin_trap",
      "level": 2,
      "can_cast": true,
      "passive": false,
      "ability_active": false,
      "cooldown": 0,
      "ultimate": true,
      "charges": 3,
      "max_charges": 3
    },
    "ability4": {
      "name": "plus_high_five",
      "level": 0,
      "can_cast": false,
      "passive": false,
      "ability_active": false,
      "cooldown": 0,
      "ultimate": false
    },
    "ability5": {
      "name": "empty",
      "level": 0
    }
  },
  "items": {
    "slot0": {
      "name": "item_power_treads",
      "purchaser": 0,
      "can_cast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 0
    },
    "slot1": {
      "name": "item_desolator",
      "purchaser": 0,
      "can_cast": false,
      "cooldown": 0,
      "passive": true,
      "charges": 0
    },
    "slot2": {
      "name": "item_blink",
      "purchaser": 0,
      "can_cast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 0
    },
    "slot3": {
      "name": "item_black_king_bar",
      "purchaser": 0,
      "can_cast": true,
      "cooldown": 28,
      "passive": false,
      "charges": 0
    },
    "slot4": {
      "name": "item_tpscroll",
      "purchaser": 0,
      "can_cast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 1
    },
    "slot5": {
      "name": "empty"
    },
    "stash0": {
      "name": "item_ultimate_orb",
      "purchaser": 0
    },
    "stash1": {
      "name": "empty"
    },
    "stash2": {
      "name": "empty"
    },
    "stash3": {
      "name": "empty"
    },
    "stash4": {
      "name": "empty"
    },
    "stash5": {
      "name": "empty"
    },
    "teleport0": {
      "name": "item_tpscroll",
      "purchaser": 0,
      "charges": 1
    },
    "neutral0": {
      "name": "item_grove_bow",
      "purchaser": 0,
      "passive": false,
      "can_cast": false,
      "cooldown": 0,
      "charges": 0
    }
  },
  "draft": {
    "activeteam": 0,
    "pick": true,
    "activeteam_time_remaining": 30,
    "radiant_bonus_time": 130,
    "dire_bonus_time": 130,
    "team2": {
      "home_team": false,
      "pick0_id": 1,
      "pick0_class": "npc_dota_hero_antimage",
      "pick1_id": 5,
      "pick1_class": "npc_dota_hero_crystal_maiden",
      "pick2_id": 0,
      "pick2_class": "npc_dota_hero_none"
    },
    "team3": {
      "home_team": true,
      "pick0_id": 46,
      "pick0_class": "npc_dota_hero_templar_assassin",
      "pick1_id": 93,
      "pick1_class": "npc_dota_hero_slark",
      "pick2_id": 0,
      "pick2_class": "npc_dota_hero_none"
    }
  }
}
```

### Validações

#### 1. Schema Validation (Zod)
```typescript
const GsiPayloadSchema = z.object({
  auth: z.object({
    token: z.string().min(1)
  }),
  provider: z.object({
    name: z.string(),
    appid: z.number(),
    version: z.number(),
    timestamp: z.number()
  }),
  map: z.object({
    matchid: z.string().optional(),
    game_time: z.number().optional(),
    clock_time: z.number().optional(),
    daytime: z.boolean().optional(),
    game_state: z.string().optional(),
    paused: z.boolean().optional()
  }).optional(),
  player: z.object({
    steamid: z.string().optional(),
    accountid: z.string().optional(),
    name: z.string().optional(),
    activity: z.string().optional(),
    gold: z.number().optional(),
    team_name: z.enum(['radiant', 'dire']).optional()
  }).optional(),
  hero: z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    level: z.number().optional(),
    health: z.number().optional(),
    mana: z.number().optional()
  }).optional(),
  abilities: z.record(z.any()).optional(),
  items: z.record(z.any()).optional(),
  draft: z.any().optional()
});
```

#### 2. Business Rules
- Se `map.matchid` ausente → considerar heartbeat (não propagar WS)
- Se `hero.id` ausente ou 0 → jogador não escolheu herói (ignorar ou enviar partial)
- Se `map.game_state !== "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS"` → pre-game ou post-game (opcional enviar)

### Response Codes

#### 200 OK - Processado com sucesso
```json
{
  "status": "ok",
  "session_id": "7890123456:76561198012345678",
  "snapshot_hash": "a3f5e8d2...",
  "broadcast": true
}
```

#### 204 No Content - Deduplicado (sem mudança)
```
(corpo vazio)
```
- Snapshot idêntico ao anterior
- Não fez broadcast WS
- Economiza processamento

#### 401 Unauthorized - Token inválido
```json
{
  "error": "unauthorized",
  "message": "Invalid GSI auth token",
  "received_token": "WRONG_TOKEN"
}
```

#### 415 Unsupported Media Type - Content-Type errado
```json
{
  "error": "unsupported_media_type",
  "message": "Content-Type must be application/json",
  "received": "text/plain"
}
```

#### 422 Unprocessable Entity - Payload malformado
```json
{
  "error": "validation_error",
  "message": "Invalid GSI payload structure",
  "details": [
    {
      "field": "auth.token",
      "issue": "Required field missing"
    }
  ]
}
```

#### 429 Too Many Requests - Rate limit
```json
{
  "error": "rate_limit_exceeded",
  "message": "Max 20 requests per second",
  "retry_after_seconds": 1
}
```

#### 500 Internal Server Error - Erro inesperado
```json
{
  "error": "internal_server_error",
  "message": "Failed to process GSI payload",
  "request_id": "req_abc123"
}
```

### Logging

#### Sucesso (INFO)
```json
{
  "level": "info",
  "msg": "GSI snapshot processed",
  "matchId": "7890123456",
  "steamId": "76561198012345678",
  "heroId": 46,
  "snapshotHash": "a3f5e8d2...",
  "broadcast": true,
  "latency_ms": 12
}
```

#### Dedup (DEBUG)
```json
{
  "level": "debug",
  "msg": "GSI snapshot deduplicated",
  "matchId": "7890123456",
  "steamId": "76561198012345678",
  "snapshotHash": "a3f5e8d2..."
}
```

#### Erro de Auth (WARN)
```json
{
  "level": "warn",
  "msg": "GSI unauthorized attempt",
  "ip": "127.0.0.1",
  "receivedToken": "WRONG_TOKEN"
}
```

### Métricas (Prometheus format)

```
# Contador de eventos recebidos
gsi_events_total{status="success"} 1543
gsi_events_total{status="dedup"} 892
gsi_events_total{status="error"} 3

# Latência do processamento
gsi_processing_duration_ms_bucket{le="10"} 1200
gsi_processing_duration_ms_bucket{le="50"} 1500
gsi_processing_duration_ms_bucket{le="100"} 1540
gsi_processing_duration_ms_sum 18450
gsi_processing_duration_ms_count 1543

# Taxa de deduplicação
gsi_dedup_ratio 0.73
```

### Exemplo de Requisição (curl)

```bash
curl -X POST http://127.0.0.1:53000/gsi \
  -H "Content-Type: application/json" \
  -d '{
    "auth": {
      "token": "COACH_LOCAL_SECRET"
    },
    "provider": {
      "name": "Dota 2",
      "appid": 570,
      "version": 53,
      "timestamp": 1696950000
    },
    "map": {
      "matchid": "7890123456",
      "clock_time": 754
    },
    "player": {
      "steamid": "76561198012345678",
      "gold": 2450
    },
    "hero": {
      "id": 46,
      "level": 12
    }
  }'
```

---

# D. Contrato do WebSocket /ws/live

## Endpoint: `ws://127.0.0.1:3001/ws/live`

### Descrição
Canal bidirecional para transmitir snapshots do game state em tempo real do backend para frontend.

### URL de Conexão
```
ws://127.0.0.1:3001/ws/live
```
- Protocolo: WebSocket (não WSS)
- Host: 127.0.0.1 (loopback)
- Porta: 3001 (mesma porta do Express)
- Path: `/ws/live`

### Handshake

#### Cliente conecta
```javascript
const ws = new WebSocket('ws://127.0.0.1:3001/ws/live');
```

#### Servidor responde (primeira mensagem após conexão)
```json
{
  "type": "handshake",
  "timestamp": 1696950123456,
  "server_version": "1.0.0",
  "message": "Connected to Dota 2 Coach Live Mode"
}
```

### Tipos de Mensagens

#### 1. Server → Client: `snapshot`
Atualização de estado do jogo.

```json
{
  "type": "snapshot",
  "t": 1696950123456,
  "matchId": "7890123456",
  "player": {
    "steamId": "76561198012345678",
    "accountId": "12345678",
    "name": "Player Name",
    "activity": "playing",
    "teamName": "radiant",
    "kills": 5,
    "deaths": 2,
    "assists": 8,
    "lastHits": 87,
    "denies": 12,
    "gold": 2450,
    "goldReliable": 1200,
    "goldUnreliable": 1250,
    "gpm": 512,
    "xpm": 628
  },
  "map": {
    "clockTime": 754,
    "gameTime": 774,
    "daytime": true,
    "gameState": "DOTA_GAMERULES_STATE_GAME_IN_PROGRESS",
    "paused": false,
    "winTeam": "none",
    "wardPurchaseCooldown": 0
  },
  "hero": {
    "id": 46,
    "name": "templar_assassin",
    "displayName": "Templar Assassin",
    "level": 12,
    "xp": 8420,
    "alive": true,
    "respawnSeconds": 0,
    "buybackCost": 850,
    "buybackCooldown": 0,
    "health": 1420,
    "maxHealth": 1680,
    "healthPercent": 84,
    "mana": 512,
    "maxMana": 780,
    "manaPercent": 65,
    "position": {
      "x": -1254,
      "y": 3456
    },
    "statuses": {
      "silenced": false,
      "stunned": false,
      "disarmed": false,
      "magicImmune": false,
      "hexed": false,
      "muted": false,
      "broken": false,
      "smoked": false,
      "hasDebuff": false
    },
    "talents": {
      "10_left": false,
      "10_right": false,
      "15_left": true,
      "15_right": false,
      "20_left": false,
      "20_right": false,
      "25_left": false,
      "25_right": false
    }
  },
  "abilities": [
    {
      "slot": 0,
      "id": 5002,
      "name": "templar_assassin_refraction",
      "level": 3,
      "canCast": true,
      "passive": false,
      "active": false,
      "cooldown": 0,
      "ultimate": false
    },
    {
      "slot": 1,
      "id": 5003,
      "name": "templar_assassin_meld",
      "level": 2,
      "canCast": true,
      "passive": false,
      "active": false,
      "cooldown": 3,
      "ultimate": false
    },
    {
      "slot": 2,
      "id": 5004,
      "name": "templar_assassin_psi_blades",
      "level": 4,
      "canCast": false,
      "passive": true,
      "active": false,
      "cooldown": 0,
      "ultimate": false
    },
    {
      "slot": 3,
      "id": 5005,
      "name": "templar_assassin_trap",
      "level": 2,
      "canCast": true,
      "passive": false,
      "active": false,
      "cooldown": 0,
      "ultimate": true,
      "charges": 3,
      "maxCharges": 3
    }
  ],
  "items": [
    {
      "slot": 0,
      "id": 63,
      "name": "power_treads",
      "displayName": "Power Treads",
      "canCast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 0,
      "location": "inventory"
    },
    {
      "slot": 1,
      "id": 144,
      "name": "desolator",
      "displayName": "Desolator",
      "canCast": false,
      "cooldown": 0,
      "passive": true,
      "charges": 0,
      "location": "inventory"
    },
    {
      "slot": 2,
      "id": 1,
      "name": "blink",
      "displayName": "Blink Dagger",
      "canCast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 0,
      "location": "inventory"
    },
    {
      "slot": 3,
      "id": 116,
      "name": "black_king_bar",
      "displayName": "Black King Bar",
      "canCast": true,
      "cooldown": 28,
      "passive": false,
      "charges": 0,
      "location": "inventory"
    },
    {
      "slot": 4,
      "id": 46,
      "name": "tpscroll",
      "displayName": "Town Portal Scroll",
      "canCast": true,
      "cooldown": 0,
      "passive": false,
      "charges": 1,
      "location": "inventory"
    },
    {
      "slot": 0,
      "id": 305,
      "name": "ultimate_orb",
      "displayName": "Ultimate Orb",
      "location": "stash"
    },
    {
      "slot": 0,
      "id": 46,
      "name": "tpscroll",
      "displayName": "Town Portal Scroll",
      "charges": 1,
      "location": "teleport"
    },
    {
      "slot": 0,
      "id": 780,
      "name": "grove_bow",
      "displayName": "Grove Bow",
      "tier": 2,
      "location": "neutral"
    }
  ],
  "draftHints": {
    "enemyHeroes": [1, 5],
    "allyHeroes": [46, 93],
    "enemySilences": 2,
    "enemyStuns": 3,
    "enemyBreaks": 1,
    "enemyDispels": 1,
    "enemyInvisibility": 0,
    "needBkb": true,
    "needLinken": false,
    "needMkb": false
  }
}
```

#### 2. Server → Client: `heartbeat`
Keepalive para manter conexão.

```json
{
  "type": "heartbeat",
  "timestamp": 1696950123456
}
```

**Frequência:** A cada 5 segundos

**Cliente deve responder com pong:**
```json
{
  "type": "pong",
  "timestamp": 1696950123456
}
```

**Timeout:** Se cliente não responde em 3 segundos, servidor desconecta.

#### 3. Server → Client: `error`
Notificação de erro.

```json
{
  "type": "error",
  "code": "session_expired",
  "message": "Live session expired due to inactivity",
  "timestamp": 1696950123456
}
```

**Códigos de erro:**
- `session_expired` - Sessão expirou (5 min sem dados)
- `invalid_data` - Dados corrompidos recebidos do GSI
- `server_overload` - Servidor sobrecarregado
- `connection_limit` - Máximo de conexões atingido

#### 4. Client → Server: `pong`
Resposta ao heartbeat.

```json
{
  "type": "pong",
  "timestamp": 1696950123456
}
```

#### 5. Client → Server: `subscribe`
(Opcional) Cliente pode solicitar apenas certos campos.

```json
{
  "type": "subscribe",
  "fields": ["hero", "items", "map.clockTime"]
}
```

**Resposta:**
```json
{
  "type": "subscription_ack",
  "fields": ["hero", "items", "map.clockTime"]
}
```

Snapshots subsequentes só conterão campos solicitados (economia de banda).

### Reconexão

#### Estratégia Exponential Backoff

```typescript
const reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // ms
let attemptIndex = 0;

function reconnect() {
  const delay = reconnectDelays[Math.min(attemptIndex, reconnectDelays.length - 1)];
  setTimeout(() => {
    attemptIndex++;
    connect();
  }, delay);
}
```

#### Cliente detecta desconexão
```javascript
ws.onclose = (event) => {
  console.log('WS closed', event.code, event.reason);
  reconnect();
};

ws.onerror = (error) => {
  console.error('WS error', error);
  // onclose será chamado automaticamente
};
```

#### Servidor fecha conexão gracefully
```json
{
  "type": "disconnect",
  "reason": "server_shutdown",
  "message": "Server is shutting down for maintenance",
  "reconnect_after_seconds": 60
}
```

### Throttling (Backpressure)

**Problema:** Cliente lento não processa mensagens rápido o suficiente.

**Solução no servidor:**
1. Buffer de mensagens por cliente (max 10)
2. Se buffer cheio, dropar mensagens antigas
3. Enviar warning ao cliente:

```json
{
  "type": "warning",
  "code": "messages_dropped",
  "message": "Some snapshots were dropped due to slow processing",
  "dropped_count": 5
}
```

**Cliente deve:**
- Processar mensagens assincronamente (não bloquear onmessage)
- Se receber warning, considerar reduzir complexidade do processamento

### Security

#### 1. Origin Check
```typescript
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (origin && origin !== 'http://localhost:5173') {
    ws.close(1008, 'Invalid origin');
    return;
  }
});
```

#### 2. Rate Limiting
Max 1 mensagem de cliente/100ms (exceto pong).

#### 3. Max Connections
Max 5 conexões simultâneas do mesmo IP (previne abuse).

### Observabilidade

#### Métricas
```
# Clientes conectados
ws_clients_connected{status="active"} 1

# Mensagens enviadas
ws_messages_sent_total{type="snapshot"} 1543
ws_messages_sent_total{type="heartbeat"} 312

# Mensagens dropadas (backpressure)
ws_messages_dropped_total 5

# Latência de broadcast
ws_broadcast_duration_ms_bucket{le="10"} 1200
ws_broadcast_duration_ms_bucket{le="50"} 1500
```

#### Logs
```json
{
  "level": "info",
  "msg": "WS client connected",
  "clientId": "ws_abc123",
  "ip": "127.0.0.1"
}
```

```json
{
  "level": "debug",
  "msg": "WS snapshot broadcasted",
  "matchId": "7890123456",
  "clients": 1,
  "size_bytes": 2048,
  "latency_ms": 8
}
```

### Exemplo de Uso (Frontend)

```typescript
class LiveClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;

  connect() {
    this.ws = new WebSocket('ws://127.0.0.1:3001/ws/live');

    this.ws.onopen = () => {
      console.log('Connected to Live Mode');
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Live Mode');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WS error', error);
    };
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'handshake':
        console.log('Handshake received', message);
        break;
      case 'snapshot':
        useLiveStore.getState().updateSnapshot(message);
        break;
      case 'heartbeat':
        this.send({ type: 'pong', timestamp: Date.now() });
        break;
      case 'error':
        console.error('Server error', message);
        break;
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private reconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 16000);
    this.reconnectAttempt++;
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
```

---

# E. Tabela de Mapeamento GSI → Schema

## Normalização de Dados

Esta tabela mapeia campos do payload GSI (Dota 2) para nosso schema canônico (`LiveSnapshot`).

| Campo GSI | Tipo GSI | Campo Schema | Tipo Schema | Transformação | Notas |
|-----------|----------|--------------|-------------|---------------|-------|
| **Provider** |
| `provider.timestamp` | `number` | `t` | `number` | `timestamp * 1000` | GSI em segundos, schema em milissegundos |
| `provider.name` | `string` | _(metadata)_ | - | - | Log apenas |
| `provider.appid` | `number` | _(validação)_ | - | `=== 570` | Validar que é Dota 2 |
| **Map** |
| `map.matchid` | `string` | `matchId` | `string` | Direto | Identificador único da partida |
| `map.clock_time` | `number` | `map.clockTime` | `number` | Direto | Tempo do relógio in-game (segundos) |
| `map.game_time` | `number` | `map.gameTime` | `number` | Direto | Tempo real (inclui pre-horn) |
| `map.daytime` | `boolean` | `map.daytime` | `boolean` | Direto | `true` = dia, `false` = noite |
| `map.game_state` | `string` | `map.gameState` | `string` | Direto | `DOTA_GAMERULES_STATE_*` |
| `map.paused` | `boolean` | `map.paused` | `boolean` | Direto | Jogo pausado? |
| `map.win_team` | `string` | `map.winTeam` | `string` | Direto | `none`, `radiant`, `dire` |
| `map.ward_purchase_cooldown` | `number` | `map.wardPurchaseCooldown` | `number` | Direto | Tempo até poder comprar ward |
| **Player** |
| `player.steamid` | `string` | `player.steamId` | `string` | Direto | Steam ID 64 |
| `player.accountid` | `string` | `player.accountId` | `string` | Direto | Dota 2 Account ID |
| `player.name` | `string` | `player.name` | `string` | Direto | Nome do jogador |
| `player.activity` | `string` | `player.activity` | `string` | Direto | `playing`, `menu`, `disconnect` |
| `player.team_name` | `string` | `player.teamName` | `'radiant' \| 'dire'` | Direto | Time do jogador |
| `player.kills` | `number` | `player.kills` | `number` | Direto | - |
| `player.deaths` | `number` | `player.deaths` | `number` | Direto | - |
| `player.assists` | `number` | `player.assists` | `number` | Direto | - |
| `player.last_hits` | `number` | `player.lastHits` | `number` | Direto | - |
| `player.denies` | `number` | `player.denies` | `number` | Direto | - |
| `player.gold` | `number` | `player.gold` | `number` | Direto | Ouro total |
| `player.gold_reliable` | `number` | `player.goldReliable` | `number` | Direto | Ouro confiável (não perde ao morrer) |
| `player.gold_unreliable` | `number` | `player.goldUnreliable` | `number` | Direto | Ouro não confiável |
| `player.gpm` | `number` | `player.gpm` | `number` | Direto | Gold per minute |
| `player.xpm` | `number` | `player.xpm` | `number` | Direto | XP per minute |
| **Hero** |
| `hero.id` | `number` | `hero.id` | `number` | Direto | Hero ID (ex: 46 = Templar Assassin) |
| `hero.name` | `string` | `hero.name` | `string` | `name.replace('npc_dota_hero_', '')` | Remove prefixo |
| - | - | `hero.displayName` | `string` | `getHeroNameById(id)` | Buscar de hero constants |
| `hero.level` | `number` | `hero.level` | `number` | Direto | Level 1–30 |
| `hero.xp` | `number` | `hero.xp` | `number` | Direto | XP acumulado |
| `hero.alive` | `boolean` | `hero.alive` | `boolean` | Direto | Vivo ou morto |
| `hero.respawn_seconds` | `number` | `hero.respawnSeconds` | `number` | Direto | Tempo até respawn (0 se vivo) |
| `hero.buyback_cost` | `number` | `hero.buybackCost` | `number` | Direto | Custo do buyback |
| `hero.buyback_cooldown` | `number` | `hero.buybackCooldown` | `number` | Direto | CD do buyback |
| `hero.health` | `number` | `hero.health` | `number` | Direto | HP atual |
| `hero.max_health` | `number` | `hero.maxHealth` | `number` | Direto | HP máximo |
| `hero.health_percent` | `number` | `hero.healthPercent` | `number` | Direto | HP % |
| `hero.mana` | `number` | `hero.mana` | `number` | Direto | Mana atual |
| `hero.max_mana` | `number` | `hero.maxMana` | `number` | Direto | Mana máxima |
| `hero.mana_percent` | `number` | `hero.manaPercent` | `number` | Direto | Mana % |
| `hero.xpos` | `number` | `hero.position.x` | `number` | Direto | Posição X no mapa |
| `hero.ypos` | `number` | `hero.position.y` | `number` | Direto | Posição Y no mapa |
| `hero.silenced` | `boolean` | `hero.statuses.silenced` | `boolean` | Direto | Silenciado? |
| `hero.stunned` | `boolean` | `hero.statuses.stunned` | `boolean` | Direto | Stunado? |
| `hero.disarmed` | `boolean` | `hero.statuses.disarmed` | `boolean` | Direto | Desarmado? |
| `hero.magicimmune` | `boolean` | `hero.statuses.magicImmune` | `boolean` | Direto | Imune a magia? (BKB) |
| `hero.hexed` | `boolean` | `hero.statuses.hexed` | `boolean` | Direto | Hex? (Sheep) |
| `hero.muted` | `boolean` | `hero.statuses.muted` | `boolean` | Direto | Mudo? (não usa items) |
| `hero.break` | `boolean` | `hero.statuses.broken` | `boolean` | Direto | Break? (sem passivas) |
| `hero.smoked` | `boolean` | `hero.statuses.smoked` | `boolean` | Direto | Invisível por smoke? |
| `hero.has_debuff` | `boolean` | `hero.statuses.hasDebuff` | `boolean` | Direto | Tem algum debuff? |
| `hero.talent_1` | `boolean` | `hero.talents.10_left` | `boolean` | Direto | Talent nível 10 esquerda |
| `hero.talent_2` | `boolean` | `hero.talents.10_right` | `boolean` | Direto | Talent nível 10 direita |
| `hero.talent_3` | `boolean` | `hero.talents.15_left` | `boolean` | Direto | Talent nível 15 esquerda |
| `hero.talent_4` | `boolean` | `hero.talents.15_right` | `boolean` | Direto | Talent nível 15 direita |
| `hero.talent_5` | `boolean` | `hero.talents.20_left` | `boolean` | Direto | Talent nível 20 esquerda |
| `hero.talent_6` | `boolean` | `hero.talents.20_right` | `boolean` | Direto | Talent nível 20 direita |
| `hero.talent_7` | `boolean` | `hero.talents.25_left` | `boolean` | Direto | Talent nível 25 esquerda |
| `hero.talent_8` | `boolean` | `hero.talents.25_right` | `boolean` | Direto | Talent nível 25 direita |
| **Abilities** |
| `abilities.ability0` | `object` | `abilities[0]` | `object` | Ver abaixo | Slot 0 (Q) |
| `abilities.ability1` | `object` | `abilities[1]` | `object` | Ver abaixo | Slot 1 (W) |
| `abilities.ability2` | `object` | `abilities[2]` | `object` | Ver abaixo | Slot 2 (E) |
| `abilities.ability3` | `object` | `abilities[3]` | `object` | Ver abaixo | Slot 3 (R) |
| `abilities.ability4` | `object` | `abilities[4]` | `object` | Ver abaixo | Slot 4 (D - facet/sub) |
| `abilities.ability5` | `object` | `abilities[5]` | `object` | Ver abaixo | Slot 5 (F - sub) |
| **Ability (individual)** |
| `name` | `string` | `name` | `string` | Direto | Nome da habilidade |
| `level` | `number` | `level` | `number` | Direto | Level 0–4 ou 0–3 (ult) |
| `can_cast` | `boolean` | `canCast` | `boolean` | Direto | Pode castar agora? |
| `passive` | `boolean` | `passive` | `boolean` | Direto | É passiva? |
| `ability_active` | `boolean` | `active` | `boolean` | Direto | Ativa no momento? (toggle) |
| `cooldown` | `number` | `cooldown` | `number` | Direto | Cooldown restante (segundos) |
| `ultimate` | `boolean` | `ultimate` | `boolean` | Direto | É ultimate? |
| `charges` | `number` | `charges` | `number` | Direto | Cargas (ex: Invoker orbs) |
| `max_charges` | `number` | `maxCharges` | `number` | Direto | Máximo de cargas |
| - | - | `id` | `number` | `getAbilityIdByName(name)` | Buscar de ability constants |
| - | - | `slot` | `number` | Index do loop | 0–5 |
| **Items** |
| `items.slot0` | `object` | `items[]` | `array` | Ver abaixo | Slot 0 (inventory) |
| `items.slot1–5` | `object` | `items[]` | `array` | Ver abaixo | Slots 1–5 (inventory) |
| `items.stash0–5` | `object` | `items[]` | `array` | Ver abaixo | Stash |
| `items.teleport0` | `object` | `items[]` | `array` | Ver abaixo | Teleport slot |
| `items.neutral0` | `object` | `items[]` | `array` | Ver abaixo | Neutral item |
| **Item (individual)** |
| `name` | `string` | `name` | `string` | `name.replace('item_', '')` | Remove prefixo |
| - | - | `displayName` | `string` | `getItemNameById(id)` | Buscar de item constants |
| `can_cast` | `boolean` | `canCast` | `boolean` | Direto | Pode usar agora? |
| `cooldown` | `number` | `cooldown` | `number` | Direto | Cooldown restante |
| `passive` | `boolean` | `passive` | `boolean` | Direto | É passivo? |
| `charges` | `number` | `charges` | `number` | Direto | Cargas (ex: Magic Stick) |
| - | - | `id` | `number` | `getItemIdByName(name)` | Buscar de item constants |
| - | - | `slot` | `number` | Index do slot | 0–5 |
| - | - | `location` | `string` | Deduzir do slot original | `inventory`, `stash`, `teleport`, `neutral` |
| **Draft** |
| `draft.team2.pick0_id` | `number` | `draftHints.enemyHeroes[]` | `number[]` | Coletar picks do time inimigo | Depende de `player.team_name` |
| `draft.team2.pick0_class` | `string` | - | - | Validação apenas | - |
| `draft.team3.pick0_id` | `number` | `draftHints.allyHeroes[]` | `number[]` | Coletar picks do time aliado | Depende de `player.team_name` |
| **Draft Hints (calculados)** |
| - | - | `draftHints.enemySilences` | `number` | `countSilencesInHeroes(enemyHeroes)` | Contar heróis com silence |
| - | - | `draftHints.enemyStuns` | `number` | `countStunsInHeroes(enemyHeroes)` | Contar heróis com stun |
| - | - | `draftHints.enemyBreaks` | `number` | `countBreaksInHeroes(enemyHeroes)` | Contar heróis com break |
| - | - | `draftHints.enemyDispels` | `number` | `countDispelsInHeroes(enemyHeroes)` | Contar heróis com dispel |
| - | - | `draftHints.enemyInvisibility` | `number` | `countInvisInHeroes(enemyHeroes)` | Contar heróis com invis |
| - | - | `draftHints.needBkb` | `boolean` | `enemySilences + enemyStuns >= 3` | Recomendar BKB? |
| - | - | `draftHints.needLinken` | `boolean` | `hasTargetedDisables(enemyHeroes)` | Recomendar Linken's? |
| - | - | `draftHints.needMkb` | `boolean` | `enemyHasEvasion(enemyHeroes)` | Recomendar MKB? |

## Notas sobre Transformações

### Timestamps
GSI envia timestamps em **segundos Unix**. Schema usa **milissegundos**.
```typescript
t: gsi.provider.timestamp * 1000
```

### Hero Names
GSI usa prefixo `npc_dota_hero_*`. Schema usa nome curto.
```typescript
name: gsi.hero.name.replace('npc_dota_hero_', '') // "templar_assassin"
displayName: getHeroNameById(gsi.hero.id) // "Templar Assassin"
```

### Item Names
GSI usa prefixo `item_*`. Schema remove.
```typescript
name: gsi.items.slot0.name.replace('item_', '') // "blink"
displayName: getItemNameById(id) // "Blink Dagger"
```

### Abilities Slot
GSI usa `ability0`, `ability1`... Schema usa array com `slot`.
```typescript
abilities: Object.entries(gsi.abilities)
  .filter(([key]) => key.startsWith('ability'))
  .map(([key, ability], index) => ({
    slot: index,
    ...ability
  }))
```

### Items Location
GSI separa em `slot0–5`, `stash0–5`, etc. Schema unifica em array com `location`.
```typescript
const items = [];
// Inventory
for (let i = 0; i < 6; i++) {
  if (gsi.items[`slot${i}`]?.name !== 'empty') {
    items.push({ ...gsi.items[`slot${i}`], slot: i, location: 'inventory' });
  }
}
// Stash
for (let i = 0; i < 6; i++) {
  if (gsi.items[`stash${i}`]?.name !== 'empty') {
    items.push({ ...gsi.items[`stash${i}`], slot: i, location: 'stash' });
  }
}
// ...
```

### Draft Hints
Calculados a partir de hero constants.
```typescript
// Exemplo: contar silences
function countSilencesInHeroes(heroIds: number[]): number {
  return heroIds.reduce((count, id) => {
    const hero = HERO_CONSTANTS[id];
    const hasSilence = hero.abilities.some(ab => ab.effects.includes('silence'));
    return count + (hasSilence ? 1 : 0);
  }, 0);
}
```

### Talents
GSI usa `talent_1–8`. Schema usa formato descritivo.
```typescript
talents: {
  '10_left': gsi.hero.talent_1,
  '10_right': gsi.hero.talent_2,
  '15_left': gsi.hero.talent_3,
  '15_right': gsi.hero.talent_4,
  '20_left': gsi.hero.talent_5,
  '20_right': gsi.hero.talent_6,
  '25_left': gsi.hero.talent_7,
  '25_right': gsi.hero.talent_8
}
```

---

**(Continuação nos próximos entregáveis...)**
