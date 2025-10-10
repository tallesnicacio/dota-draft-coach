# 🎮 Dota 2 Coach

Aplicação **mobile-first** em PT-BR para melhorar sua gameplay de Dota 2, fornecendo recomendações de heróis, builds, counters e timers em tempo real.

## 🌟 Funcionalidades

### ✅ Implementado

- **Resumo de Decisão por Herói**
  - Counters, sinergias e matchups
  - Builds de itens por fase (starting, early, mid, situational, luxury)
  - Ordem de skills e talentos
  - Indicadores: taxa de vitória, popularidade, tamanho da amostra, confiança

- **Ajuste por Draft**
  - Selecione até 4 aliados e 5 inimigos
  - Recalcula prioridades de itens automaticamente
  - Justificativas curtas para cada recomendação

- **Timers de Jogo**
  - Runas de poder, stack, pull, Roshan, Glyph, Scan
  - Notificações via Service Worker
  - Funciona em background no celular

- **Sistema de Cache Inteligente**
  - Cache de 6 horas por chave (hero + patch + MMR)
  - Fallback para cache stale se API indisponível
  - Retry com exponential backoff em erros

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Tailwind
│   (Vite + PWA)  │  Estado: Zustand
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │  Node + Express
│   Proxy+Cache   │  Cache: 6h TTL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Adapter       │  Normalização de dados
│   OpenDota API  │  Schema interno
└─────────────────┘
```

### Fluxo de Dados

```
OpenDota API → Adapter Layer → Cache Layer → Frontend
                     ↓
              Schema Interno Normalizado
```

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd dota2-coach

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações
```

### Desenvolvimento

```bash
# Roda backend e frontend simultaneamente
npm run dev

# Apenas backend (porta 3001)
npm run dev:backend

# Apenas frontend (porta 5173)
npm run dev:frontend
```

Acesse:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

### Build de Produção

```bash
# Build completo
npm run build

# Inicia servidor de produção
npm start
```

## 🧪 Testes

```bash
# Roda testes do backend
npm test

# Testes em watch mode
cd backend && npm run test -- --watch
```

## 📁 Estrutura do Projeto

```
dota2-coach/
├── backend/
│   ├── src/
│   │   ├── adapters/         # OpenDota adapter + RecommendationEngine
│   │   ├── cache/            # CacheManager
│   │   ├── routes/           # Rotas Express
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utilitários (confidence, items)
│   │   └── server.ts         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── services/         # API service
│   │   ├── stores/           # Zustand stores
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # App principal
│   │   └── main.tsx          # Entry point
│   └── package.json
└── package.json              # Root workspace
```

## 📊 API Endpoints

### `GET /api/heroes`
Lista todos os heróis disponíveis.

**Resposta:**
```json
[
  {
    "id": 46,
    "name": "npc_dota_hero_templar_assassin",
    "localized_name": "Templar Assassin",
    "primary_attr": "agi",
    "attack_type": "Ranged",
    "roles": ["Carry", "Escape"]
  }
]
```

### `GET /api/heroes/:heroId`
Busca dados completos de um herói.

**Query Params:**
- `patch` (opcional): Patch do jogo (default: 7.39e)
- `mmr` (opcional): Faixa de MMR (default: 3000)

**Resposta:**
```json
{
  "hero": "Templar Assassin",
  "heroId": 46,
  "patch": "7.39e",
  "mmr": 3000,
  "coreBuild": {
    "starting": [...],
    "early": [...],
    "mid": [...],
    "situational": [...],
    "luxury": [...]
  },
  "skillOrder": {...},
  "matchups": {...},
  "indicators": {
    "winRate": 0.52,
    "popularity": 0.15,
    "sampleSize": 5000,
    "lastUpdated": "2025-01-15T10:00:00Z",
    "confidence": 0.75
  },
  "_meta": {
    "cached": true,
    "cacheKey": "hero:46:patch:7.39e:mmr:3000"
  }
}
```

### `POST /api/heroes/:heroId/recommendations`
Ajusta recomendações baseado no draft.

**Body:**
```json
{
  "allies": [1, 2, 3],
  "enemies": [5, 11, 106]
}
```

**Resposta:** Igual ao GET, mas com build ajustado e campo `explanation`.

## ⚙️ Configuração (.env)

```bash
# Backend
PORT=3001
NODE_ENV=development

# OpenDota API
ORIGEM_OPEN_DOTA=https://api.opendota.com
OPEN_DOTA_API_KEY=          # Opcional, mas recomendado

# Game Settings
PATCH_PADRAO=7.39e
MMR_PADRAO=3000

# Cache (em segundos)
CACHE_TTL=21600             # 6 horas
```

## 🎯 Critérios de Aceite (Implementados)

✅ **Selecionar Templar Assassin** e ver:
  - Counters (heróis que countam TA)
  - Bom contra (heróis que TA countera)
  - Itens por fase com reasoning
  - Ordem de skills e talentos
  - Score de confiança

✅ **Adicionar 3 inimigos e 2 aliados** e observar:
  - Mudança de prioridade de itens
  - Justificativas curtas (ex: "Priorizado: inimigos com muito dano mágico")
  - Items situacionais gerados automaticamente

✅ **Trocar patch e MMR** e ver:
  - Atualização dos números
  - Score de confiança recalculado
  - Cache por chave (hero+patch+mmr)

✅ **API indisponível**:
  - Serve cache stale com aviso
  - Revalidação em background
  - Tempo de resposta rápido no celular

## 🔧 Sistema de Recomendações

### Pesos Padrão (Configurável)

- **Win Rate**: 40%
- **Popularidade**: 25%
- **Tamanho da Amostra**: 20%
- **Frescor dos Dados**: 15%

### Modificadores de Draft

- **Muita armadura inimiga** → Prioriza redução de armadura
- **Muitos silêncios/stuns** → Eleva BKB/Linken's
- **Sinergias de dano físico** → Favorece crit e Blink cedo

### Cálculo de Confiança

Confiança ∈ [0, 1], baseado em:
- Win rate normalizado (0.3-0.7 → 0-1)
- Popularidade (0-0.5 → 0-1)
- Sample size logarítmico (100 jogos = 0.5, 10k = 1.0)
- Freshness (30 dias = 1.0, 180 dias = 0.0)

## 📱 PWA e Timers

A aplicação é uma PWA (Progressive Web App):
- Instalável no celular
- Funciona offline (cache de dados)
- Notificações push para timers
- Service Worker para background tasks

**Timers Disponíveis:**
- Runa de Poder (7 min)
- Stack Camp (1 min)
- Pull Camp (1 min)
- Roshan (8 min)
- Glyph (5 min)
- Scan (4.5 min)

## 🎨 Design Mobile-First

- **Modo escuro por padrão**
- **Skeletons** e loading states
- **Bottom navigation** para fácil acesso
- **Swipe-friendly** interface
- **Touch-optimized** buttons
- Paleta de cores temática de Dota 2

## 📝 TODO Futuro

- [ ] Integração com Stratz API para dados mais ricos
- [ ] Sistema de favoritos de heróis
- [ ] Histórico de partidas do jogador
- [ ] Análise de replays
- [ ] Recomendações de posicionamento no mapa
- [ ] Guias de heróis com vídeos
- [ ] Comparação de builds pro vs pub

## 📄 Licença

MIT

## 🤝 Contribuindo

PRs são bem-vindos! Por favor, abra uma issue primeiro para discutir mudanças maiores.

## 📞 Suporte

Para bugs ou sugestões, abra uma issue no GitHub.

---

**Desenvolvido com ❤️ para a comunidade de Dota 2**
