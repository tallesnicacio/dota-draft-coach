# WebSocket Connection Error - Diagnóstico e Solução

## Problema Reportado

**Erro**: `WebSocket connection error` ao tentar usar o Live Mode

**Sintomas**:
- Frontend exibe erro no LiveBadge
- Status fica em "Erro" ao invés de "Conectando..." ou "LIVE"
- Nenhuma atualização em tempo real do Dota 2

## Causa Raiz

A porta 3001 estava sendo usada por outro processo, impedindo o backend de iniciar corretamente.

### Como Isso Aconteceu

1. Usuário executou `npm start &` (background) ou deixou uma instância anterior rodando
2. Nova tentativa de `npm run dev` falhou com `EADDRINUSE: address already in use :::3001`
3. Backend não inicializou, mas frontend tentou conectar ao WebSocket
4. Resultado: `WebSocket connection error`

## Solução Implementada

### 1. Script de Diagnóstico

Criado `scripts/check-ports.sh` para identificar e resolver conflitos de porta:

```bash
./scripts/check-ports.sh
```

**Saída esperada**:
```
🔍 Verificando portas necessárias...

✅ Porta 3001 (Backend/WebSocket) está DISPONÍVEL
✅ Porta 5173 (Frontend) está DISPONÍVEL

✅ Todas as portas estão disponíveis!
   Você pode executar: npm run dev
```

Se houver conflito:
```
❌ Porta 3001 (Backend/WebSocket) está EM USO
   PID: 14387
   Processo: node
   Para liberar: kill 14387
```

### 2. Tratamento de Erro Melhorado

Modificado `backend/src/server.ts` para detectar e reportar conflitos de porta:

```typescript
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Porta ${PORT} já está em uso!`);
    console.error(`\nPara resolver:`);
    console.error(`1. Verifique processos: lsof -ti:${PORT}`);
    console.error(`2. Mate o processo: kill $(lsof -ti:${PORT})`);
    console.error(`3. Use: ./scripts/check-ports.sh`);
    process.exit(1);
  }
});
```

**Agora o erro é claro e acionável!**

### 3. Documentação Atualizada

Adicionado em `CLAUDE.md` seção "Troubleshooting Comum":
- Porta em Uso (EADDRINUSE)
- WebSocket Connection Error
- Comandos de diagnóstico e solução

## Como Usar

### Antes de Iniciar o Dev Server

```bash
# Opção 1: Verificar portas com script
./scripts/check-ports.sh

# Opção 2: Manual
lsof -ti:3001  # Se retornar PID, porta está em uso
```

### Se Porta Estiver em Uso

```bash
# Matar processo específico
kill $(lsof -ti:3001)

# OU matar todos os processos node (cuidado!)
pkill -f node
```

### Iniciar Dev Server

```bash
npm run dev
```

**Saída esperada**:
```
[0] [10:15:16 UTC] INFO: WebSocket server started
[0]     path: "/ws"
[0]     heartbeatInterval: 30000
[0] [10:15:16 UTC] INFO: 🚀 Dota 2 Coach Backend rodando
[0]     port: "3001"
[0]     wsEnabled: true
[1]   ➜  Local:   http://localhost:5173/
```

## Testes de Verificação

### 1. Backend Iniciando

```bash
npm run dev:backend
# Deve mostrar: "🚀 Dota 2 Coach Backend rodando"
# Deve mostrar: "WebSocket server started"
```

### 2. WebSocket Acessível

```bash
curl -i http://localhost:3001/ws
# Deve retornar: 400 Bad Request (esperado, não é HTTP request)
```

Ou via browser DevTools:
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onopen = () => console.log('Connected!');
// Deve conectar (mas falhar na autenticação, ok)
```

### 3. Frontend Conectando

1. Abrir `http://localhost:5173`
2. Clicar no botão "Desconectado" no header
3. Deve mudar para "Conectando..." e depois "LIVE" (ou "Erro" se não autenticado, mas SEM "WebSocket connection error")

## Prevenção

### ✅ Boas Práticas

```bash
# Use sempre npm run dev para desenvolvimento
npm run dev

# Se precisar parar, use Ctrl+C (não deixe em background)
```

### ❌ Evite

```bash
# NÃO use background (&) em desenvolvimento
npm start &  # ❌ Evitar

# NÃO inicie múltiplas instâncias
npm run dev  # OK
npm run dev  # ❌ Conflito!
```

## Checklist de Resolução

Quando encontrar "WebSocket connection error":

- [ ] Verificar se backend está rodando: `lsof -ti:3001`
- [ ] Se não estiver, iniciar: `npm run dev`
- [ ] Se estiver mas com erro, verificar logs do terminal
- [ ] Se porta em uso, matar processo: `kill $(lsof -ti:3001)`
- [ ] Reiniciar: `npm run dev`
- [ ] Testar no frontend (clicar em "Desconectado")
- [ ] Se ainda falhar, verificar logs do navegador (F12 > Console)

## Arquivos Modificados

1. **backend/src/server.ts**: Tratamento de erro EADDRINUSE
2. **scripts/check-ports.sh**: Script de diagnóstico (novo)
3. **CLAUDE.md**: Documentação de troubleshooting
4. **WEBSOCKET_FIX.md**: Este documento (novo)

## Commits Relacionados

- Commit anterior: Fase 6 - Recommendation Fusion (cca25ba)
- Commit atual: Fix WebSocket port conflict error

## Referências

- Issue original: Usuário reportou "Erro: WebSocket connection error"
- Root cause: EADDRINUSE na porta 3001
- Solução: Script de diagnóstico + tratamento de erro + documentação
