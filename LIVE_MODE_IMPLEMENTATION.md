# Live Mode Implementation Plan

**Documento:** Testes, Readiness, Troubleshooting e Rollout
**Versão:** 1.0.0
**Data:** 2025-10-10
**Status:** 🟡 AGUARDANDO APROVAÇÃO

---

# F. Plano de Testes

## Estratégia de Testing

### Pirâmide de Testes
```
        ┌──────────────┐
        │     E2E      │  10% - Fluxos críticos completos
        │   (Manual +  │
        │  Playwright) │
        └──────────────┘
       ┌────────────────┐
       │  Integration   │  30% - Componentes integrados
       │   (Vitest)     │
       └────────────────┘
      ┌──────────────────┐
      │   Unit Tests     │  60% - Lógica isolada
      │    (Vitest)      │
      └──────────────────┘
```

---

## 1. Unit Tests

### 1.1 GsiAdapter (backend/src/adapters/GsiAdapter.test.ts)

**Objetivo:** Validar normalização de payloads GSI → LiveSnapshot

**Test Cases:**

```typescript
describe('GsiAdapter', () => {
  describe('normalize()', () => {
    it('should normalize minimal heartbeat payload', () => {
      const gsiPayload = {
        auth: { token: 'TEST_TOKEN' },
        provider: { name: 'Dota 2', appid: 570, version: 53, timestamp: 1696950000 }
      };

      const result = GsiAdapter.normalize(gsiPayload);

      expect(result).toEqual({
        t: 1696950000000, // timestamp em ms
        matchId: null,
        player: null,
        map: null,
        hero: null,
        abilities: [],
        items: [],
        draftHints: null
      });
    });

    it('should normalize full in-game payload', () => {
      const gsiPayload = loadFixture('gsi-payload-full.json');
      const result = GsiAdapter.normalize(gsiPayload);

      expect(result.matchId).toBe('7890123456');
      expect(result.hero.id).toBe(46);
      expect(result.hero.name).toBe('templar_assassin');
      expect(result.hero.level).toBe(12);
      expect(result.items).toHaveLength(8); // 5 inv + 1 stash + 1 tp + 1 neutral
      expect(result.abilities).toHaveLength(4); // Q,W,E,R
    });

    it('should convert timestamps from seconds to milliseconds', () => {
      const gsiPayload = {
        auth: { token: 'TEST_TOKEN' },
        provider: { timestamp: 1696950000 }
      };

      const result = GsiAdapter.normalize(gsiPayload);
      expect(result.t).toBe(1696950000000);
    });

    it('should remove npc_dota_hero_ prefix from hero name', () => {
      const gsiPayload = {
        auth: { token: 'TEST_TOKEN' },
        hero: { id: 46, name: 'npc_dota_hero_templar_assassin', level: 1 }
      };

      const result = GsiAdapter.normalize(gsiPayload);
      expect(result.hero.name).toBe('templar_assassin');
    });

    it('should remove item_ prefix from item names', () => {
      const gsiPayload = {
        items: {
          slot0: { name: 'item_blink', can_cast: true, cooldown: 0 }
        }
      };

      const result = GsiAdapter.normalize(gsiPayload);
      expect(result.items[0].name).toBe('blink');
    });

    it('should calculate draftHints.needBkb when enemy has many disables', () => {
      const gsiPayload = loadFixture('gsi-draft-heavy-control.json');
      const result = GsiAdapter.normalize(gsiPayload);

      expect(result.draftHints.enemySilences).toBeGreaterThanOrEqual(2);
      expect(result.draftHints.enemyStuns).toBeGreaterThanOrEqual(2);
      expect(result.draftHints.needBkb).toBe(true);
    });

    it('should handle empty items gracefully', () => {
      const gsiPayload = {
        items: {
          slot0: { name: 'empty' },
          slot1: { name: 'empty' },
          slot2: { name: 'item_tpscroll', charges: 1 }
        }
      };

      const result = GsiAdapter.normalize(gsiPayload);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('tpscroll');
    });

    it('should throw if auth.token is missing', () => {
      const gsiPayload = { provider: {} };
      expect(() => GsiAdapter.normalize(gsiPayload)).toThrow('Missing auth token');
    });

    it('should throw if provider.appid is not 570', () => {
      const gsiPayload = {
        auth: { token: 'TEST_TOKEN' },
        provider: { appid: 999 }
      };
      expect(() => GsiAdapter.normalize(gsiPayload)).toThrow('Invalid appid');
    });
  });
});
```

**Fixtures:** 10 arquivos JSON com payloads variados
- `gsi-heartbeat.json` - Apenas provider
- `gsi-payload-full.json` - In-game completo
- `gsi-draft-heavy-control.json` - Draft com muitos disables
- `gsi-pre-game.json` - Antes do horn
- `gsi-post-game.json` - Após ancient cair
- `gsi-dead-hero.json` - Herói morto
- `gsi-buyback-available.json` - Com buyback disponível
- `gsi-abilities-on-cooldown.json` - Habilidades em CD
- `gsi-empty-slots.json` - Slots vazios
- `gsi-neutral-item.json` - Com neutral item

---

### 1.2 SessionManager (backend/src/gsi/SessionManager.test.ts)

**Objetivo:** Validar gerenciamento de sessões, deduplicação e TTL

**Test Cases:**

