# Project Status - Dota 2 Coach

**Data da última atualização:** 2025-10-10
**Commit atual:** `eb37946` - Initial commit
**Branch:** `master`

---

## 📋 Visão Geral do Projeto

**Dota 2 Coach** é uma Progressive Web App (PWA) que fornece guias de build personalizados para heróis do Dota 2, baseados em dados reais da API OpenDota.

### Objetivo Principal
Ajudar jogadores de Dota 2 a tomarem decisões informadas sobre:
- Build de items (starting, early, mid, situational)
- Ordem de skills e talents
- Matchups (counters, vantagens, sinergias)
- Timings de objetivos (Roshan, stacks, runas)

### Diferencial
- **Contexto de draft**: Recomendações ajustadas baseadas em aliados e inimigos
- **Dados reais**: Integração com OpenDota API
- **Offline-first**: PWA com cache inteligente
- **Mobile-first**: Design otimizado para celular

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Backend:**
- Node.js + Express + TypeScript
- Porta: 3001
- Hot reload: tsx watch

**Frontend:**
- React 18 + TypeScript
- Vite (HMR)
- TailwindCSS + shadcn/ui
- Zustand (state management)
- Porta: 5173

**PWA:**
- Service Worker via vite-plugin-pwa
- Workbox para estratégias de cache
- Manifest.json configurado

**Monorepo:**
- npm workspaces
- Comandos centralizados no root package.json

### Estrutura de Pastas

```
dota2-coach/
├── backend/
│   ├── .cache/              # Cache de heróis (JSON)
│   └── src/
│       ├── adapters/        # OpenDotaAdapter, RecommendationEngine
│       ├── cache/           # CacheManager
│       ├── routes/          # Express routes
│       ├── types/           # TypeScript interfaces
│       └── utils/           # Confidence score, items
├── frontend/
│   ├── public/              # Assets estáticos
│   └── src/
│       ├── components/      # UI components
│       ├── pages/           # Páginas (Index, NotFound)
│       ├── services/        # API service
│       ├── store/           # Zustand store
│       └── types/           # TypeScript types
└── [docs]/                  # Arquivos .md de documentação
```

---

## ✅ Funcionalidades Implementadas

### Backend
- ✅ Integração com OpenDota API
- ✅ Adapter pattern para normalização de dados
- ✅ Sistema de cache em memória (TTL 6h)
- ✅ Retry logic com exponential backoff
- ✅ Recommendation Engine com modificadores contextuais
- ✅ Cálculo de confidence score
- ✅ Endpoints:
  - `GET /api/heroes` - Lista de heróis
  - `GET /api/heroes/:id` - Dados do herói
  - `POST /api/heroes/:id/recommendations` - Build contextualizada

### Frontend
- ✅ Seletor de heróis com busca e filtros (STR, AGI, INT)
- ✅ Painel de build (Starting, Early, Mid, Situational)
- ✅ Painel de skills (ordem de level-up, talents)
- ✅ Painel de matchups (Counters, Good vs, Synergies)
- ✅ Draft panel (aliados e inimigos)
- ✅ Sistema de timers configuráveis (Roshan, Runes, etc)
- ✅ Filtros: Patch e MMR
- ✅ Confidence badge para indicar qualidade dos dados
- ✅ Loading skeletons
- ✅ Error boundaries
- ✅ LazyImage component para performance

### PWA
- ✅ Service worker registrado
- ✅ Manifest.json configurado
- ✅ Estratégias de cache:
  - Imagens CDN: CacheFirst (7 dias)
  - OpenDota API: NetworkFirst (6h)
  - Backend API: NetworkFirst (10s timeout)
- ✅ PWAUpdatePrompt (notifica novas versões)
- ✅ Funciona offline com dados cacheados
- ✅ Instalável em mobile e desktop

### State Management
- ✅ Zustand store único (`buildStore`)
- ✅ Estado persistido: selectedHeroId, patch, mmr
- ✅ Cache de heróis em memória para matchups
- ✅ Draft context (allies, enemies)

### Testes
- ✅ Vitest configurado (backend e frontend)
- ✅ Testes unitários para:
  - RecommendationEngine
  - Confidence calculator
  - API service

---

## 🐛 Problemas Conhecidos

### 1. Nomes de Items (Baixa Prioridade)
**Status:** Funcional, mas não ideal

Backend retorna IDs de items como `"item_16"`, `"item_29"` ao invés de nomes legíveis.

**Impacto:**
- UI mostra "item_16" ao invés de "Tango"

**Solução proposta:**
Criar mapeamento de item IDs → nomes legíveis no frontend:
```typescript
const ITEM_NAMES = {
  16: 'Tango',
  29: 'Boots of Speed',
  // ...
};
```

**Arquivo:** `frontend/src/constants/items.ts` (já existe estrutura inicial)

### 2. Imagens de Items (Média Prioridade)
**Status:** Não implementado

Build panel não mostra ícones dos items, apenas texto.

