#!/usr/bin/env tsx
/**
 * Mock GSI Sender - Simula Dota 2 Client enviando payloads GSI
 *
 * Uso:
 *   npm run mock-gsi:heartbeat    - Envia um heartbeat único
 *   npm run mock-gsi:snapshot     - Envia um snapshot de jogo
 *   npm run mock-gsi:simulate     - Simula partida completa (40 min)
 *   npm run mock-gsi:loop          - Loop infinito com variação
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const GSI_ENDPOINT = process.env.GSI_ENDPOINT || 'http://127.0.0.1:3001/api/gsi';
const AUTH_TOKEN = process.env.GSI_AUTH_TOKEN || 'COACH_LOCAL_SECRET';

interface GsiPayload {
  auth: { token: string };
  provider: {
    name: string;
    appid: number;
    version: number;
    timestamp: number;
  };
  map?: any;
  player?: any;
  hero?: any;
  abilities?: any;
  items?: any;
  draft?: any;
}

/**
 * Envia um payload GSI para o backend
 */
async function sendSnapshot(payload: GsiPayload): Promise<void> {
  try {
    const response = await fetch(GSI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const statusText = response.statusText;

    if (status === 200) {
      const body = await response.json();
      console.log(`✅ Snapshot enviado com sucesso (200 OK)`);
      console.log(`   Broadcast: ${body.broadcast ? 'Sim' : 'Não'}`);
      if (body.wsBroadcastCount !== undefined) {
        console.log(`   Clientes WS: ${body.wsBroadcastCount}`);
      }
    } else if (status === 204) {
      console.log(`⏭️  Snapshot duplicado (204 No Content) - não fez broadcast`);
    } else {
      const body = await response.text();
      console.error(`❌ Erro ${status} ${statusText}: ${body}`);
    }
  } catch (error: any) {
    console.error(`❌ Erro ao enviar snapshot: ${error.message}`);
    console.error(`   Endpoint: ${GSI_ENDPOINT}`);
    console.error(`   Certifique-se que o backend está rodando!`);
    process.exit(1);
  }
}

/**
 * Carrega um fixture JSON
 */
function loadFixture(filename: string): GsiPayload {
  const fixturePath = join(__dirname, '../backend/src/gsi/__fixtures__', filename);
  try {
    const content = readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    console.error(`❌ Erro ao carregar fixture ${filename}: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Gera um snapshot sintético para um tempo específico
 */
function generateSnapshotAtTime(gameTime: number): GsiPayload {
  const clockTime = gameTime - 20; // Pre-horn offset
  const daytime = (gameTime % 600) < 300; // 5 min dia, 5 min noite

  return {
    auth: { token: AUTH_TOKEN },
    provider: {
      name: 'Dota 2',
      appid: 570,
      version: 53,
      timestamp: Math.floor(Date.now() / 1000),
    },
    map: {
      matchid: `sim_match_${Date.now()}`,
      clock_time: clockTime,
      game_time: gameTime,
      daytime: daytime,
      nightstalker_night: false,
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      paused: false,
      win_team: 'none',
      customgamename: '',
      ward_purchase_cooldown: 0,
    },
    player: {
      steamid: '76561198012345678',
      accountid: '12345678',
      name: 'Mock Player',
      activity: 'playing',
      kills: Math.floor(gameTime / 120), // 1 kill a cada 2 min
      deaths: Math.floor(gameTime / 180), // 1 death a cada 3 min
      assists: Math.floor(gameTime / 90), // 1 assist a cada 1.5 min
      last_hits: Math.floor(gameTime / 8), // ~7.5 LH/min
      denies: Math.floor(gameTime / 40), // ~1.5 deny/min
      kill_streak: 0,
      commands_issued: gameTime * 10,
      team_name: 'radiant',
      gold: 500 + (gameTime * 10), // ~600 GPM
      gold_reliable: Math.floor((500 + gameTime * 10) * 0.5),
      gold_unreliable: Math.floor((500 + gameTime * 10) * 0.5),
      gold_from_hero_kills: 0,
      gold_from_creep_kills: gameTime * 8,
      gold_from_income: gameTime * 2,
      gold_from_shared: 0,
      gpm: Math.floor(((500 + gameTime * 10) / gameTime) * 60),
      xpm: Math.floor(((gameTime * 100) / gameTime) * 60),
    },
    hero: {
      xpos: -1000 + Math.floor(Math.random() * 2000),
      ypos: -1000 + Math.floor(Math.random() * 2000),
      id: 46, // Templar Assassin
      name: 'npc_dota_hero_templar_assassin',
      level: Math.min(30, 1 + Math.floor(gameTime / 60)), // Level up a cada 1 min
      xp: gameTime * 100,
      alive: true,
      respawn_seconds: 0,
      buyback_cost: 100 + Math.floor(gameTime / 5),
      buyback_cooldown: 0,
      health: 1000 + (gameTime * 5),
      max_health: 1200 + (gameTime * 5),
      health_percent: 85,
      mana: 500 + (gameTime * 2),
      max_mana: 800 + (gameTime * 2),
      mana_percent: 65,
      silenced: false,
      stunned: false,
      disarmed: false,
      magicimmune: false,
      hexed: false,
      muted: false,
      break: false,
      smoked: false,
      has_debuff: false,
      talent_1: false,
      talent_2: false,
      talent_3: gameTime > 900, // Talent lvl 15 após 15 min
      talent_4: false,
      talent_5: false,
      talent_6: false,
      talent_7: false,
      talent_8: false,
    },
    abilities: {
      ability0: {
        name: 'templar_assassin_refraction',
        level: Math.min(4, Math.floor(gameTime / 300)),
        can_cast: true,
        passive: false,
        ability_active: false,
        cooldown: 0,
        ultimate: false,
      },
      ability1: {
        name: 'templar_assassin_meld',
        level: Math.min(4, Math.floor(gameTime / 400)),
        can_cast: true,
        passive: false,
        ability_active: false,
        cooldown: 0,
        ultimate: false,
      },
      ability2: {
        name: 'templar_assassin_psi_blades',
        level: Math.min(4, Math.floor(gameTime / 350)),
        can_cast: false,
        passive: true,
        ability_active: false,
        cooldown: 0,
        ultimate: false,
      },
      ability3: {
        name: 'templar_assassin_trap',
        level: Math.min(3, Math.floor(gameTime / 600)),
        can_cast: true,
        passive: false,
        ability_active: false,
        cooldown: 0,
        ultimate: true,
        charges: 3,
        max_charges: 3,
      },
    },
    items: {
      slot0: {
        name: 'item_power_treads',
        purchaser: 0,
        can_cast: true,
        cooldown: 0,
        passive: false,
        charges: 0,
      },
      slot1: {
        name: gameTime > 600 ? 'item_desolator' : 'item_wraith_band',
        purchaser: 0,
        can_cast: false,
        cooldown: 0,
        passive: true,
        charges: 0,
      },
      slot2: {
        name: gameTime > 900 ? 'item_blink' : 'empty',
        purchaser: 0,
        can_cast: gameTime > 900,
        cooldown: 0,
        passive: false,
        charges: 0,
      },
      slot3: {
        name: gameTime > 1200 ? 'item_black_king_bar' : 'empty',
        purchaser: 0,
        can_cast: gameTime > 1200,
        cooldown: 0,
        passive: false,
        charges: 0,
      },
      slot4: {
        name: 'item_tpscroll',
        purchaser: 0,
        can_cast: true,
        cooldown: 0,
        passive: false,
        charges: 1,
      },
      slot5: {
        name: 'empty',
      },
    },
  };
}

/**
 * Delay em ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ====== Comandos ======

async function heartbeat() {
  console.log('📡 Enviando heartbeat...\n');

  const payload: GsiPayload = {
    auth: { token: AUTH_TOKEN },
    provider: {
      name: 'Dota 2',
      appid: 570,
      version: 53,
      timestamp: Math.floor(Date.now() / 1000),
    },
  };

  await sendSnapshot(payload);
}

async function snapshot() {
  console.log('📦 Enviando snapshot de jogo...\n');

  const payload = loadFixture('gsi-payload-full.json');
  payload.auth.token = AUTH_TOKEN;
  payload.provider.timestamp = Math.floor(Date.now() / 1000);

  await sendSnapshot(payload);
}

async function simulate(durationSeconds = 2400) {
  console.log(`🎮 Simulando partida de ${Math.floor(durationSeconds / 60)} minutos...\n`);
  console.log(`   Enviando snapshots a cada 2 segundos`);
  console.log(`   Pressione Ctrl+C para parar\n`);

  for (let t = 0; t < durationSeconds; t += 2) {
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;
    console.log(`⏱️  Tempo de jogo: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    const payload = generateSnapshotAtTime(t);
    await sendSnapshot(payload);

    await sleep(2000);
  }

  console.log('\n✅ Simulação completa!');
}

async function loop() {
  console.log('🔄 Loop infinito com variação aleatória...\n');
  console.log(`   Intervalo: 1 segundo`);
  console.log(`   Pressione Ctrl+C para parar\n`);

  let gameTime = 0;

  while (true) {
    gameTime += 1;
    const payload = generateSnapshotAtTime(gameTime);

    // Adiciona variação aleatória no gold
    payload.player!.gold += Math.floor(Math.random() * 100);

    await sendSnapshot(payload);
    await sleep(1000);
  }
}

// ====== CLI ======

const command = process.argv[2] || 'heartbeat';

switch (command) {
  case 'heartbeat':
    await heartbeat();
    break;
  case 'snapshot':
    await snapshot();
    break;
  case 'simulate':
    const duration = parseInt(process.argv[3]) || 2400;
    await simulate(duration);
    break;
  case 'loop':
    await loop();
    break;
  default:
    console.error(`Comando desconhecido: ${command}`);
    console.log('\nUso:');
    console.log('  tsx tools/mock-gsi-sender.ts heartbeat    - Envia heartbeat único');
    console.log('  tsx tools/mock-gsi-sender.ts snapshot     - Envia snapshot de jogo');
    console.log('  tsx tools/mock-gsi-sender.ts simulate [s] - Simula partida (padrão: 2400s/40min)');
    console.log('  tsx tools/mock-gsi-sender.ts loop         - Loop infinito');
    process.exit(1);
}