```typescript
describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager({ ttl: 5 * 60 * 1000 }); // 5 min
  });

  describe('getOrCreateSession()', () => {
    it('should create new session if not exists', () => {
      const session = manager.getOrCreateSession('match123', 'steam456');

      expect(session.matchId).toBe('match123');
      expect(session.steamId).toBe('steam456');
      expect(session.lastUpdate).toBeGreaterThan(0);
      expect(session.snapshotCount).toBe(0);
    });

    it('should return existing session if already created', () => {
      const session1 = manager.getOrCreateSession('match123', 'steam456');
      const session2 = manager.getOrCreateSession('match123', 'steam456');

      expect(session1).toBe(session2); // Same reference
    });

    it('should create separate sessions for different match IDs', () => {
      const session1 = manager.getOrCreateSession('match123', 'steam456');
      const session2 = manager.getOrCreateSession('match789', 'steam456');

      expect(session1).not.toBe(session2);
    });
  });

  describe('updateSession()', () => {
    it('should update session with new snapshot', () => {
      const snapshot = createMockSnapshot({ matchId: 'match123' });
      const result = manager.updateSession(snapshot);

      expect(result.broadcast).toBe(true);
      expect(result.deduplicated).toBe(false);
    });

    it('should deduplicate identical snapshots', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123', hero: { level: 5 } });
      const snapshot2 = createMockSnapshot({ matchId: 'match123', hero: { level: 5 } });

      manager.updateSession(snapshot1);
      const result = manager.updateSession(snapshot2);

      expect(result.broadcast).toBe(false);
      expect(result.deduplicated).toBe(true);
    });

    it('should broadcast if snapshot changed', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123', hero: { level: 5 } });
      const snapshot2 = createMockSnapshot({ matchId: 'match123', hero: { level: 6 } });

      manager.updateSession(snapshot1);
      const result = manager.updateSession(snapshot2);

      expect(result.broadcast).toBe(true);
      expect(result.deduplicated).toBe(false);
    });

    it('should compute hash correctly', () => {
      const snapshot = createMockSnapshot({ matchId: 'match123' });
      const result = manager.updateSession(snapshot);

      expect(result.snapshotHash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should increment snapshot count', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123' });
      const snapshot2 = createMockSnapshot({ matchId: 'match123', hero: { level: 6 } });

      manager.updateSession(snapshot1);
      manager.updateSession(snapshot2);

      const session = manager.getOrCreateSession('match123', 'steam456');
      expect(session.snapshotCount).toBe(2);
    });
  });

  describe('cleanupExpiredSessions()', () => {
    it('should remove sessions older than TTL', async () => {
      const manager = new SessionManager({ ttl: 100 }); // 100ms TTL

      manager.getOrCreateSession('match123', 'steam456');
      expect(manager.getActiveSessions()).toBe(1);

      await sleep(150);
      manager.cleanupExpiredSessions();

      expect(manager.getActiveSessions()).toBe(0);
    });

    it('should keep active sessions', async () => {
      const manager = new SessionManager({ ttl: 1000 }); // 1s TTL

      const snapshot = createMockSnapshot({ matchId: 'match123' });
      manager.updateSession(snapshot); // Touch session

      await sleep(500);
      manager.cleanupExpiredSessions();

      expect(manager.getActiveSessions()).toBe(1);
    });
  });

  describe('getMetrics()', () => {
    it('should return metrics', () => {
      const snapshot1 = createMockSnapshot({ matchId: 'match123' });
      const snapshot2 = createMockSnapshot({ matchId: 'match123' });

      manager.updateSession(snapshot1);
      manager.updateSession(snapshot2); // Dedup

      const metrics = manager.getMetrics();

      expect(metrics.activeSessions).toBe(1);
      expect(metrics.totalEvents).toBe(2);
      expect(metrics.dedupHits).toBe(1);
      expect(metrics.dedupRatio).toBe(0.5);
    });
  });
});
```

---

### 1.3 RecommendationFusion (frontend/src/services/recommendationFusion.test.ts)

**Objetivo:** Validar fusão de dados live + OpenDota

**Test Cases:**

```typescript
describe('RecommendationFusion', () => {
  describe('mergeLiveWithRecommendations()', () => {
    it('should elevate BKB priority if draftHints.needBkb', () => {
      const liveSnapshot = createLiveSnapshot({
        draftHints: { needBkb: true, enemySilences: 3, enemyStuns: 2 }
      });
      const build = createMockBuild({
        coreBuild: {
          situational: [
            { itemName: 'black_king_bar', priority: 0.5 },
            { itemName: 'linken_sphere', priority: 0.4 }
          ]
        }
      });

      const enhanced = mergeLiveWithRecommendations(liveSnapshot, build, {});

      const bkb = enhanced.coreBuild.situational.find(i => i.itemName === 'black_king_bar');
      expect(bkb.priority).toBeGreaterThan(0.7); // Elevado
      expect(bkb.reason).toContain('Enemy has heavy control');
    });

    it('should suggest MKB if enemy has evasion', () => {
      const liveSnapshot = createLiveSnapshot({
        draftHints: { needMkb: true, enemyHeroes: [11] } // PA
      });
      const build = createMockBuild({});

      const enhanced = mergeLiveWithRecommendations(liveSnapshot, build, {});

      const mkb = enhanced.coreBuild.situational.find(i => i.itemName === 'monkey_king_bar');
      expect(mkb).toBeDefined();
      expect(mkb.priority).toBeGreaterThan(0.6);
    });

    it('should not modify build if no live data', () => {
      const build = createMockBuild({});
      const enhanced = mergeLiveWithRecommendations(null, build, {});

      expect(enhanced).toEqual(build); // Unchanged
    });

    it('should highlight owned items', () => {
      const liveSnapshot = createLiveSnapshot({
        items: [
          { id: 116, name: 'black_king_bar', slot: 0, location: 'inventory' }
        ]
      });
      const build = createMockBuild({
        coreBuild: {
          mid: [
            { itemName: 'black_king_bar', priority: 0.5 }
          ]
        }
      });

      const enhanced = mergeLiveWithRecommendations(liveSnapshot, build, {});

      const bkb = enhanced.coreBuild.mid.find(i => i.itemName === 'black_king_bar');
      expect(bkb.owned).toBe(true);
    });

    it('should calculate gold needed for next item', () => {
      const liveSnapshot = createLiveSnapshot({
        player: { gold: 2000 },
        items: []
      });
      const build = createMockBuild({
        coreBuild: {
          mid: [
            { itemName: 'black_king_bar', priority: 0.8 } // Custa 3975
          ]
        }
      });

      const enhanced = mergeLiveWithRecommendations(liveSnapshot, build, {});

      const bkb = enhanced.coreBuild.mid.find(i => i.itemName === 'black_king_bar');
      expect(bkb.goldNeeded).toBe(1975); // 3975 - 2000
      expect(bkb.canAfford).toBe(false);
    });
  });
});
```

---

## 2. Integration Tests

### 2.1 /gsi Endpoint (backend/src/routes/__tests__/gsi.integration.test.ts)

**Objetivo:** Validar fluxo completo do endpoint

**Test Cases:**

```typescript
describe('POST /gsi', () => {
  let app: Express;
  let wss: WebSocketServer;

  beforeAll(() => {
    app = createTestApp();
    wss = createTestWebSocketServer();
  });

  afterAll(() => {
    wss.close();
  });

  it('should accept valid GSI payload and broadcast via WS', async () => {
    const wsClient = createTestWSClient();
    await wsClient.waitForHandshake();

    const gsiPayload = loadFixture('gsi-payload-full.json');

    const response = await request(app)
      .post('/gsi')
      .set('Content-Type', 'application/json')
      .send(gsiPayload);

    expect(response.status).toBe(200);
    expect(response.body.broadcast).toBe(true);

    const wsMessage = await wsClient.waitForMessage();
    expect(wsMessage.type).toBe('snapshot');
    expect(wsMessage.matchId).toBe('7890123456');
  });

  it('should reject request without auth token', async () => {
    const response = await request(app)
      .post('/gsi')
      .send({ provider: { appid: 570 } });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthorized');
  });

  it('should reject request with wrong token', async () => {
    const response = await request(app)
      .post('/gsi')
      .send({
        auth: { token: 'WRONG_TOKEN' },
        provider: { appid: 570 }
      });

    expect(response.status).toBe(401);
  });

  it('should reject request with wrong Content-Type', async () => {
    const response = await request(app)
      .post('/gsi')
      .set('Content-Type', 'text/plain')
      .send('invalid');

    expect(response.status).toBe(415);
  });

  it('should return 422 for malformed payload', async () => {
    const response = await request(app)
      .post('/gsi')
      .set('Content-Type', 'application/json')
      .send({
        auth: { token: process.env.GSI_AUTH_TOKEN },
        provider: { appid: 'not_a_number' } // Invalid
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('validation_error');
  });

  it('should return 429 when rate limit exceeded', async () => {
    const requests = Array(25).fill(null).map(() =>
      request(app)
        .post('/gsi')
        .set('Content-Type', 'application/json')
        .send(loadFixture('gsi-heartbeat.json'))
    );

    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);

    expect(tooManyRequests.length).toBeGreaterThan(0);
  });

  it('should return 204 for deduplicated snapshot', async () => {
    const gsiPayload = loadFixture('gsi-payload-full.json');

    // First request
    const response1 = await request(app)
      .post('/gsi')
      .send(gsiPayload);
    expect(response1.status).toBe(200);

    // Second request (identical)
    const response2 = await request(app)
      .post('/gsi')
      .send(gsiPayload);
    expect(response2.status).toBe(204);
  });
});
```

