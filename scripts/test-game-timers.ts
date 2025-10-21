/**
 * Script de teste para validar sistema de timers automáticos baseado em tempo
 *
 * Este script simula um jogo de Dota 2 progredindo pelo tempo,
 * enviando payloads GSI que ativam timers automaticamente.
 *
 * Eventos testados:
 * - Bounty Runes: 0:00, 3:00, 6:00...
 * - Power Runes: 7:00, 14:00...
 * - Water Runes: 2:00, 4:00, 6:00...
 * - Tormentor: 20:00, 30:00...
 * - Lotus Pool: 7:00, 10:00...
 * - Outpost: 10:00, 15:00...
 * - Stack: X:53 every minute
 *
 * Uso:
 * ```bash
 * npx tsx scripts/test-game-timers.ts
 * ```
 */

import { GsiPayload } from '../backend/src/gsi/types.js';

const GSI_ENDPOINT = 'http://localhost:3001/api/gsi';
const AUTH_TOKEN = process.env.GSI_AUTH_TOKEN || 'COACH_LOCAL_SECRET';

// Helper para criar payload base
function createGamePayload(gameTime: number): GsiPayload {
  return {
    auth: {
      token: AUTH_TOKEN,
    },
    provider: {
      name: 'Dota 2',
      appid: 570,
      version: 60,
      timestamp: Math.floor(Date.now() / 1000),
    },
    map: {
      name: 'dota',
      matchid: `test-match-${Date.now()}`,
      game_time: gameTime,
      clock_time: gameTime,
      daytime: gameTime % 600 < 300, // Day/night cycle (5 min each)
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      paused: false,
      win_team: 'none',
      ward_purchase_cooldown: 0,
    },
    player: {
      steamid: '76561198012345678',
      accountid: '52079950',
      name: 'TestPlayer',
      activity: 'playing',
      team_name: 'radiant',
      kills: Math.floor(gameTime / 120),
      deaths: Math.floor(gameTime / 240),
      assists: Math.floor(gameTime / 80),
      last_hits: Math.floor(gameTime / 5),
      denies: Math.floor(gameTime / 30),
      gold: 625 + Math.floor(gameTime * 5),
      gold_reliable: 300,
      gold_unreliable: 325 + Math.floor(gameTime * 5),
      gpm: Math.floor((625 + gameTime * 5) / (gameTime / 60 || 1)),
      xpm: Math.floor(500 + gameTime / 2),
    },
    hero: {
      id: 1, // Anti-Mage
      name: 'npc_dota_hero_antimage',
      level: Math.min(30, Math.floor(1 + gameTime / 60)),
      xp: Math.floor(gameTime * 50),
      alive: true,
      respawn_seconds: 0,
      buyback_cost: 100 + Math.floor(gameTime / 60) * 50,
      buyback_cooldown: 0,
      health: 1200 + Math.floor(gameTime / 60) * 50,
      max_health: 1500 + Math.floor(gameTime / 60) * 50,
      health_percent: 80,
      mana: 400,
      max_mana: 600,
      mana_percent: 66,
      xpos: 1000 + Math.floor(gameTime * 10),
      ypos: 2000 + Math.floor(gameTime * 5),
    },
    draft: {
      activeteam: 2,
      pick: false,
      activeteam_time_remaining: 30,
      radiant_bonus_time: 130,
      dire_bonus_time: 130,
      team2: {
        // Radiant (player's team)
        home_team: true,
        pick0_id: 1, // Anti-Mage (player)
        pick0_class: 'npc_dota_hero_antimage',
        pick1_id: 5, // Crystal Maiden
        pick1_class: 'npc_dota_hero_crystal_maiden',
        pick2_id: 11, // Shadow Fiend
        pick2_class: 'npc_dota_hero_nevermore',
        pick3_id: 14, // Pudge
        pick3_class: 'npc_dota_hero_pudge',
        pick4_id: 20, // Lina
        pick4_class: 'npc_dota_hero_lina',
      },
      team3: {
        // Dire (enemies)
        home_team: false,
        pick0_id: 2, // Axe
        pick0_class: 'npc_dota_hero_axe',
        pick1_id: 3, // Bane
        pick1_class: 'npc_dota_hero_bane',
        pick2_id: 4, // Bloodseeker
        pick2_class: 'npc_dota_hero_bloodseeker',
        pick3_id: 6, // Drow Ranger
        pick3_class: 'npc_dota_hero_drow_ranger',
        pick4_id: 7, // Earthshaker
        pick4_class: 'npc_dota_hero_earthshaker',
      },
    },
  };
}

async function sendPayload(payload: GsiPayload): Promise<void> {
  try {
    const response = await fetch(GSI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const gameTime = payload.map?.game_time || 0;
      const mins = Math.floor(gameTime / 60);
      const secs = Math.floor(gameTime % 60);
      console.log(
        `✅ ${mins}:${secs.toString().padStart(2, '0')} - Payload enviado (${response.status})`
      );
    } else {
      console.error(`❌ Erro: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateGame() {
  console.log('🎮 Iniciando simulação de jogo Dota 2\n');
  console.log('📍 Endpoint: ' + GSI_ENDPOINT);
  console.log('🔑 Auth Token: ' + AUTH_TOKEN);
  console.log('\n⏱️  Eventos esperados:');
  console.log('  💰 Bounty Runes: 0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00');
  console.log('  💧 Water Runes: 2:00, 4:00, 6:00, 8:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00');
  console.log('  ⚡ Power Runes: 7:00, 14:00, 21:00');
  console.log('  🪷 Lotus Pool: 7:00, 10:00, 13:00, 16:00, 19:00, 22:00');
  console.log('  🏰 Outpost XP: 10:00, 15:00, 20:00');
  console.log('  👹 Tormentor: 20:00');
  console.log('  🏕️  Stack Camp: X:53 every minute\n');

  await sleep(2000);

  // Simulate game progression
  // Key moments: 0s, 2min, 3min, 6min, 7min, 10min, 14min, 20min
  const keyMoments = [
    0, // 0:00 - Bounty runes
    53, // 0:53 - Stack
    120, // 2:00 - Water rune
    180, // 3:00 - Bounty rune
    240, // 4:00 - Water rune
    360, // 6:00 - Bounty + Water
    420, // 7:00 - Power rune + Lotus
    480, // 8:00 - Water rune
    540, // 9:00 - Bounty rune
    600, // 10:00 - Water + Outpost + Lotus
    720, // 12:00 - Bounty + Water
    780, // 13:00 - Lotus
    840, // 14:00 - Power + Water
    900, // 15:00 - Outpost
    960, // 16:00 - Water + Lotus
    1080, // 18:00 - Bounty + Water
    1140, // 19:00 - Lotus
    1200, // 20:00 - Tormentor + Water + Outpost
    1260, // 21:00 - Power + Bounty
    1320, // 22:00 - Water + Lotus
  ];

  for (const gameTime of keyMoments) {
    console.log(`\n🕐 Simulando tempo de jogo: ${formatTime(gameTime)}`);
    await sendPayload(createGamePayload(gameTime));
    await sleep(1000); // Wait 1s between payloads
  }

  console.log('\n\n✅ Simulação completa!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Abra o frontend (http://localhost:5173)');
  console.log('2. Ative o Live Mode no badge superior direito');
  console.log('3. Verifique os timers aparecendo automaticamente');
  console.log('4. Timers devem ter badge "Auto" ⚡');
  console.log('5. Heróis devem aparecer no draft automaticamente\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

simulateGame().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