**Solução proposta:**
- Usar CDN do Dota 2: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${itemName}.png`
- Adicionar LazyImage para performance
- Fallback para placeholder se imagem não carregar

### 3. Sinergias Vazias (Baixa Prioridade)
**Status:** Backend retorna array vazio

Backend retorna `synergies: []` vazio consistentemente.

**Possível causa:**
- Não implementado no backend
- Requer lógica adicional ou API diferente

**Próxima ação:**
Verificar lógica no `RecommendationEngine.ts:generateMatchups()`

### 4. Tooltips de Items (Baixa Prioridade)
**Status:** Não implementado

Ao passar mouse sobre item, não mostra descrição/stats.

**Solução proposta:**
- Usar shadcn/ui Tooltip component
- Buscar dados de items da API OpenDota ou constantes locais

---

## 📊 Estado Atual (10/10/2025)

### O que funciona 100%
- ✅ Servidor roda sem erros
- ✅ Busca de heróis com filtros
- ✅ Seleção de herói carrega dados da build
- ✅ Matchups mostram imagens corretas (fix aplicado)
- ✅ Cache de heróis funciona
- ✅ PWA instalável
- ✅ Funciona offline
- ✅ Timers funcionam
- ✅ Draft panel funcional

### O que precisa melhorias
- ⚠️ Nomes de items genéricos
- ⚠️ Sem ícones de items
- ⚠️ Sem tooltips
- ⚠️ Sinergias não populadas

### O que está pendente
- ❌ Deploy em produção
- ❌ Configuração de CI/CD
- ❌ Testes E2E
- ❌ Analytics/Monitoring
- ❌ SEO otimization

---

## 🔄 Histórico de Desenvolvimento

### Fase 1: Setup Inicial
- Monorepo com workspaces npm
- Backend Express + TypeScript
- Frontend Vite + React + TypeScript
- Integração básica OpenDota API

### Fase 2: Core Features
- Sistema de recomendações
- Cache manager
- UI components (HeroPicker, BuildPanel, etc)
- Zustand store

### Fase 3: Correções (FIX_NOTES.md)
**Problema:** Build não aparecia após selecionar herói

**Causa:** Formato de dados do backend diferente do esperado pelo frontend

**Solução:**
- Atualizado interface `BackendHeroBuild`
- Reescrita função `convertBuild()`
- Conversão correta de items, skills, matchups

### Fase 4: Fix de Imagens (MATCHUP_IMAGES_FIX.md)
**Problema:** Imagens de heróis em matchups não apareciam

**Causa:** Backend retornava "Hero 93" ao invés de nome real

**Solução:**
- Cache inteligente de heróis
- Resolução por ID antes de renderizar
- Logs de debug

### Fase 5: PWA Setup (PWA_SETUP.md)
- Service worker com Workbox
- Estratégias de cache (CacheFirst, NetworkFirst)
- Manifest.json
- PWAUpdatePrompt component
- Offline support

### Fase 6: Git Setup (HOJE)
- Repositório git inicializado
- .gitignore configurado
- Commit inicial criado
- Git config (Talles Nicacio)

---

## 📝 Próximos Passos Sugeridos

### Prioridade Alta
1. **Testar aplicação end-to-end**
   - Verificar se todos os fluxos funcionam
   - Testar em mobile e desktop
   - Testar modo offline

2. **Mapeamento de nomes de items**
   - Completar `frontend/src/constants/items.ts`
   - Aplicar mapeamento em BuildPanel
   - Testar com vários heróis

3. **Adicionar ícones de items**
   - Integrar CDN de imagens do Dota 2
   - Usar LazyImage component
   - Adicionar placeholders

### Prioridade Média
4. **Investigar sinergias vazias**
   - Debug backend RecommendationEngine
   - Verificar se OpenDota API fornece dados
   - Implementar lógica alternativa se necessário

5. **Adicionar tooltips de items**
   - Usar shadcn Tooltip
   - Buscar descrições de items
   - Mostrar stats e efeitos

6. **Melhorar UX**
   - Animações de transição
   - Feedback visual ao selecionar herói
   - Toasts para operações assíncronas

### Prioridade Baixa
7. **Setup CI/CD**
   - GitHub Actions para testes
   - Build automático
   - Deploy automático (Vercel/Netlify)

8. **Testes E2E**
   - Playwright ou Cypress
   - Cobrir fluxos principais

9. **Analytics**
   - Google Analytics ou alternativa
   - Tracking de heróis mais buscados
   - Métricas de uso

10. **SEO**
    - Meta tags dinâmicas
    - Open Graph
    - Sitemap

---

## 🔗 Referências Rápidas

### Comandos Úteis
```bash
# Desenvolvimento
npm run dev              # Roda backend + frontend
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend

# Testes
npm test                 # Todos os testes
cd backend && npm run test -- --watch  # Watch mode

# Build
npm run build            # Build completo
npm start                # Produção

# Git
git status               # Estado atual
git log --oneline        # Histórico de commits
```

### Portas
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Produção: Backend serve frontend do `/dist`

### APIs Externas
- OpenDota API: https://api.opendota.com
- Dota 2 CDN: https://cdn.cloudflare.steamstatic.com

### Documentação do Projeto
- `CLAUDE.md` - Guia principal para desenvolvimento
- `README.md` - Overview do projeto
- `QUICKSTART.md` - Setup rápido
- `PWA_SETUP.md` - Detalhes do PWA
- `TROUBLESHOOTING.md` - Problemas comuns
- `FIX_NOTES.md` - Histórico de correções
- `MATCHUP_IMAGES_FIX.md` - Fix específico de imagens
- `PROJECT_STATUS.md` - Este arquivo

---

## 👥 Equipe

**Desenvolvedor:** Talles Nicacio (talles.nicacio@gmail.com)
**Assistente:** Claude Code

---

## 📄 Licença

A definir (não especificada ainda)

---

**Última revisão:** 2025-10-10
**Próxima revisão sugerida:** Após implementar melhorias de prioridade alta