---

### 2.2 WebSocket Server (backend/src/websocket/__tests__/wsServer.integration.test.ts)

**Test Cases:**

```typescript
describe('WebSocket Server', () => {
  let wss: WebSocketServer;

  beforeAll(() => {
    wss = createTestWebSocketServer();
  });

  afterAll(() => {
    wss.close();
  });

  it('should send handshake on connection', async () => {
    const client = createTestWSClient();
    const message = await client.waitForMessage();

    expect(message.type).toBe('handshake');
    expect(message.server_version).toBeDefined();
  });

  it('should broadcast snapshot to all connected clients', async () => {
    const client1 = createTestWSClient();
    const client2 = createTestWSClient();

    await Promise.all([
      client1.waitForHandshake(),
      client2.waitForHandshake()
    ]);

    const snapshot = createMockSnapshot({ matchId: 'match123' });
    wss.broadcast(snapshot);

    const [msg1, msg2] = await Promise.all([
      client1.waitForMessage(),
      client2.waitForMessage()
    ]);

    expect(msg1.type).toBe('snapshot');
    expect(msg2.type).toBe('snapshot');
    expect(msg1.matchId).toBe('match123');
    expect(msg2.matchId).toBe('match123');
  });

  it('should send heartbeat every 5 seconds', async () => {
    const client = createTestWSClient();
    await client.waitForHandshake();

    const heartbeat = await client.waitForMessage(6000); // Wait 6s
    expect(heartbeat.type).toBe('heartbeat');
  });

  it('should disconnect client if no pong received', async () => {
    const client = createTestWSClient();
    client.disableAutoPong(); // Don't respond to heartbeat

    await client.waitForHandshake();

    const disconnected = await client.waitForDisconnect(10000);
    expect(disconnected).toBe(true);
  });

  it('should handle client disconnection gracefully', async () => {
    const client = createTestWSClient();
    await client.waitForHandshake();

    client.disconnect();

    // Server should remove client from pool
    expect(wss.getClientCount()).toBe(0);
  });

  it('should throttle messages to slow clients', async () => {
    const client = createTestWSClient();
    client.simulateSlowProcessing(200); // 200ms delay

    await client.waitForHandshake();

    // Send 20 snapshots rapidly
    for (let i = 0; i < 20; i++) {
      wss.broadcast(createMockSnapshot({ matchId: `match${i}` }));
      await sleep(10);
    }

    // Client should receive warning about dropped messages
    const warning = await client.waitForMessage(5000, msg => msg.type === 'warning');
    expect(warning.code).toBe('messages_dropped');
  });
});
```

---

## 3. E2E Tests (Playwright)

### 3.1 Live Mode Activation

**File:** `frontend/e2e/liveMode.spec.ts`

```typescript
test.describe('Live Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should show "Enable Live Mode" button when disconnected', async ({ page }) => {
    const liveButton = page.locator('[data-testid="live-toggle"]');
    await expect(liveButton).toContainText('Enable Live');
  });

  test('should connect to WebSocket when Live Mode enabled', async ({ page }) => {
    // Start mock GSI server
    const mockGsi = await startMockGsiServer();

    // Enable Live Mode
    await page.click('[data-testid="live-toggle"]');

    // Should show "LIVE" badge
    const liveBadge = page.locator('[data-testid="live-badge"]');
    await expect(liveBadge).toContainText('LIVE');
    await expect(liveBadge).toHaveClass(/connected/);

    mockGsi.stop();
  });

  test('should update hero data when GSI sends snapshot', async ({ page }) => {
    const mockGsi = await startMockGsiServer();

    await page.click('[data-testid="live-toggle"]');
    await page.waitForSelector('[data-testid="live-badge"].connected');

    // Send GSI snapshot
    mockGsi.sendSnapshot({
      hero: { id: 46, name: 'templar_assassin', level: 12 },
      player: { gold: 2450 }
    });

    // UI should update
    await expect(page.locator('[data-testid="hero-level"]')).toContainText('12');
    await expect(page.locator('[data-testid="player-gold"]')).toContainText('2450');

    mockGsi.stop();
  });

  test('should highlight owned items', async ({ page }) => {
    const mockGsi = await startMockGsiServer();

    await page.click('[data-testid="live-toggle"]');

    mockGsi.sendSnapshot({
      hero: { id: 46 },
      items: [
        { id: 116, name: 'black_king_bar', slot: 0, location: 'inventory' }
      ]
    });

    const bkbItem = page.locator('[data-item-name="black_king_bar"]');
    await expect(bkbItem).toHaveClass(/owned/);

    mockGsi.stop();
  });

  test('should show reconnecting state on disconnect', async ({ page }) => {
    const mockGsi = await startMockGsiServer();

    await page.click('[data-testid="live-toggle"]');
    await page.waitForSelector('[data-testid="live-badge"].connected');

    // Simulate server disconnect
    mockGsi.stop();

    // Should show "Reconnecting..."
    await expect(page.locator('[data-testid="live-badge"]')).toContainText('Reconnecting');

    // Should auto-reconnect
    mockGsi.start();
    await expect(page.locator('[data-testid="live-badge"]')).toContainText('LIVE');
  });

  test('should degrade gracefully when Dota closes', async ({ page }) => {
    const mockGsi = await startMockGsiServer();

    await page.click('[data-testid="live-toggle"]');
    await page.waitForSelector('[data-testid="live-badge"].connected');

    // Simulate Dota closing (no more snapshots for 60s)
    mockGsi.stop();
    await page.waitForTimeout(6000); // Wait 6s

    // Should show "Live disconnected" banner
    await expect(page.locator('[data-testid="live-disconnected-banner"]'))
      .toContainText('Live desconectado');

    // Should still show last known data
    await expect(page.locator('[data-testid="hero-level"]')).toBeVisible();
  });
});
```

---

## 4. Simulação CLI

**File:** `tools/mock-gsi-sender.ts`

**Objetivo:** Enviar payloads GSI simulados para testar backend

