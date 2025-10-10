# Fix Notes - Correção de Dados da Build

## Problema Identificado

Quando selecionava um herói, não aparecia nenhum dado de build ou skills.

### Causa Raiz

O formato de dados retornado pelo backend era diferente do formato esperado pelo frontend.

**Backend retornava:**
```json
{
  "coreBuild": {
    "starting": [
      {"itemId": 16, "itemName": "item_16", "priority": 0.4, "pickRate": 0.2}
    ],
    "early": [...],
    "mid": [...],
    "situational": [...],
    "luxury": [...]
  },
  "skillOrder": {
    "levels": [1, 1, 2, 2, 2, 3, 2, 1, 1, 4, 3, 3, 3, 4, 4],
    "talents": [
      {"level": 10, "option": "left", "description": "...", "pickRate": 0.6}
    ]
  },
  "matchups": {
    "countersToMe": [
      {"heroId": 93, "heroName": "Hero 93", "advantage": -4.4, "sampleSize": 18}
    ],
    "goodVs": [...]
  },
  "indicators": {
    "winRate": 0.5,
    "confidence": 0.56,
    "sampleSize": 5000,
    "lastUpdated": "2025-10-09T..."
  }
}
```

**Frontend esperava:**
```typescript
{
  coreBuild: {
    starting: string[],  // Ex: ["Tango", "Branch"]
    early: string[],
    mid: string[],
    situational: string[]
  },
  skillOrder: {
    sequence: string[],  // Ex: ["Q", "W", "E", "Q"]
    talents: number[]    // Ex: [10, 15, 20, 25]
  }
}
```

## Correções Implementadas

### 1. Atualizado Interface `BackendHeroBuild` (`services/api.ts`)

Ajustado para refletir o formato real retornado pelo backend.

### 2. Função `convertBuild` Reescrita

**Conversão de Items:**
```typescript
// Antes (errado):
starting: backendBuild.items.starting.map(i => i.name)

// Depois (correto):
starting: backendBuild.coreBuild.starting.map(i => i.itemName || `Item ${i.itemId}`)
```

**Conversão de Skills:**
```typescript
// Converter array de levels [1, 1, 2, 2, 2, 3...] para ["Q", "Q", "W", "W", "W", "E"...]
const skillSequence = backendBuild.skillOrder.levels.map(level => {
  const skillMap: { [key: number]: string } = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
  return skillMap[level] || 'Q';
});
```

**Conversão de Talents:**
```typescript
// Extrair apenas os níveis dos talents
const talents = backendBuild.skillOrder.talents.map(t => t.level);
```

**Conversão de Matchups:**
```typescript
countersToMe: backendBuild.matchups.countersToMe.map(m => ({
  hero: m.heroName,  // Era m.hero_name
  heroImage: `...hero_${m.heroId}.png`,
  winRateDelta: m.advantage,  // Já é negativo para counters
  note: m.reasoning  // Era m.games_played
}))
```

**Conversão de Indicators:**
```typescript
confidence: backendBuild.indicators.confidence,  // Era backendBuild.confidence
sampleSize: backendBuild.indicators.sampleSize,  // Era backendBuild.games_analyzed
lastUpdated: backendBuild.indicators.lastUpdated
```

### 3. Adicionados Logs de Debug

Para facilitar troubleshooting futuro:

```typescript
console.log(`Buscando dados do herói ${heroId}...`);
console.log('Dados recebidos do backend:', data);
console.log('Build convertida:', build);
```

### 4. Tratamento de Items "Luxury"

O backend retorna uma categoria adicional "luxury" que não existia no mock. Agora mesclamos com "situational":

```typescript
situational: [
  ...(backendBuild.coreBuild.situational?.map(...) || []),
  ...(backendBuild.coreBuild.luxury?.map(...) || []),
]
```

## Como Testar

1. **Recarregar a aplicação**
   ```bash
   # Se o dev server já estava rodando, apenas recarregue o navegador
   # Caso contrário:
   npm run dev
   ```

2. **Abrir http://localhost:5173**

3. **Selecionar um herói** (ex: Anti-Mage)

4. **Verificar no console (F12)**
   - Deve ver: `Buscando dados do herói 1 (patch: 7.39e, mmr: 4000)`
   - Deve ver: `Dados recebidos do backend: {...}`
   - Deve ver: `Build convertida: {...}`

5. **Verificar na interface**
   - **Build Panel**: Deve mostrar itens Starting, Early, Mid, Situational
   - **Skills Panel**: Deve mostrar ordem de skills (Q, W, E, R)
   - **Matchups Panel**: Deve mostrar Counters e Good vs

## Problemas Conhecidos Remanescentes

### 1. Nomes de Items
O backend retorna `itemName` como "item_16", "item_29", etc. (códigos internos).

**Solução Futura**: Criar um mapeamento de item IDs para nomes legíveis:
```typescript
const ITEM_NAMES = {
  16: 'Tango',
  11: 'Quelling Blade',
  44: 'Clarity',
  // ...
};
```

### 2. Imagens de Matchups
URLs das imagens de heróis em matchups usam `hero_{id}` ao invés do nome do herói.

**Solução Atual**: Usar ID do herói na URL
**Solução Futura**: Buscar dados completos dos heróis e usar nome correto

### 3. Sinergias Vazias
Backend retorna `synergies: []` vazio.

**Possível causa**: Não implementado ainda no backend ou requer lógica adicional.

## Arquivos Modificados

- `frontend/src/services/api.ts` - Corrigida conversão de dados
- `FIX_NOTES.md` - Este arquivo

## Próximas Melhorias Sugeridas

1. **Mapeamento de nomes de items**: Criar dicionário item_id → nome legível
2. **Cache de heróis**: Cachear lista de heróis para não buscar sempre
3. **Error boundaries**: Tratar erros de forma mais elegante na UI
4. **Loading skeletons**: Usar skeletons ao invés de texto "Carregando..."
5. **Imagens de items**: Adicionar ícones dos items na build
6. **Tooltips**: Adicionar descrições dos items ao passar mouse
