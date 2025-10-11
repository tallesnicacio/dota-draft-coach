# WebSocket Erro 1006 - Diagnóstico e Solução

## Problema Reportado

**Erro**: WebSocket connection failed com código 1006
**Sintoma**: Conexão falha imediatamente, reconexões crescentes, depois "Max reconnect attempts reached"

## Investigação

### Código 1006
O código 1006 indica **fechamento anormal** da conexão WebSocket, sem uma razão específica. Geralmente ocorre quando:
- Cliente ou servidor força o fechamento sem handshake adequado
- Erro de protocolo ou autenticação prematura
- Problema de rede ou firewall

### Causa Raiz Identificada

O backend estava enviando uma **mensagem `auth_response` prematura** imediatamente após a conexão, antes do cliente ter chance de se autenticar.

**Fluxo com bug:**
```
1. Cliente conecta → onopen
2. Backend envia imediatamente:
   {
     type: 'auth_response',
     success: false,
     error: 'Not authenticated. Send auth message with token.'
   }
3. Frontend recebe mensagem de falha
4. Frontend chama disconnect() (linha 297 de liveClient.ts)
5. Conexão fecha prematuramente → código 1006
6. Cliente tenta reconectar → loop infinito
```

**Código problemático** (backend/src/websocket/server.ts:98-102):
```typescript
// Send initial message (not authenticated yet)
this.sendMessage(authWs, {
  type: 'auth_response',
  success: false,
  error: 'Not authenticated. Send auth message with token.',
});
```

**Comportamento do frontend** (frontend/src/services/liveClient.ts:288-298):
```typescript
private handleAuthResponse(message: AuthResponseMessage): void {
  if (message.success) {
    // ... autenticação OK
  } else {
    console.error('[LiveClient] Authentication failed', message.message);
    useLiveStore.getState().setError(`Authentication failed: ${message.message}`);
    this.disconnect(); // ← Desconecta imediatamente!
  }
}
```

### Diagnóstico Realizado

1. **Logs do Backend**: WebSocket server iniciava corretamente
2. **Teste Manual**: Script `test-websocket.js` revelou duas mensagens:
   - Primeira: `{ success: false }` (prematura)
   - Segunda: `{ success: true }` (após autenticação real)
3. **Análise de Código**: Frontend recebia primeira mensagem e desconectava

## Solução Implementada

### 1. Remover Mensagem Prematura

**Arquivo**: `backend/src/websocket/server.ts`

```diff
  // Setup event handlers
  authWs.on('message', (data) => this.handleMessage(authWs, data));
  authWs.on('pong', () => this.handlePong(authWs));
  authWs.on('close', () => this.handleClose(authWs));
  authWs.on('error', (error) => this.handleError(authWs, error));

- // Send initial message (not authenticated yet)
- this.sendMessage(authWs, {
-   type: 'auth_response',
-   success: false,
-   error: 'Not authenticated. Send auth message with token.',
- });
+ // Client will send auth message - no need for initial message
}
```

**Justificativa**:
- Cliente sempre envia mensagem `auth` ao conectar
- Não há necessidade de avisar que não está autenticado
- Backend já valida autenticação em todas as mensagens subsequentes

### 2. Script de Teste

**Arquivo**: `scripts/test-websocket.js`

Script Node.js para testar conexão WebSocket automaticamente:
- Conecta ao servidor
- Envia autenticação
- Testa subscribe
- Verifica códigos de fechamento
- Timeout de 10s

**Uso**:
```bash
node scripts/test-websocket.js
```

**Saída esperada**:
```
🔍 Testando conexão WebSocket...
✅ WebSocket conectado!
✅ Autenticação bem-sucedida!
✅ Subscribe bem-sucedido!
🎉 Todos os testes passaram!
```

### 3. Arquivos .env Criados

**backend/.env**:
```bash
PORT=3001
NODE_ENV=development
PATCH_PADRAO=7.39e
MMR_PADRAO=3000
CACHE_TTL=21600
# WS_AUTH_TOKEN=  # vazio em dev
```

**frontend/.env**:
```bash
VITE_WS_AUTH_TOKEN=  # vazio em dev
```

## Testes Realizados

### 1. Script Automatizado
```bash
$ node scripts/test-websocket.js
✅ WebSocket conectado!
✅ Autenticação bem-sucedida!
✅ Subscribe bem-sucedido!
🎉 Todos os testes passaram!
```

### 2. Testes Unitários
```bash
$ npm test
Test Files  6 passed (6)
Tests  88 passed (88)
```

### 3. Teste Manual (Browser DevTools)
```javascript
const ws = new WebSocket('ws://127.0.0.1:3001/ws');
ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ type: 'auth', token: '' }));
};
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
// Resultado: auth_response com success: true ✅
```

## Fluxo Correto Agora

```
1. Cliente conecta → onopen
2. Cliente envia: { type: 'auth', token: '' }
3. Backend valida token
4. Backend responde: { type: 'auth_response', success: true, clientId: '...' }
5. Frontend recebe sucesso → setStatus('connected')
6. Conexão permanece aberta ✅
7. Cliente pode fazer subscribe/unsubscribe
```

## Como Prevenir Problemas Similares

### 1. Sempre Testar WebSocket com Script
```bash
node scripts/test-websocket.js
```

### 2. Verificar Logs do Backend
```bash
npm run dev:backend
# Procurar por:
# [INFO] Client connected
# [INFO] Client authenticated
```

### 3. DevTools do Navegador
- **Network** → **WS** → Ver mensagens trocadas
- **Console** → Ver logs do `liveClient.ts`

### 4. Checklist de Verificação
- [ ] Backend está rodando na porta 3001?
- [ ] WebSocket server iniciou? (`WebSocket server started`)
- [ ] Cliente conecta? (`Client connected`)
- [ ] Cliente autentica? (`Client authenticated`)
- [ ] Não há código 1006 nos logs?

## Arquivos Modificados

1. **backend/src/websocket/server.ts** - Removida mensagem prematura
2. **scripts/test-websocket.js** - Script de teste (novo)
3. **backend/.env** - Variáveis de ambiente (novo)
4. **frontend/.env** - Variáveis de ambiente (novo)
5. **WEBSOCKET_1006_FIX.md** - Este documento (novo)

## Comandos Úteis

```bash
# Testar WebSocket
node scripts/test-websocket.js

# Iniciar dev servers
npm run dev

# Verificar portas em uso
./scripts/check-ports.sh

# Limpar processos
pkill -f "tsx watch" && pkill -f "vite"

# Rodar testes
npm test
```

## Métricas

**Antes do Fix**:
- ❌ Código 1006 em todas as tentativas
- ❌ Reconexões infinitas
- ❌ Live Mode não funcionava

**Depois do Fix**:
- ✅ Conexão estável (código 1005 no fechamento normal)
- ✅ Autenticação bem-sucedida
- ✅ Subscribe/unsubscribe funcionando
- ✅ 88/88 testes passando
- ✅ Live Mode operacional

## Referências

- WebSocket Close Codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
- Código 1006: Abnormal Closure (sem handshake)
- Código 1005: No Status Received (fechamento normal no script de teste)
- Código 1000: Normal Closure (client.disconnect())

## Conclusão

O erro 1006 foi causado por uma **race condition no protocolo de autenticação**. O backend enviava mensagem de falha antes do cliente ter chance de se autenticar, causando desconexão prematura.

A solução foi **remover a mensagem prematura**, permitindo que o cliente inicie o fluxo de autenticação corretamente. Agora o Live Mode funciona conforme esperado.

**Status**: ✅ Resolvido
**Data**: 2025-10-11
**Commit**: Próximo