```bash
# Enviar heartbeat único
npm run mock-gsi:heartbeat

# Enviar snapshot de jogo em andamento
npm run mock-gsi:snapshot -- --fixture gsi-payload-full.json

# Simular partida completa (0–40 min, 1 snapshot/seg)
npm run mock-gsi:simulate -- --duration 2400

# Loop infinito com variação aleatória
npm run mock-gsi:loop
```

**Exemplo de implementação:**

```typescript
// tools/mock-gsi-sender.ts
import axios from 'axios';
import fs from 'fs';

const GSI_ENDPOINT = 'http://127.0.0.1:53000/gsi';
const AUTH_TOKEN = process.env.GSI_AUTH_TOKEN || 'COACH_LOCAL_SECRET';

async function sendSnapshot(payload: any) {
  try {
    const response = await axios.post(GSI_ENDPOINT, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Snapshot sent: ${response.status}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function simulateMatch(duration: number) {
  console.log(`🎮 Simulating ${duration}s match...`);

  for (let t = 0; t < duration; t++) {
    const payload = generateSnapshotAtTime(t);
    await sendSnapshot(payload);
    await sleep(1000);
  }
}

function generateSnapshotAtTime(time: number): any {
  return {
    auth: { token: AUTH_TOKEN },
    provider: { name: 'Dota 2', appid: 570, version: 53, timestamp: Date.now() / 1000 },
    map: {
      matchid: 'sim_match_123',
      clock_time: time,
      game_time: time + 20,
      daytime: (time % 600) < 300 // 5 min dia, 5 min noite
    },
    player: {
      steamid: '76561198012345678',
      gold: 500 + (time * 10), // +10 GPM
      kills: Math.floor(time / 120), // 1 kill a cada 2 min
      deaths: Math.floor(time / 180)
    },
    hero: {
      id: 46,
      name: 'npc_dota_hero_templar_assassin',
      level: Math.min(30, 1 + Math.floor(time / 60)), // Level up a cada 1 min
      health: 1000 + (time * 5),
      max_health: 1200 + (time * 5),
      mana: 500,
      max_mana: 800
    }
  };
}
```

---

## 5. Testes Manuais

### Checklist de QA Manual

**Pré-requisitos:**
- [ ] Backend rodando (`npm run dev:backend`)
- [ ] Frontend rodando (`npm run dev:frontend`)
- [ ] .cfg instalado no Dota 2
- [ ] Flag `-gamestateintegration` ativa

**Casos de teste:**

1. **Heartbeat inicial**
   - [ ] Abrir Dota 2 no menu
   - [ ] Verificar logs do backend: deve receber POSTs a cada 30s
   - [ ] Código: 200 OK (heartbeat não faz broadcast WS)

2. **Hero Demo**
   - [ ] Entrar em Hero Demo (escolher qualquer herói)
   - [ ] Habilitar Live Mode no app
   - [ ] Badge deve mostrar "🔴 LIVE"
   - [ ] Verificar que herói aparece no app
   - [ ] Level up uma skill → app deve atualizar em <1s
   - [ ] Comprar item → app deve mostrar item owned

3. **Matchups parciais**
   - [ ] Entrar em custom lobby (1v1 ou 5v5)
   - [ ] Escolher heróis para ambos times
   - [ ] Verificar que MatchupsPanel atualiza com inimigos visíveis
   - [ ] Observação: pode não mostrar todos se estão na fog

4. **Timers sincronizados**
   - [ ] Verificar que timer de Rune sincroniza com `map.clockTime`
   - [ ] Aguardar 2 minutos in-game → rune deve aparecer no timer

5. **Reconexão**
   - [ ] Conectado em Live Mode
   - [ ] Parar backend (`Ctrl+C`)
   - [ ] App deve mostrar "Reconnecting..."
   - [ ] Reiniciar backend
   - [ ] App deve reconectar em <5s

6. **Degradação**
   - [ ] Fechar Dota 2 com app conectado
   - [ ] App deve detectar inatividade em ~10s
   - [ ] Mostrar banner "Live desconectado – voltando ao modo histórico"
   - [ ] Dados OpenDota devem continuar funcionando

7. **Performance**
   - [ ] Abrir DevTools → Network → WS
   - [ ] Verificar mensagens a cada ~100–200ms
   - [ ] CPU do frontend deve ficar <10%
   - [ ] Sem lag perceptível na UI

---

## Test Coverage Goals

| Módulo | Target Coverage | Priority |
|--------|----------------|----------|
| GsiAdapter | 95% | Critical |
| SessionManager | 90% | Critical |
| RecommendationFusion | 85% | High |
| /gsi endpoint | 80% | High |
| WebSocket Server | 75% | High |
| LiveStore (Zustand) | 70% | Medium |
| UI Components | 60% | Medium |

**Total target:** >80% overall coverage

---

# G. Checklist de Readiness

## Production Readiness Checklist

### Funcionalidades

- [ ] **GSI Endpoint (`POST /gsi`)**
  - [ ] Auth token validation
  - [ ] Rate limiting (20 req/s)
  - [ ] Content-Type validation
  - [ ] Payload schema validation (Zod)
  - [ ] Error handling (401, 415, 422, 429, 500)
  - [ ] Structured logging

- [ ] **GsiAdapter**
  - [ ] Normaliza 100% dos campos usados
  - [ ] Remove prefixos (`npc_dota_hero_`, `item_`)
  - [ ] Converte timestamps (s → ms)
  - [ ] Calcula draftHints corretamente
  - [ ] Trata slots vazios (`empty`)

- [ ] **SessionManager**
  - [ ] Cria/recupera sessões por matchId + steamId
  - [ ] Deduplicação por hash SHA256
  - [ ] TTL de 5 minutos de inatividade
  - [ ] Cleanup automático (a cada 60s)
  - [ ] Métricas (activeSessions, dedupRatio)

- [ ] **WebSocket Server (`/ws/live`)**
  - [ ] Handshake ao conectar
  - [ ] Broadcast de snapshots
  - [ ] Heartbeat a cada 5s
  - [ ] Timeout de pong (3s)
  - [ ] Throttling (max 1 msg/100ms por cliente)
  - [ ] Backpressure handling (drop old messages)
  - [ ] Graceful disconnect

- [ ] **LiveClient (Frontend)**
  - [ ] Conecta ao WS
  - [ ] Auto-reconnect com exponential backoff
  - [ ] Processa snapshots assincronamente
  - [ ] Responde a heartbeats (pong)
  - [ ] Trata erros e warnings

- [ ] **LiveStore (Zustand)**
  - [ ] State: enabled, status, snapshot, matchId
  - [ ] Actions: updateSnapshot, setStatus, toggle
  - [ ] Persistência (SessionStorage, TTL 60s)
  - [ ] Rehydrate ao reload

- [ ] **RecommendationFusion**
  - [ ] Eleva BKB se needBkb
  - [ ] Sugere MKB se needMkb
  - [ ] Sugere Linken's se needLinken
  - [ ] Marca items owned
  - [ ] Calcula goldNeeded
  - [ ] Não quebra se live === null

