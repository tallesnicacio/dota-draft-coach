# 🚀 Quick Start

## Setup Rápido (5 minutos)

### 1. Instalar Dependências

```bash
# Opção 1: Script automático
./setup.sh

# Opção 2: Manual
npm run setup
```

### 2. Iniciar Desenvolvimento

```bash
npm run dev
```

Aguarde alguns segundos e acesse:
- 🎮 **App**: http://localhost:5173
- 🔧 **API**: http://localhost:3001
- ❤️ **Health**: http://localhost:3001/health

### 3. Testar Funcionalidades

#### 3.1 Selecionar um Herói
1. Abra http://localhost:5173
2. Na aba "Herói", busque por "Templar Assassin"
3. Clique no herói
4. Veja counters, build de itens, skills

#### 3.2 Ajustar por Draft
1. Clique na aba "Inimigos" (ícone de espadas)
2. Selecione 3-5 heróis inimigos
3. Volte para "Herói"
4. Observe mudanças nas recomendações de itens

#### 3.3 Usar Timers
1. Clique na aba "Timers" (ícone de relógio)
2. Clique em "Habilitar notificações"
3. Selecione "Runa de Poder" e clique "Iniciar"
4. Timer começará a contar

### 4. Configurar Patch e MMR

Na seção "Configurações" no topo:
- **Patch**: Mude para 7.39e, 7.39d, etc.
- **MMR/Bracket**: Selecione sua faixa (Guardian, Archon, etc.)

Recomendações mudam automaticamente!

## Troubleshooting

### Erro CORS
```bash
# Certifique-se que backend está rodando na porta 3001
curl http://localhost:3001/health
```

### Heróis não carregam
```bash
# Teste a API diretamente
curl http://localhost:3001/api/heroes

# Se der timeout, pode ser rate limit do OpenDota
# Adicione uma API key no .env:
OPEN_DOTA_API_KEY=seu-key-aqui
```

### Frontend não atualiza
```bash
# Limpe cache do Vite
cd frontend
rm -rf node_modules/.vite
npm run dev
```

## Próximos Passos

- ✅ Leia o [README.md](./README.md) completo
- ✅ Explore o [CLAUDE.md](./CLAUDE.md) para entender arquitetura
- ✅ Rode os testes: `npm test`
- ✅ Customize a paleta de cores em `frontend/tailwind.config.js`

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Backend + Frontend
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend

# Build
npm run build            # Build de produção
npm start                # Iniciar produção

# Testes
npm test                 # Roda testes do backend
cd backend && npm test -- --watch  # Watch mode

# Linting
cd frontend && npm run lint
```

## Estrutura Básica

```
dota2-coach/
├── backend/          # Node + Express + TypeScript
│   ├── src/
│   │   ├── adapters/ # OpenDota + Recommendations
│   │   ├── cache/    # Cache manager
│   │   ├── routes/   # API routes
│   │   └── server.ts
│   └── package.json
├── frontend/         # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── stores/   # Zustand
│   │   └── App.tsx
│   └── package.json
└── package.json      # Root workspace
```

Aproveite! 🎮
