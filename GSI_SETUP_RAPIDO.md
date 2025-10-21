# Configuração Rápida do GSI (Game State Integration)

## ⚠️ IMPORTANTE: Para os alertas funcionarem no jogo, você PRECISA configurar o GSI!

### Passo 1: Encontrar a pasta de configuração do Dota 2

Dependendo do seu sistema operacional:

**Windows:**
```
C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\
```

**Linux:**
```
~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
```

**Mac:**
```
~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
```

### Passo 2: Criar o arquivo de configuração

1. Se a pasta `gamestate_integration` não existir, crie ela
2. Dentro da pasta, crie um arquivo chamado: `gamestate_integration_coach.cfg`
3. Cole o conteúdo abaixo:

```
"Dota 2 Integration Configuration"
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
        "wearables"     "0"
    }
    "auth"
    {
        "token"         ""
    }
}
```

### Passo 3: Reiniciar o Dota 2

1. Feche o Dota 2 completamente
2. Abra novamente
3. Entre em uma partida (pode ser demo ou bot match para testar)

### Passo 4: Verificar se está funcionando

Quando você entrar em uma partida:

1. O **GameOverlay** no canto inferior direito deve mostrar "GSI: Conectado"
2. Você deve ver o tempo de jogo atualizando
3. Alertas devem aparecer automaticamente (runas, stacks, etc.)

### Testando Sem Entrar em Partida

Se você não quer entrar em uma partida real para testar, você pode:

1. Clicar no botão **"Demo"** no painel de Timers
2. Isso vai criar timers de exemplo para você ver o visual
3. Mas os alertas automáticos SÓ funcionam com o GSI configurado!

### Solução de Problemas

**Problema: "GSI Desconectado" aparece no overlay**

Soluções:
1. Verifique se o backend está rodando (`npm run dev`)
2. Verifique se o arquivo `gamestate_integration_coach.cfg` está no lugar certo
3. Reinicie o Dota 2
4. Verifique se a porta 3001 não está bloqueada pelo firewall

**Problema: Overlay não aparece**

Soluções:
1. Abra o navegador em `http://localhost:5173/`
2. Certifique-se de que o frontend está rodando
3. Recarregue a página (Ctrl+Shift+R)

**Problema: Alertas não aparecem mesmo com GSI conectado**

Soluções:
1. Verifique se você está realmente EM JOGO (não no menu)
2. Aguarde alguns segundos para o primeiro alerta
3. Clique no ícone de sino no overlay para garantir que alertas estão ativados
4. Verifique o console do navegador (F12) para erros

### O que você deve ver durante o jogo:

✅ Overlay no canto inferior direito
✅ Tempo de jogo atualizando em tempo real
✅ Nome do seu herói e stats (K/D/A, gold, GPM)
✅ Lista de próximos eventos (runas, stacks, etc.)
✅ Alertas GRANDES e VERMELHOS 10 segundos antes de eventos críticos
✅ Som de alerta quando eventos estão próximos
✅ Notificações desktop para eventos críticos

### Funcionalidades Tipo DotaPlus Disponíveis:

🎯 **Durante o Draft:**
- Sugestões de picks baseado em counters
- Sugestões de bans contra meta picks
- Análise de composição do time

⏰ **Durante o Jogo:**
- Alertas de runas (bounty/power/water)
- Alertas de stack timing (5s antes)
- Alertas de Roshan respawn
- Alertas de Tormentor/Lotus/Outpost
- Timers automáticos para todos os eventos
- Game overlay com próximos eventos

📊 **Sempre:**
- Builds contextualizadas por draft
- Matchups (counters, sinergias)
- Ordem de skills e talents
- Recomendações de itens situacionais

---

**IMPORTANTE:** O app funciona 100% local. Nenhum dado é enviado para servidores externos. Tudo roda na sua máquina.

**DICA:** Mantenha o navegador aberto em uma segunda tela (ou em modo janela) durante as partidas para ver os alertas em tempo real!