- [ ] **UI Components**
  - [ ] LiveBadge (status indicator)
  - [ ] BuildPanel com live overrides
  - [ ] SkillsPanel com cooldowns
  - [ ] Timers sincronizados
  - [ ] LiveSetupBanner (instruções)
  - [ ] DevTools panel (debug)

### Performance

- [ ] **Latência**
  - [ ] /gsi endpoint: p99 < 200ms local
  - [ ] WS broadcast: p99 < 50ms
  - [ ] Frontend render: < 16ms (60 FPS)

- [ ] **Deduplicação**
  - [ ] Taxa de dedup > 70% (em jogo normal)
  - [ ] Hash collision: 0% (SHA256)

- [ ] **Reconexão**
  - [ ] WS reconecta em < 3s após disconnect
  - [ ] Exponential backoff funciona (1s, 2s, 4s, 8s, 16s max)
  - [ ] Sem memory leak em 100 reconexões

- [ ] **Memory**
  - [ ] Backend: < 100MB adicional (com 10 sessões)
  - [ ] Frontend: < 50MB adicional
  - [ ] Cleanup de sessões expira corretamente

- [ ] **CPU**
  - [ ] Backend: < 5% idle, < 20% em jogo
  - [ ] Frontend: < 5% idle, < 10% em jogo
  - [ ] Sem 100% CPU spike

### Segurança

- [ ] **Bind Local**
  - [ ] /gsi escuta APENAS em 127.0.0.1
  - [ ] WS escuta APENAS em 127.0.0.1
  - [ ] Rejeita conexões de IPs externos

- [ ] **Auth Token**
  - [ ] Token obrigatório no .cfg
  - [ ] Backend valida em todo POST
  - [ ] Token em env var (não hardcoded)
  - [ ] Rejeita tokens inválidos (401)

- [ ] **Rate Limiting**
  - [ ] Max 20 req/s por IP
  - [ ] Retorna 429 se exceder
  - [ ] Header `Retry-After`

- [ ] **Input Validation**
  - [ ] Schema Zod valida payload completo
  - [ ] Rejeita appid !== 570
  - [ ] Rejeita JSON malformado (422)
  - [ ] Rejeita Content-Type != application/json (415)

- [ ] **WS Security**
  - [ ] Origin check (localhost:5173)
  - [ ] Max 5 conexões por IP
  - [ ] Rate limit de mensagens do cliente

- [ ] **Opcional: HMAC**
  - [ ] `X-GSI-Signature` header
  - [ ] SHA256 HMAC do corpo
  - [ ] Secret compartilhado com .cfg

### Observabilidade

- [ ] **Logs Estruturados**
  - [ ] Lib: pino ou winston
  - [ ] Formato: JSON
  - [ ] Níveis: debug, info, warn, error
  - [ ] Campos: matchId, steamId, eventType, latency_ms

- [ ] **Métricas**
  - [ ] `gsi_events_total{status="success|dedup|error"}`
  - [ ] `gsi_processing_duration_ms` (histogram)
  - [ ] `gsi_dedup_ratio` (gauge)
  - [ ] `ws_clients_connected` (gauge)
  - [ ] `ws_messages_sent_total{type}`
  - [ ] `ws_messages_dropped_total`
  - [ ] `ws_broadcast_duration_ms`

- [ ] **Health Endpoints**
  - [ ] `GET /health` - Status geral
  - [ ] `GET /health/live` - Status do Live Mode
  - [ ] `GET /metrics` - Prometheus format (opcional)

- [ ] **DevTools Panel**
  - [ ] Packets per second
  - [ ] Last heartbeat timestamp
  - [ ] Fields received (JSON viewer)
  - [ ] Connection status history

### Documentação

- [ ] **LIVE_MODE_ARCHITECTURE.md**
  - [ ] Diagramas completos
  - [ ] Contratos de API
  - [ ] Mapeamentos de dados

- [ ] **LIVE_MODE_SETUP.md** (criar)
  - [ ] Instruções passo-a-passo
  - [ ] Screenshots do .cfg
  - [ ] Troubleshooting básico

- [ ] **README.md atualizado**
  - [ ] Seção "Live Mode" adicionada
  - [ ] Link para LIVE_MODE_SETUP.md

- [ ] **CLAUDE.md atualizado**
  - [ ] Comandos Live Mode
  - [ ] Arquitetura de alto nível

### Testing

- [ ] **Unit Tests**
  - [ ] GsiAdapter: 20+ casos
  - [ ] SessionManager: 15+ casos
  - [ ] RecommendationFusion: 10+ casos
  - [ ] Coverage >80%

- [ ] **Integration Tests**
  - [ ] /gsi endpoint: 10+ casos
  - [ ] WS server: 8+ casos
  - [ ] Todos passam

- [ ] **E2E Tests**
  - [ ] Live Mode activation
  - [ ] Snapshot updates UI
  - [ ] Reconnection
  - [ ] Graceful degradation
  - [ ] Todos passam

- [ ] **Manual QA**
  - [ ] Checklist completo executado
  - [ ] Bugs críticos: 0
  - [ ] Bugs médios: < 3

### DevEx

- [ ] **Feature Flag**
  - [ ] Env var: `LIVE_MODE_ENABLED=true|false`
  - [ ] Pode desabilitar sem code change

- [ ] **Mock CLI**
  - [ ] `npm run mock-gsi:heartbeat`
  - [ ] `npm run mock-gsi:snapshot`
  - [ ] `npm run mock-gsi:simulate`

- [ ] **Scripts**
  - [ ] `npm run dev` inicia backend com Live Mode
  - [ ] Logs claros (coloridos, estruturados)

---

# H. Guia de Troubleshooting

## Diagnóstico de Problemas Comuns

### 1. ❌ Nenhum POST chegando no /gsi

**Sintomas:**
- Backend rodando, mas logs não mostram requests
- Frontend mostra "Disconnected"

**Possíveis Causas:**

#### A. .cfg não está no lugar correto

**Verificar:**
```bash
# Windows (PowerShell)
Get-Content "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_coach.cfg"

# Linux/Mac
cat ~/.steam/steam/steamapps/common/dota\ 2\ beta/game/dota/cfg/gamestate_integration/gamestate_integration_coach.cfg
```

**Solução:**
- Criar diretório se não existe: `.../cfg/gamestate_integration/`
- Copiar .cfg para lá
- Verificar que nome é exatamente `gamestate_integration_coach.cfg`

#### B. Flag -gamestateintegration não ativa

**Verificar:**
Steam → Biblioteca → Dota 2 (botão direito) → Propriedades → Opções de Inicialização

**Solução:**
- Adicionar: `-gamestateintegration`
- Salvar e reiniciar Dota

#### C. Backend não está rodando na porta correta

**Verificar:**
```bash
curl http://127.0.0.1:53000/health/live
```

**Esperado:**
```json
{"status":"ok","gsi_enabled":true}
```

