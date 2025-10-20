# 🎮 Dota 2 Coach - Live Mode Beta Release (v1.0.0-beta.1)

## 🚀 Anúncio

Estamos empolgados em anunciar o **Live Mode Beta** do Dota 2 Coach! Após 9 fases de desenvolvimento e mais de 6.000 linhas de código, estamos prontos para receber feedback da comunidade.

## ✨ O que é o Live Mode?

O Live Mode permite que o Dota 2 Coach receba dados em **tempo real** da sua partida através do Game State Integration (GSI) do Dota 2. Isso significa:

- 📊 **Estatísticas ao vivo**: Veja seu K/D/A, gold, items, level e muito mais atualizados em tempo real
- 🎯 **Recomendações contextuais**: Builds e itens ajustados baseados no andamento real da partida
- ⚡ **Zero latência**: WebSocket com atualização instantânea (< 1s de delay)
- 🔄 **Auto-reconexão**: Sistema robusto que reconecta automaticamente se a conexão cair
- 📱 **Works offline**: Cache inteligente permite uso mesmo sem conexão

## 🎯 Features Implementadas

### Backend
- ✅ **WebSocket Server** com autenticação e rooms por match
- ✅ **GSI Endpoint** com deduplicação de snapshots (>70% de redução)
- ✅ **Rate limiting** (20 req/s) para proteger o servidor
- ✅ **Structured logging** com Pino para debugging
- ✅ **88 testes unitários** com cobertura >85%

### Frontend
- ✅ **LiveClient service** com auto-reconnection e exponential backoff
- ✅ **LiveStore** (Zustand) para state management
- ✅ **LiveBadge** mostrando status de conexão em tempo real
- ✅ **LiveSetupBanner** com instruções de configuração
- ✅ **LiveDevTools** para debugging (dev mode)
- ✅ **Recommendation fusion** mesclando dados estáticos + live

### Qualidade
- ✅ **108 testes totais** (88 backend + 20 E2E com Playwright)
- ✅ **CI/CD** com GitHub Actions
- ✅ **Feature flag** (LIVE_MODE_ENABLED) para controle
- ✅ **Documentação completa** (LIVE_MODE_SETUP.md)

## 🧪 Como Testar o Beta

### Pré-requisitos
- Dota 2 instalado
- Node.js 18+ e npm 9+

### Passo a Passo

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/tallesnicacio/dota-draft-coach.git
   cd dota-draft-coach
   ```

2. **Instale as dependências**:
   ```bash
   npm run setup
   ```

3. **Configure o GSI do Dota 2**:
   - Copie `backend/.env.example` para `backend/.env`
   - Siga as instruções em [LIVE_MODE_SETUP.md](LIVE_MODE_SETUP.md) para configurar o GSI
   - Arquivo de configuração deve ir em:
     - **Windows**: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\`
     - **macOS**: `~/Library/Application Support/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`
     - **Linux**: `~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`

4. **Inicie o app**:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

5. **Teste sem Dota 2** (opcional):
   ```bash
   # Terminal 1: App rodando
   npm run dev

   # Terminal 2: Mock GSI sender
   npm run mock-gsi:simulate
   ```
   Isso simula uma partida de 40 minutos enviando snapshots a cada 2 segundos.

6. **Entre em uma partida real de Dota 2**:
   - Abra o Dota 2 Coach no browser
   - Clique no botão "Live" no canto superior direito
   - Entre em uma partida (normal, ranked, ou demo hero)
   - Veja os dados atualizarem em tempo real!

## 📋 O que Testar

Por favor, teste e reporte feedback sobre:

- [ ] Conexão WebSocket funciona corretamente
- [ ] Dados atualizando em tempo real durante partida
- [ ] Reconexão automática após perda de conexão
- [ ] Setup do GSI (clareza das instruções)
- [ ] Performance (CPU/memória)
- [ ] UI/UX do Live Mode
- [ ] Bugs ou comportamentos inesperados

## ⚠️ Known Issues

Este é um **beta release**. Issues conhecidas:

1. **Latência em redes lentas**: WebSocket pode ter delay de 2-3s em conexões ruins
2. **Primeiro snapshot demora**: Pode levar até 5s para primeiro update aparecer
3. **Cache de heróis**: Se adicionar heróis novos ao draft depois de conectar, pode precisar recarregar
4. **DevTools não persiste**: Painel de debug desaparece ao recarregar página
5. **Notificações**: Require permissão do browser (aceite quando solicitado)

Para lista completa e workarounds, veja [LIVE_MODE_SETUP.md - Troubleshooting](LIVE_MODE_SETUP.md#troubleshooting).

## 🐛 Como Reportar Bugs

Use os templates de issue do GitHub:

- **Bug Report**: [.github/ISSUE_TEMPLATE/live-mode-bug.yml](.github/ISSUE_TEMPLATE/live-mode-bug.yml)
- **Feedback**: [.github/ISSUE_TEMPLATE/live-mode-feedback.yml](.github/ISSUE_TEMPLATE/live-mode-feedback.yml)

Ou crie uma issue manualmente incluindo:
- Descrição do problema
- Passos para reproduzir
- Logs do console (F12 → Console)
- Logs do backend (`backend/logs/combined.log`)
- Sistema operacional e versão do Dota 2

## 📊 Estatísticas do Desenvolvimento

- **9 fases** de implementação (100% completas)
- **67 arquivos** modificados
- **11.865 linhas** adicionadas
- **108 testes** (88 backend + 20 E2E)
- **6 semanas** de desenvolvimento
- **0 regressões** (todos os testes passando)

## 🙏 Agradecimentos

Obrigado aos beta testers por dedicar tempo para testar e reportar feedback! Sua ajuda é essencial para fazer do Dota 2 Coach uma ferramenta cada vez melhor.

## 🔗 Links Úteis

- **Documentação**: [LIVE_MODE_SETUP.md](LIVE_MODE_SETUP.md)
- **Repositório**: https://github.com/tallesnicacio/dota-draft-coach
- **Issues**: https://github.com/tallesnicacio/dota-draft-coach/issues
- **Changelog**: [LIVE_MODE_PROGRESS.md](LIVE_MODE_PROGRESS.md)

## 🎯 Próximos Passos

Após o período de beta (2-4 semanas), planejamos:

- Estabilizar bugs reportados
- Adicionar métricas de performance
- Implementar histórico de partidas
- Suporte para Tournament Mode
- Mobile app (React Native)

---

**Versão**: v1.0.0-beta.1
**Data**: 2025-01-20
**Status**: 🟠 Beta (Experimental)

---

Para começar a testar, visite: https://github.com/tallesnicacio/dota-draft-coach

Happy testing! 🎮✨
