# 🎮 Live Mode - Guia de Configuração

**Live Mode** permite que o Dota 2 Coach receba dados em tempo real durante suas partidas, fornecendo recomendações dinâmicas baseadas no estado atual do jogo.

---

## 📋 Pré-requisitos

- ✅ Dota 2 instalado via Steam
- ✅ Dota 2 Coach backend rodando localmente (`npm run dev` ou `npm start`)
- ✅ Dota 2 Coach frontend aberto no navegador

---

## ⚙️ Configuração Rápida

### Passo 1: Criar Arquivo de Configuração

1. **Localize a pasta de configuração do Dota 2:**

   **Windows:**
   ```
   C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\
   ```

   **Linux:**
   ```
   ~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
   ```

   **macOS:**
   ```
   ~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
   ```

2. **Crie o diretório se não existir:**

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration"
   ```

   **Linux/macOS:**
   ```bash
   mkdir -p ~/.steam/steam/steamapps/common/dota\ 2\ beta/game/dota/cfg/gamestate_integration
   ```

3. **Crie o arquivo `gamestate_integration_coach.cfg`** neste diretório com o seguinte conteúdo:

```
"Dota2 Coach Live"
{
  "uri"           "http://127.0.0.1:3001/api/gsi"
  "timeout"       "5.0"
  "buffer"        "0.1"
  "throttle"      "0.1"
  "heartbeat"     "30.0"
  "data"
  {
    "provider"      "1"
    "map"           "1"
    "player"        "1"
    "hero"          "1"
    "abilities"     "1"
    "items"         "1"
    "draft"         "1"
  }
  "auth"
  {
    "token"         "COACH_LOCAL_SECRET"
  }
}
```

4. **⚠️ IMPORTANTE: Certifique-se que o token no arquivo corresponde ao configurado no backend!**

   Por padrão, o backend usa `COACH_LOCAL_SECRET`. Para alterar:

   **Backend (.env no diretório `backend/`):**
   ```env
   GSI_AUTH_TOKEN=SEU_TOKEN_AQUI
   ```

   **Arquivo GSI (gamestate_integration_coach.cfg):**
   ```
   "token"         "SEU_TOKEN_AQUI"
   ```

---

### Passo 2: Habilitar GSI no Dota 2

1. Abra o **Steam**
2. Clique com botão direito em **Dota 2** → **Propriedades**
3. Em **Opções de Inicialização**, adicione:
   ```
   -gamestateintegration
   ```
4. Feche e salve

![Steam Launch Options](https://via.placeholder.com/800x200.png?text=Steam+%3E+Dota+2+%3E+Propriedades+%3E+Opções+de+Inicialização)

---

### Passo 3: Iniciar Aplicação

1. **Inicie o backend:**
   ```bash
   npm run dev:backend
   # ou em produção
   npm start
   ```

   Você deve ver no log:
   ```
   🔴 WebSocket server started on /ws
   🚀 Server running on port 3001
   ```

2. **Inicie o frontend:**
   ```bash
   npm run dev:frontend
   ```

   Acesse: http://localhost:5173

3. **Inicie o Dota 2**

---

### Passo 4: Habilitar Live Mode no App

1. No Dota 2 Coach, procure pelo botão **"Enable Live Mode"** ou ícone de status no canto superior direito
2. Clique para habilitar
3. O status deve mudar para **🔴 LIVE** (conectado)

---

## ✅ Verificação

### No Menu do Dota 2

1. Abra o Dota 2 (mesmo só no menu principal)
2. Verifique os logs do backend - deve aparecer:
   ```
   GSI snapshot processed (heartbeat)
   ```

### Durante uma Partida

1. Entre em uma partida (Hero Demo é suficiente para testar)
2. O app deve mostrar:
   - Herói atual
   - Level e items
   - Gold e stats
   - Recomendações dinâmicas

3. Compre um item → o app deve atualizar em menos de 1 segundo

---

## 🔧 Troubleshooting

### ❌ "Disconnected" ou "Reconnecting..."

**Possíveis causas:**

1. **Backend não está rodando**
   - Verifique se o backend está ativo: http://localhost:3001/health
   - Deve retornar: `{"status":"ok",...}`

2. **Token inválido**
   - Verifique que o token no `.cfg` é o mesmo do backend
   - Veja logs do backend: "GSI unauthorized attempt"

3. **Porta em uso**
   - Erro: `EADDRINUSE`
   - Solução: Mate processos na porta 3001
     ```bash
     # Linux/Mac
     lsof -ti:3001 | xargs kill -9

     # Windows
     netstat -ano | findstr :3001
     taskkill /PID <PID> /F
     ```

### ❌ Nenhum POST chegando no backend

**Possíveis causas:**

1. **Flag `-gamestateintegration` não configurada**
   - Verifique nas Opções de Inicialização do Steam
   - Reinicie o Dota 2 completamente

2. **Arquivo `.cfg` no lugar errado**
   - Certifique-se que está em `cfg/gamestate_integration/`
   - Nome correto: `gamestate_integration_coach.cfg`

3. **Firewall bloqueando localhost**
   - Adicione exceção para Node.js ou backend
   - Teste: `curl http://127.0.0.1:3001/health`