**Solução:**
- Verificar env var `GSI_PORT` (default: 53000)
- Verificar se porta está em uso: `lsof -i :53000` (Mac/Linux) ou `netstat -ano | findstr :53000` (Windows)
- Se outra porta, atualizar .cfg com novo `uri`

#### D. Firewall bloqueando localhost

**Verificar:**
```bash
telnet 127.0.0.1 53000
```

**Solução (Windows):**
- Windows Defender → Firewall → Permitir app
- Adicionar Node.js

**Solução (Linux):**
```bash
sudo ufw allow from 127.0.0.1 to 127.0.0.1 port 53000
```

#### E. Dota não está enviando (bug/config)

**Verificar:**
- Entrar em partida (não apenas menu)
- Hero Demo é suficiente para testar
- Logs do Dota: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\console.log`

**Solução:**
- Revalidar arquivos do jogo (Steam)
- Remover outros .cfg de gamestate_integration (conflito)
- Atualizar Dota para última versão

---

### 2. ❌ HTTP 401 Unauthorized

**Sintomas:**
- POSTs chegam, mas retornam 401
- Logs: "GSI unauthorized attempt"

**Causa:**
Token no .cfg diferente do backend

**Verificar:**
```bash
# Backend (env var)
echo $GSI_AUTH_TOKEN  # Linux/Mac
echo %GSI_AUTH_TOKEN%  # Windows CMD

# .cfg
grep "token" gamestate_integration_coach.cfg
```

**Solução:**
1. Escolher um token (ex: `COACH_SECRET_2025`)
2. Atualizar .cfg: `"token" "COACH_SECRET_2025"`
3. Atualizar backend: `export GSI_AUTH_TOKEN="COACH_SECRET_2025"`
4. Reiniciar ambos

**Security Note:**
Token deve ser único e não compartilhado. Gerar novo:
```bash
openssl rand -hex 32
```

---

### 3. ❌ HTTP 415 Unsupported Media Type

**Sintomas:**
- POSTs retornam 415
- Logs: "Content-Type must be application/json"

**Causa:**
Dota está enviando Content-Type errado (improvável, mas possível com .cfg corrompido)

**Verificar:**
```bash
# Interceptar request com tcpdump (Linux/Mac)
sudo tcpdump -i lo -A port 53000

# Procurar por "Content-Type: ..."
```

**Solução:**
- Recriar .cfg do zero (copiar do template)
- Revalidar arquivos do Dota

---

### 4. ❌ HTTP 422 Unprocessable Entity

**Sintomas:**
- POSTs retornam 422
- Logs: "Invalid GSI payload structure"

**Causa:**
Payload malformado ou campos obrigatórios faltando

**Verificar:**
Logs do backend devem ter `details`:
```json
{
  "error": "validation_error",
  "details": [
    {
      "field": "provider.appid",
      "issue": "Expected number, received string"
    }
  ]
}
```

**Solução:**
- Verificar que .cfg tem flags corretas (`"provider" "1"`, `"map" "1"`, etc.)
- Verificar que Dota está atualizado (GSI format pode mudar)
- Atualizar GsiAdapter se Valve mudou schema

---

### 5. ❌ HTTP 429 Too Many Requests

**Sintomas:**
- Alguns POSTs retornam 429
- Logs: "rate_limit_exceeded"

**Causa:**
Dota enviando >20 req/s (não deveria acontecer com `throttle: 0.1`)

**Verificar:**
Métricas: `gsi_events_total{status="error"}`

**Solução:**
- Verificar .cfg: `"throttle" "0.1"` (100ms mínimo entre POSTs)
- Se muitos 429: aumentar rate limit no backend (não recomendado)
- Possível bug no Dota: reportar à Valve

---

### 6. ❌ Porta em Uso

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::53000
```

**Causa:**
Outra instância do backend rodando ou outro app usando porta 53000

**Verificar:**
```bash
# Linux/Mac
lsof -i :53000

# Windows
netstat -ano | findstr :53000
```

**Solução:**
```bash
# Matar processo
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Ou usar porta diferente
export GSI_PORT=53001
# Atualizar .cfg: "uri" "http://127.0.0.1:53001/gsi"
```

---

### 7. ❌ CORS Error no WebSocket

**Sintomas:**
- Browser console: "WebSocket connection failed: CORS policy"

**Causa:**
Origin inválido (não localhost:5173)

**Verificar:**
```javascript
// Browser console
window.location.origin
```

**Solução:**
- Deve ser `http://localhost:5173`
- Se diferente (ex: `http://127.0.0.1:5173`), atualizar config WS origin check
- Ou acessar via `http://localhost:5173` (não 127.0.0.1)

---

### 8. ❌ Flag não Ativa

**Sintomas:**
- .cfg correto, porta aberta, mas nenhum POST

**Causa:**
Dota não está enviando porque GSI não foi inicializado

**Verificar:**
Console do Dota (in-game):
```
] developer 1
] dota_gamestate_integration_debug 1
```

Deve mostrar:
```
GSI: Loaded config 'Dota2 Coach Live'
GSI: Sending to http://127.0.0.1:53000/gsi
```

**Solução:**
- Adicionar flag: `-gamestateintegration`
- Reiniciar Dota completamente (fechar Steam se necessário)
- Verificar que não há espaços extras no .cfg

---

### 9. ❌ WebSocket Desconecta Imediatamente

**Sintomas:**
- Frontend conecta, mas desconecta em <1s
- Logs: "WS closed", code 1006

**Causa:**
- Heartbeat/pong não funcionando
- Backend rejeitando conexão

**Verificar:**
```javascript
// Browser console → Network → WS → Messages
// Deve ver:
// 1. {"type":"handshake",...}
// 2. {"type":"heartbeat",...} (a cada 5s)
// Cliente deve responder: {"type":"pong",...}
```

**Solução:**
- Verificar que `LiveClient` responde com pong
- Verificar que não há erro JS no handler de mensagens

---

### 10. ❌ Dados Atrasados/Lag

**Sintomas:**
- Mudanças no Dota demoram >1s para aparecer no app

**Causa:**
- Throttle muito alto no .cfg
- Deduplicação excessiva
- Frontend processando devagar

**Diagnosticar:**
```bash
# Backend logs: verificar latency_ms
# Deve ser <50ms

# Frontend DevTools → Performance
# Verificar se render leva >16ms
```

**Solução:**
- Reduzir throttle: `"throttle" "0.05"` (50ms)
- Verificar CPU do frontend (<10%)
- Otimizar render (React.memo, useMemo)

---

### 11. ❌ Imagens de Heróis Não Aparecem

**Sintomas:**
- Live Mode conectado, mas imagens quebradas

**Causa:**
- Cache de heróis não populado
- URL errada

**Verificar:**
```javascript
// Browser console
console.log(heroesCache);
// Deve ter array com ~123 heróis
```

