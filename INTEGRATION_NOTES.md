# Notas de Integração - Frontend Dinâmico

## Mudanças Implementadas

### 1. **Integração com Backend via API**

Criado o serviço `frontend/src/services/api.ts` que faz a comunicação com o backend:

#### Endpoints utilizados:
- `GET /api/heroes` - Lista todos os heróis
- `GET /api/heroes/:heroId?patch=X&mmr=Y` - Dados base de um herói
- `POST /api/heroes/:heroId/recommendations` - Recomendações ajustadas por draft context

#### Funcionalidades:
- **Conversão de dados**: Backend usa formato OpenDota, frontend usa formato interno
- **Mapeamento de MMR**: Herald-Crusader (1000), Archon-Legend (2500), Ancient-Divine (4000), Immortal (6000)
- **URLs de imagens**: Ajuste automático para CDN da Steam
- **Error handling**: Tratamento de erros com fallback gracioso

### 2. **Componentes Atualizados para Dados Dinâmicos**

#### `HeroPicker.tsx`
- ✅ Carrega heróis da API ao inicializar
- ✅ Exibe loading state
- ✅ Atualização automática

#### `pages/Index.tsx`
- ✅ Busca dados reais ao selecionar herói
- ✅ Recarrega dados quando muda: patch, MMR, aliados ou inimigos
- ✅ Usa endpoint de recomendações quando há draft context
- ✅ Loading state durante busca de dados

### 3. **Sistema de Timers**

Adicionado componente `Timers.tsx` com as seguintes funcionalidades:

#### Presets disponíveis:
- **Runa de Poder** - 7 minutos (420s)
- **Stack Camp** - 1 minuto (60s)
- **Pull Camp** - 1 minuto (60s)
- **Roshan** - 8 minutos (480s)
- **Glyph** - 5 minutos (300s)
- **Scan** - 4.5 minutos (270s)

#### Recursos:
- ✅ Contador regressivo em tempo real
- ✅ Notificações web quando timer termina
- ✅ Múltiplos timers simultâneos
- ✅ Integrado ao Zustand store
- ✅ Interface moderna com shadcn-ui
- ✅ Animação quando timer completa

### 4. **Store Atualizado (Zustand)**

Adicionados ao `buildStore.ts`:
```typescript
timers: Timer[]
addTimer: (timer: Timer) => void
removeTimer: (timerId: string) => void
updateTimer: (timerId: string, updates: Partial<Timer>) => void
```

### 5. **Tipos Atualizados**

Adicionado em `types/dota.ts`:
```typescript
export interface Timer {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  active: boolean;
}
```

## Como Testar

### 1. **Iniciar o Backend e Frontend**

```bash
# No diretório raiz do projeto
npm run dev
```

Isso iniciará:
- Backend na porta 3001
- Frontend na porta 5173

### 2. **Testar Carregamento de Heróis**

1. Abra http://localhost:5173
2. Deve aparecer "Carregando heróis..." brevemente
3. Grid de heróis deve aparecer com imagens da API

### 3. **Testar Seleção de Herói**

1. Clique em qualquer herói
2. Deve aparecer "Carregando dados..."
3. Build, skills e matchups devem aparecer com dados reais da OpenDota

### 4. **Testar Draft Context**

1. Selecione um herói
2. Adicione aliados ou inimigos
3. Os dados devem recarregar automaticamente
4. Build deve ajustar baseado na composição

### 5. **Testar Timers**

1. Na seção de Timers (topo direito)
2. Selecione um preset (ex: "Runa de Poder")
3. Clique em "Iniciar"
4. Timer deve aparecer contando regressivamente
5. Quando terminar, deve mostrar "✓ Pronto!" e animar
6. Clique no sino para habilitar notificações web

### 6. **Testar Mudança de Patch/MMR**

1. Selecione um herói
2. Mude o patch ou MMR bucket
3. Dados devem recarregar automaticamente

## Verificação de Integração Backend

### Health Check
```bash
curl http://localhost:3001/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "env": {
    "patch": "7.39e",
    "mmr": "3000",
    "cacheEnabled": true
  }
}
```

### Buscar Heróis
```bash
curl http://localhost:3001/api/heroes
```

### Buscar Dados de Herói (exemplo: Anti-Mage = ID 1)
```bash
curl "http://localhost:3001/api/heroes/1?patch=7.39e&mmr=4000"
```

### Buscar Recomendações com Draft
```bash
curl -X POST "http://localhost:3001/api/heroes/1/recommendations?patch=7.39e&mmr=4000" \
  -H "Content-Type: application/json" \
  -d '{"allies": [2, 3], "enemies": [4, 5, 6]}'
```

## Troubleshooting

### Heróis não carregam
1. Verificar se backend está rodando: `curl http://localhost:3001/health`
2. Verificar console do browser (F12) para erros
3. Verificar se proxy está configurado em `vite.config.ts`

### Dados não atualizam ao mudar draft
1. Verificar console - deve mostrar chamadas à API
2. Verificar se `useEffect` está com dependências corretas
3. Limpar cache do browser

### Timers não funcionam
1. Verificar se notificações estão habilitadas no browser
2. Verificar permissões do site nas configurações do browser
3. Timers funcionam sem notificações, apenas sem alertas

### CORS Errors
1. Backend deve estar com middleware `cors()` habilitado
2. Verificar se proxy do Vite está configurado corretamente
3. Verificar se ambos estão nas portas corretas (3001 e 5173)

## Próximos Passos Sugeridos

1. **Adicionar loading skeletons** - Melhor UX durante carregamento
2. **Error boundaries** - Tratamento de erros mais robusto
3. **Toast notifications** - Feedback visual de erros/sucessos
4. **Persistência de timers** - Salvar timers no localStorage
5. **PWA completo** - Service worker para offline support
6. **Cache de heróis** - React Query para cache automático
7. **Otimização de imagens** - Lazy loading de imagens de heróis
8. **Testes** - Unit tests para componentes e API service

## Arquivos Modificados/Criados

### Novos arquivos:
- `frontend/src/services/api.ts`
- `frontend/src/components/Timers.tsx`
- `INTEGRATION_NOTES.md` (este arquivo)

### Arquivos modificados:
- `frontend/src/components/HeroPicker.tsx` - Integração com API
- `frontend/src/pages/Index.tsx` - Integração API + Timers
- `frontend/src/store/buildStore.ts` - Adicionado suporte a timers
- `frontend/src/types/dota.ts` - Adicionado tipo Timer
- `frontend/vite.config.ts` - Configurado proxy para backend

### Arquivos de backup:
- `frontend-backup-20251009-162626/` - Backup do frontend original
