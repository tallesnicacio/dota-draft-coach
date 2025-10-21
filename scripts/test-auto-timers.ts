/**
 * Script de teste para validar timers automáticos via GSI
 *
 * Este script simula payloads do Dota 2 GSI para testar a detecção
 * automática de eventos e criação de timers.
 *
 * Uso:
 * ```bash
 * npx tsx scripts/test-auto-timers.ts
 * ```
 */

import { GsiPayload } from '../backend/src/gsi/types.js';

const GSI_ENDPOINT = 'http://localhost:3001/api/gsi';
const AUTH_TOKEN = process.env.GSI_AUTH_TOKEN || 'dev_token_12345';

// Helper para criar payload base
function createBasePayload(gameTime: number): GsiPayload {
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
      matchid: 'test-match-12345',
      game_time: gameTime,
      clock_time: gameTime,
      daytime: true,
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
      kills: 5,
      deaths: 2,
      assists: 8,
      last_hits: 120,
      denies: 10,
      gold: 3500,
      gold_reliable: 1500,
      gold_unreliable: 2000,
      gpm: 450,
      xpm: 550,
    },
    hero: {
      id: 1,
      name: 'npc_dota_hero_antimage',
      level: 12,
      xp: 8500,
      alive: true,
      respawn_seconds: 0,
      buyback_cost: 300,
      buyback_cooldown: 0,
      health: 1200,
      max_health: 1500,
      health_percent: 80,
      mana: 400,
      max_mana: 600,
      mana_percent: 66,
      xpos: 1000,
      ypos: 2000,
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

    const statusText = response.statusText || 'Unknown';

    if (response.ok) {
      console.log(`✅ Payload enviado com sucesso (${response.status} ${statusText})`);
    } else {
      const errorText = await response.text().catch(() => 'No error message');
      console.error(`❌ Erro ao enviar payload: ${response.status} ${statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  }
}

async function testRuneTimers() {
  console.log('\n🧪 Teste 1: Timer de Runa de Poder\n');

  // Simular jogo começando
  console.log('📤 Enviando payload: início do jogo (0:00)');
  await sendPayload(createBasePayload(0));
  await sleep(1000);

  // Simular 7 minutos (primeira runa de poder)
  console.log('📤 Enviando payload: 7:00 (primeira runa de poder)');
  await sendPayload(createBasePayload(420));
  await sleep(1000);

  // Simular 14 minutos (segunda runa de poder)
  console.log('📤 Enviando payload: 14:00 (segunda runa de poder)');
  await sendPayload(createBasePayload(840));
  await sleep(1000);

  console.log('✅ Teste de runa concluído!\n');
}

async function testWardCooldown() {
  console.log('\n🧪 Teste 2: Timer de Ward Cooldown\n');

  // Simular compra de ward (cooldown ativo)
  console.log('📤 Enviando payload: ward comprada (cooldown 160s)');
  const payloadWithWard = createBasePayload(300);
  if (payloadWithWard.map) {
    payloadWithWard.map.ward_purchase_cooldown = 160;
  }
  await sendPayload(payloadWithWard);
  await sleep(1000);

  // Simular cooldown reduzindo
  console.log('📤 Enviando payload: cooldown restante 80s');
  const payloadHalfCooldown = createBasePayload(380);
  if (payloadHalfCooldown.map) {
    payloadHalfCooldown.map.ward_purchase_cooldown = 80;
  }
  await sendPayload(payloadHalfCooldown);
  await sleep(1000);

  // Simular cooldown terminado
  console.log('📤 Enviando payload: cooldown terminado');
  const payloadNoCooldown = createBasePayload(460);
  if (payloadNoCooldown.map) {
    payloadNoCooldown.map.ward_purchase_cooldown = 0;
  }
  await sendPayload(payloadNoCooldown);
  await sleep(1000);

  console.log('✅ Teste de ward concluído!\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Iniciando testes de timers automáticos\n');
  console.log(`📍 Endpoint: ${GSI_ENDPOINT}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN}\n`);
  console.log('⚠️  Certifique-se que o backend está rodando!\n');

  await sleep(2000);

  await testRuneTimers();
  await testWardCooldown();

  console.log('\n🎉 Todos os testes concluídos!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Abra o frontend (http://localhost:5173)');
  console.log('2. Ative o Live Mode no LiveBadge');
  console.log('3. Verifique se os timers automáticos aparecem com badge "Auto"');
  console.log('4. Execute este script novamente para ver novos timers sendo criados\n');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