**Solução:**
- Verificar que `getHeroes()` é chamado antes de converter matchups
- Verificar URL: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`

---

### 12. ❌ Memory Leak

**Sintomas:**
- App fica lento após 30+ min
- Memory cresce infinitamente

**Diagnosticar:**
```javascript
// Browser console
performance.memory.usedJSHeapSize / 1024 / 1024 + ' MB'
```

**Causas comuns:**
- SessionStorage não está limpando
- WS listeners não removidos
- LiveStore acumulando snapshots

**Solução:**
- Cleanup em unmount:
  ```typescript
  useEffect(() => {
    return () => liveClient.disconnect();
  }, []);
  ```
- Limitar histórico de snapshots (max 10)

---

## Diagnostic Commands

### Backend

```bash
# Health check
curl http://127.0.0.1:53000/health/live

# Send test snapshot
curl -X POST http://127.0.0.1:53000/gsi \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"COACH_LOCAL_SECRET"},"provider":{"appid":570,"timestamp":1696950000}}'

# View metrics (se implementado)
curl http://127.0.0.1:53000/metrics

# Logs (assumindo pino)
tail -f logs/gsi.log | pino-pretty
```

### Frontend

```javascript
// Browser console

// Check WS status
console.log(useLiveStore.getState().status);

// Check last snapshot
console.log(useLiveStore.getState().snapshot);

// Check connection
console.log(liveClient.isConnected());

// Force reconnect
liveClient.reconnect();

// View DevTools panel
// Open app → Click "Dev" button (se habilitado)
```

### Dota 2

```
// In-game console (~)
developer 1
dota_gamestate_integration_debug 1

// Should see:
// GSI: Sending to http://127.0.0.1:53000/gsi
// GSI: Response: 200 OK
```

---

## Logs de Referência

### Sucesso (Normal)

**Backend:**
```json
{"level":"info","msg":"GSI snapshot processed","matchId":"7890123456","heroId":46,"broadcast":true,"latency_ms":12}
```

**Frontend:**
```
✅ Live Mode connected
📦 Snapshot received: match 7890123456, hero 46 (Templar Assassin), level 12
```

### Erro (Exemplos)

**401 Unauthorized:**
```json
{"level":"warn","msg":"GSI unauthorized attempt","ip":"127.0.0.1","receivedToken":"WRONG"}
```

**429 Rate Limit:**
```json
{"level":"warn","msg":"GSI rate limit exceeded","ip":"127.0.0.1","requests_last_sec":25}
```

**WS Disconnect:**
```json
{"level":"info","msg":"WS client disconnected","clientId":"ws_abc123","reason":"no_pong"}
```

---

# I. Plano de Rollout

## Estratégia de Implementação Incremental

### Feature Flag

**Env Var:**
```bash
LIVE_MODE_ENABLED=true|false
```

**Comportamento:**
- `false` (default): Live Mode completamente desabilitado
  - Endpoint /gsi retorna 503 Service Unavailable
  - WS server não inicia
  - Frontend esconde botão "Enable Live"
- `true`: Live Mode disponível

**Implementação:**
```typescript
// backend/src/server.ts
if (process.env.LIVE_MODE_ENABLED === 'true') {
  app.use('/gsi', gsiRouter);
  startWebSocketServer(server);
  console.log('🔴 Live Mode ENABLED');
} else {
  console.log('⚪ Live Mode DISABLED');
}
```

---

## Fases de Rollout

### **Fase 1: Backend Foundation** (PR #1)

**Escopo:**
- [ ] Estrutura de pastas
- [ ] GsiAdapter (normalização)
- [ ] SessionManager (dedup, TTL)
- [ ] Types (LiveSnapshot, GsiPayload)
- [ ] Unit tests (GsiAdapter, SessionManager)

**Arquivos:**
```
backend/src/gsi/
  ├── GsiAdapter.ts
  ├── SessionManager.ts
  ├── types.ts
  └── __tests__/
      ├── GsiAdapter.test.ts
      └── SessionManager.test.ts
```

**Merge Criteria:**
- [x] Todos os testes passam
- [x] Coverage >85%
- [x] Code review aprovado
- [x] LIVE_MODE_ENABLED=false (não impacta prod)

**Timeline:** 2–3 dias

---

### **Fase 2: API Endpoint** (PR #2)

**Escopo:**
- [ ] Rota POST /gsi
- [ ] Middlewares (auth, rate limit, validation)
- [ ] Error handling
- [ ] Structured logging
- [ ] Integration tests

**Arquivos:**
```
backend/src/routes/
  └── gsi.ts
backend/src/middleware/
  ├── gsiAuth.ts
  ├── gsiRateLimit.ts
  └── gsiValidation.ts
backend/src/routes/__tests__/
  └── gsi.integration.test.ts
```

**Dependências:**
- Fase 1 merged

**Merge Criteria:**
- [x] Endpoint funciona com curl
- [x] Integration tests passam
- [x] Rate limiting funciona
- [x] Logs estruturados

**Timeline:** 2–3 dias

---

### **Fase 3: WebSocket Server** (PR #3)

**Escopo:**
- [ ] WS server initialization
- [ ] Client pool management
- [ ] Broadcast mechanism
- [ ] Heartbeat/pong
- [ ] Throttling/backpressure
- [ ] Integration tests

**Arquivos:**
```
backend/src/websocket/
  ├── server.ts
  ├── clientPool.ts
  └── __tests__/
      └── server.integration.test.ts
```

**Dependências:**
- Fase 1 e 2 merged

**Merge Criteria:**
- [x] WS conecta com cliente de teste
- [x] Broadcast funciona
- [x] Heartbeat funciona
- [x] Throttling funciona

**Timeline:** 3–4 dias

---

### **Fase 4: Frontend Client** (PR #4)

**Escopo:**
- [ ] LiveClient service (WS connection)
- [ ] LiveStore (Zustand)
- [ ] Auto-reconnect logic
- [ ] Unit tests

**Arquivos:**
```
frontend/src/services/
  └── liveClient.ts
frontend/src/store/
  └── liveStore.ts
frontend/src/services/__tests__/
  └── liveClient.test.ts
```

**Dependências:**
- Fase 3 merged

**Merge Criteria:**
- [x] Conecta ao WS local
- [x] Recebe snapshots
- [x] Auto-reconnect funciona
- [x] Tests passam

**Timeline:** 2–3 dias

---

### **Fase 5: UI Components** (PR #5)

**Escopo:**
- [ ] LiveBadge (status indicator)
- [ ] LiveSetupBanner (instruções)
- [ ] DevTools panel
- [ ] Toggle button

**Arquivos:**
```
frontend/src/components/
  ├── LiveBadge.tsx
  ├── LiveSetupBanner.tsx
  └── LiveDevTools.tsx
```

**Dependências:**
- Fase 4 merged

**Merge Criteria:**
- [x] Badge mostra status correto
- [x] Banner tem instruções completas
- [x] DevTools funciona
- [x] Não quebra UI existente

**Timeline:** 2–3 dias

---

### **Fase 6: Recommendation Fusion** (PR #6)

**Escopo:**
- [ ] RecommendationFusion service
- [ ] mergeLiveWithRecommendations()
- [ ] Live overrides em BuildPanel
- [ ] Live overrides em SkillsPanel
- [ ] Unit tests

**Arquivos:**
```
frontend/src/services/
  └── recommendationFusion.ts
