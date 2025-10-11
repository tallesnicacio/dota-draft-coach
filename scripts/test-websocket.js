#!/usr/bin/env node

/**
 * Script de teste para conexão WebSocket
 * Uso: node scripts/test-websocket.js
 */

import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:3001/ws';
const AUTH_TOKEN = process.env.WS_AUTH_TOKEN || '';

console.log('🔍 Testando conexão WebSocket...');
console.log(`URL: ${WS_URL}`);
console.log(`Token: ${AUTH_TOKEN || '(vazio - dev mode)'}\n`);

const ws = new WebSocket(WS_URL);

let connected = false;
let authenticated = false;

ws.on('open', () => {
  console.log('✅ WebSocket conectado!');
  connected = true;

  // Enviar mensagem de autenticação
  const authMessage = {
    type: 'auth',
    token: AUTH_TOKEN,
  };

  console.log('📤 Enviando autenticação...', authMessage);
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Mensagem recebida:', message);

    if (message.type === 'auth_response') {
      if (message.success) {
        console.log('✅ Autenticação bem-sucedida!');
        console.log(`   Client ID: ${message.clientId}`);
        authenticated = true;

        // Testar subscribe
        const subscribeMessage = {
          type: 'subscribe',
          matchId: 'test-match-123',
        };
        console.log('📤 Testando subscribe...', subscribeMessage);
        ws.send(JSON.stringify(subscribeMessage));
      } else {
        console.error('❌ Autenticação falhou:', message.error || message.message);
        ws.close();
      }
    } else if (message.type === 'subscribe_response') {
      if (message.success) {
        console.log('✅ Subscribe bem-sucedido!');
        console.log(`   Match ID: ${message.matchId}`);

        // Teste completo, fechar conexão
        console.log('\n🎉 Todos os testes passaram!');
        setTimeout(() => ws.close(), 1000);
      } else {
        console.error('❌ Subscribe falhou:', message.error);
        ws.close();
      }
    } else if (message.type === 'error') {
      console.error('❌ Erro do servidor:', message.message, `(${message.code || 'UNKNOWN'})`);
    }
  } catch (error) {
    console.error('❌ Erro ao parsear mensagem:', error.message);
    console.log('   Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro WebSocket:', error.message);
  console.error('   Código:', error.code || 'N/A');
  console.error('   Stack:', error.stack);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Conexão fechada`);
  console.log(`   Código: ${code}`);
  console.log(`   Razão: ${reason.toString() || 'N/A'}`);

  if (code === 1006) {
    console.error('\n⚠️  Código 1006 detectado (fechamento anormal)');
    console.error('   Possíveis causas:');
    console.error('   - Servidor rejeitou a conexão');
    console.error('   - Problema de rede');
    console.error('   - Servidor crashou');
  }

  // Verificar se os testes passaram
  if (!connected) {
    console.error('\n❌ FALHA: Não conseguiu conectar ao WebSocket');
    process.exit(1);
  } else if (!authenticated) {
    console.error('\n❌ FALHA: Não conseguiu autenticar');
    process.exit(1);
  } else {
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  }
});

// Timeout de 10s
setTimeout(() => {
  if (!connected || !authenticated) {
    console.error('\n⏱️  Timeout: Conexão/autenticação não completou em 10s');
    ws.close();
    process.exit(1);
  }
}, 10000);