### ❌ HTTP 401 Unauthorized

**Causa:** Token não corresponde

**Solução:**
1. Abra o arquivo `.cfg` e copie o token
2. Cole no backend `.env`: `GSI_AUTH_TOKEN=<token>`
3. Reinicie o backend

### ❌ Dados atrasados (lag >1s)

**Possíveis causas:**

1. **Throttle muito alto no `.cfg`**
   - Tente reduzir: `"throttle" "0.05"` (50ms)

2. **CPU sobrecarregada**
   - Feche programas pesados
   - Verifique uso de CPU do backend (<20% esperado)

3. **Muitos clientes conectados**
   - Cada cliente WebSocket consome recursos
   - Feche abas duplicadas do app

---

## 🎯 Uso Recomendado

### Durante Draft/Pick Phase

- Live Mode ainda não detecta draft automaticamente
- Use o modo manual para adicionar aliados/inimigos

### Durante Partida

- **Live Mode detecta automaticamente:**
  - Herói jogado
  - Level e items atuais
  - Gold disponível
  - Estado da partida (tempo, dia/noite)

- **Recomendações se adaptam em tempo real:**
  - Items owned são destacados
  - Prioridade de BKB aumenta se muitos disables inimigos
  - Gold needed calculado automaticamente

### Hero Demo (Teste)

- Entre em Hero Demo para testar Live Mode
- Escolha qualquer herói
- Compre items e level skills
- App deve atualizar instantaneamente

---

## 🔒 Segurança

### Token de Autenticação

- **Padrão:** `COACH_LOCAL_SECRET` (apenas desenvolvimento local)
- **Para produção:** Gere um token forte:
  ```bash
  openssl rand -hex 32
  ```
- Configure no `.cfg` e no `.env` do backend

### Bind Local (127.0.0.1)

- O endpoint GSI escuta **apenas** em localhost
- Não é acessível externamente (seguro)
- Dota 2 só envia para localhost (não pode ser interceptado)

### Rate Limiting

- Máximo: 20 requisições/segundo por IP
- Previne abuse mesmo em ambiente local

---

## 📊 Monitoramento

### DevTools Panel (Desenvolvimento)

Se `NODE_ENV=development`, o app mostra painel de debug:

- **Connection Status:** Connected, reconnecting, etc.
- **Packets/s:** Taxa de snapshots recebidos
- **Last Heartbeat:** Última comunicação com Dota 2
- **Quality:** Reliability, dedup ratio
- **Raw Data:** JSON viewer para snapshots

### Logs do Backend

```bash
# Estruturados (JSON)
tail -f backend/logs/app.log

# Pretty (desenvolvimento)
npm run dev:backend
# Mostra logs coloridos em tempo real
```

**Exemplos de logs:**

```json
// Sucesso
{"level":"info","msg":"GSI snapshot processed","matchId":"7890123456","heroId":46,"broadcast":true,"latency_ms":12}

// Duplicado (dedup)
{"level":"info","msg":"GSI snapshot deduplicated","matchId":"7890123456","snapshotHash":"abc123..."}

// Erro de auth
{"level":"warn","msg":"GSI unauthorized attempt","ip":"127.0.0.1","receivedToken":"WRONG"}
```

---

## 🚀 Próximos Passos

Agora que Live Mode está configurado:

1. ✅ Entre em uma partida de Dota 2
2. ✅ Veja recomendações em tempo real
3. ✅ Experimente comprar items e ver app atualizar
4. ✅ Teste diferentes heróis

**Dúvidas?** Abra uma issue no GitHub: [Dota 2 Coach Issues](https://github.com/seu-usuario/dota2-coach/issues)

---

## 🧪 Modo de Teste (Sem Dota 2)

Para testar sem o Dota 2 rodando, use o Mock GSI sender:

```bash
# Envia um snapshot de teste
npm run mock-gsi:snapshot

# Simula partida completa (40 min)
npm run mock-gsi:simulate

# Loop infinito com variação
npm run mock-gsi:loop
```

Isso permite testar a integração sem precisar estar em jogo.

---

## 📚 Documentação Adicional

- **Arquitetura Técnica:** [LIVE_MODE_ARCHITECTURE.md](LIVE_MODE_ARCHITECTURE.md)
- **Plano de Implementação:** [LIVE_MODE_IMPLEMENTATION.md](LIVE_MODE_IMPLEMENTATION.md)
- **Progresso de Desenvolvimento:** [LIVE_MODE_PROGRESS.md](LIVE_MODE_PROGRESS.md)
- **Guia para Desenvolvedores:** [CLAUDE.md](CLAUDE.md)

---

**Desenvolvido com ❤️ usando Claude Code**