frontend/src/components/
  ├── BuildPanel.tsx (update)
  └── SkillsPanel.tsx (update)
frontend/src/services/__tests__/
  └── recommendationFusion.test.ts
```

**Dependências:**
- Fase 5 merged

**Merge Criteria:**
- [x] BKB priority elevada quando needBkb
- [x] Owned items destacados
- [x] Gold needed calculado
- [x] Tests passam

**Timeline:** 3–4 dias

---

### **Fase 7: E2E Tests** (PR #7)

**Escopo:**
- [ ] Playwright tests
- [ ] Mock GSI sender CLI
- [ ] CI integration

**Arquivos:**
```
frontend/e2e/
  └── liveMode.spec.ts
tools/
  └── mock-gsi-sender.ts
.github/workflows/
  └── e2e-tests.yml (update)
```

**Dependências:**
- Fase 6 merged

**Merge Criteria:**
- [x] 5+ E2E scenarios passam
- [x] Mock CLI funciona
- [x] CI roda E2E em PRs

**Timeline:** 2–3 dias

---

### **Fase 8: Documentation & Polish** (PR #8)

**Escopo:**
- [ ] LIVE_MODE_SETUP.md (guia para usuário)
- [ ] Atualizar README.md
- [ ] Atualizar CLAUDE.md
- [ ] Melhorar error messages
- [ ] Adicionar tooltips

**Arquivos:**
```
LIVE_MODE_SETUP.md (novo)
README.md (update)
CLAUDE.md (update)
frontend/src/components/*.tsx (polish)
```

**Dependências:**
- Fase 7 merged

**Merge Criteria:**
- [x] Docs completos
- [x] Screenshots incluídos
- [x] User testing positivo

**Timeline:** 2 dias

---

### **Fase 9: Beta Release** (Feature Flag ON)

**Ação:**
```bash
# .env
LIVE_MODE_ENABLED=true
```

**Comunicação:**
- [ ] Announce em README: "🧪 Beta: Live Mode"
- [ ] Link para LIVE_MODE_SETUP.md
- [ ] Request for feedback (GitHub Issues)

**Monitoring:**
- [ ] Logs de erros (Sentry ou similar)
- [ ] Métricas de uso (quantos usuários ativam?)
- [ ] Bug reports

**Rollback Plan:**
Se bugs críticos:
```bash
LIVE_MODE_ENABLED=false
```
Nenhum código precisa ser revertido.

**Timeline:** 1–2 semanas de beta

---

### **Fase 10: GA (General Availability)**

**Pré-requisitos:**
- [x] Beta rodou por 2 semanas
- [x] Bugs críticos: 0
- [x] Feedback positivo
- [x] Performance OK (latência, CPU, memory)

**Ação:**
- [ ] Remover "Beta" do README
- [ ] Feature flag permanece (para manutenção futura)
- [ ] Anunciar oficialmente

**Timeline:** Após beta estável

---

## Instruções de QA Manual (por Fase)

### Fase 1–3 (Backend)
```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Send test snapshot
npm run mock-gsi:snapshot

# Verificar logs: deve processar e broadcast
```

### Fase 4 (Frontend Client)
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Mock GSI
npm run mock-gsi:loop

# Browser console: verificar LiveStore atualiza
```

### Fase 5 (UI)
```bash
# Mesmo setup da Fase 4

# Verificar:
# - Badge mostra "🔴 LIVE"
# - Banner tem instruções claras
# - DevTools mostra packets/s
```

### Fase 6 (Fusion)
```bash
# Mesmo setup

# Verificar:
# - Items owned têm borda verde
# - BKB elevado se muitos disables
# - Gold needed correto
```

### Fase 7 (E2E)
```bash
npm run test:e2e
```

### Fase 8 (Docs)
- [ ] Ler LIVE_MODE_SETUP.md
- [ ] Seguir passo-a-passo
- [ ] Confirmar que funciona

---

## Timeline Total Estimado

| Fase | Duração | Acumulado |
|------|---------|-----------|
| 1. Backend Foundation | 2–3 dias | 3 dias |
| 2. API Endpoint | 2–3 dias | 6 dias |
| 3. WebSocket Server | 3–4 dias | 10 dias |
| 4. Frontend Client | 2–3 dias | 13 dias |
| 5. UI Components | 2–3 dias | 16 dias |
| 6. Recommendation Fusion | 3–4 dias | 20 dias |
| 7. E2E Tests | 2–3 dias | 23 dias |
| 8. Documentation | 2 dias | 25 dias |
| 9. Beta Release | 1–2 semanas | 39 dias |
| 10. GA | Após beta | ~45 dias |

**Total:** ~6 semanas até GA (1.5 meses)

---

## PR Template

```markdown
## 🔴 Live Mode: [Fase X] [Título]

### Descrição
[Breve descrição da fase]

### Checklist
- [ ] Código implementado
- [ ] Unit tests escritos e passando
- [ ] Integration tests (se aplicável)
- [ ] Documentação atualizada (LIVE_MODE_ARCHITECTURE.md)
- [ ] QA manual executado
- [ ] LIVE_MODE_ENABLED=false (não impacta prod)

### Como Testar
```bash
# Comandos para testar esta fase
```

### Screenshots/Logs
[Se aplicável]

### Dependências
- Depende de: PR #X (Fase Y)

### Próxima Fase
- Fase [X+1]: [Título]
```

---

## Rollback Strategy

### Se encontrar bug crítico:

1. **Imediato (< 5 min):**
   ```bash
   LIVE_MODE_ENABLED=false
   git push
   ```
   Frontend: usuários não veem mais botão "Enable Live"
   Backend: /gsi retorna 503

2. **Investigação (1–2h):**
   - Reproduzir bug localmente
   - Fix em branch separada
   - Tests para prevenir regressão

3. **Deploy do Fix:**
   - PR com fix + test
   - QA manual
   - Re-enable: `LIVE_MODE_ENABLED=true`

### Se bug não é crítico:
- Criar issue no GitHub
- Priorizar para próxima sprint
- Não desabilitar feature

---

## Success Metrics

### Technical
- [ ] Latência p99 < 200ms
- [ ] Dedup ratio > 70%
- [ ] WS reconnect < 3s
- [ ] Zero crashes em 1 semana
- [ ] Memory leak: 0

### User
- [ ] >10% dos usuários ativos testam Live Mode
- [ ] >80% satisfaction (feedback survey)
- [ ] <5 bug reports por semana (após beta)
- [ ] Avg session duration aumenta >20%

### Business
- [ ] Diferencial competitivo documentado
- [ ] Aumenta retenção de usuários
- [ ] Feedback positivo em reviews

---

**FIM DO PLANO DE IMPLEMENTAÇÃO**

---

# Aprovação

Para aprovar este plano e iniciar a implementação, responda:

```
aprovar live plan
```

Então começarei a abrir PRs seguindo as fases definidas.
