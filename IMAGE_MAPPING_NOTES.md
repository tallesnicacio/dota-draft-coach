# Mapeamento de Imagens - Items e Heróis

## ✅ Implementado

### 1. **Mapeamento de Items** (`frontend/src/constants/items.ts`)

Criado dicionário completo com **180+ items** do Dota 2:

```typescript
export interface ItemInfo {
  id: number;
  name: string;           // Nome interno (ex: "black_king_bar")
  displayName: string;    // Nome para exibição (ex: "Black King Bar")
  image: string;          // URL da imagem no CDN da Steam
}
```

**Items inclusos:**
- ✅ Consumíveis (Tango, Clarity, Observer Ward, etc.)
- ✅ Items básicos (Branches, Circlet, Slippers, etc.)
- ✅ Items intermediários (Boots, Wraith Band, Bracer, etc.)
- ✅ Items avançados (BKB, Manta, Butterfly, etc.)
- ✅ Items situacionais (Aeon Disk, Lotus Orb, Silver Edge, etc.)
- ✅ Items neutros (Keen Optic, Iron Talon, etc.)
- ✅ Aghanim's Scepter e Shard

**Funções helper:**
```typescript
getItemInfo(itemId: number): ItemInfo
getItemByName(itemName: string): ItemInfo | undefined
getAllItems(): ItemInfo[]
```

### 2. **Serviço de API Atualizado** (`frontend/src/services/api.ts`)

#### Conversão de Items
```typescript
// Antes: retornava "item_16", "item_29"
// Depois: retorna "Iron Branch", "Sage's Mask"

const convertItems = (items: Array<{ itemId: number; itemName: string }>) => {
  return items.map(item => {
    const itemInfo = getItemInfo(item.itemId);
    return itemInfo.displayName;
  });
};
```

#### Cache de Heróis
```typescript
// Cache global para resolver imagens de heróis em matchups
let heroesCache: Hero[] = [];

// Atualizado quando busca heróis
async getHeroes(): Promise<Hero[]> {
  const heroes = data.map(convertHero);
  heroesCache = heroes;  // ← Popula cache
  return heroes;
}
```

#### Resolução de Imagens de Heróis em Matchups
```typescript
const getHeroById = (heroId: number): Hero | undefined => {
  return heroesCache.find(h => h.id === heroId.toString());
};

const convertMatchup = (heroId: number, heroName: string) => {
  const hero = getHeroById(heroId);
  const heroImage = hero ? hero.image :
    `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroName}.png`;
  return { heroName, heroImage };
};
```

### 3. **Componente BuildPanel Atualizado**

Agora exibe **imagens dos items**:

```tsx
<div className="flex items-center gap-2">
  {itemInfo && (
    <img
      src={itemInfo.image}
      alt={itemName}
      className="w-8 h-6 object-contain"
      onError={(e) => e.currentTarget.style.display = 'none'}
    />
  )}
  <span className="text-xs">{itemName}</span>
</div>
```

**Features:**
- ✅ Imagem + nome do item
- ✅ Hover para ver nome completo
- ✅ Fallback gracioso se imagem falhar
- ✅ Escala animada ao passar o mouse

### 4. **Componente MatchupsPanel Atualizado**

Agora exibe **imagens dos heróis** corretamente:

```tsx
<img
  src={matchup.heroImage}
  alt={matchup.hero}
  className="w-12 h-12 rounded-lg object-cover border-2 border-border"
  onError={(e) => {
    e.currentTarget.src = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/default.png`;
  }}
/>
```

**Features:**
- ✅ Imagem de alta qualidade dos heróis
- ✅ Borda arredondada
- ✅ Fallback para imagem padrão se falhar

## URLs das Imagens

### Items
```
https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/{item_name}.png
```

**Exemplos:**
- `black_king_bar.png` → Black King Bar
- `power_treads.png` → Power Treads
- `aghanims_shard.png` → Aghanim's Shard

### Heróis
```
https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{hero_name}.png
```

**Exemplos:**
- `antimage.png` → Anti-Mage
- `crystal_maiden.png` → Crystal Maiden
- `nevermore.png` → Shadow Fiend

**Casos especiais:**
- Shadow Fiend = `nevermore`
- Wraith King = `skeleton_king`
- Timbersaw = `shredder`
- Nature's Prophet = `furion`
- Outworld Destroyer = `obsidian_destroyer`
- Windranger = `windrunner`

## Como Funciona

### 1. Carregamento Inicial
```
1. Usuário acessa página
2. HeroPicker carrega lista de heróis via API
3. Lista é armazenada em heroesCache
4. Grid de heróis é exibido com imagens
```

### 2. Seleção de Herói
```
1. Usuário clica em herói
2. API busca dados da build (items por ID)
3. convertItems() mapeia IDs → nomes legíveis
4. BuildPanel exibe items com imagens
5. MatchupsPanel exibe heróis com imagens (usando cache)
```

### 3. Matchups
```
1. Backend retorna heroId e heroName
2. convertMatchup() busca herói no cache
3. Se encontrado: usa image do cache
4. Se não: constrói URL baseado no nome
5. onError fallback para imagem padrão
```

## Benefícios

### UX Melhorada
- ✅ Visual mais rico e profissional
- ✅ Fácil identificação de items e heróis
- ✅ Menos texto, mais visual
- ✅ Consistente com a interface do Dota 2

### Performance
- ✅ URLs diretas para CDN (cache do navegador)
- ✅ Cache de heróis evita buscas repetidas
- ✅ Imagens carregadas sob demanda
- ✅ Fallback gracioso não quebra UI

### Manutenibilidade
- ✅ Mapeamento centralizado em `constants/items.ts`
- ✅ Fácil adicionar novos items
- ✅ Código reutilizável
- ✅ Tipagem forte com TypeScript

## Arquivos Modificados

### Novos
- `frontend/src/constants/items.ts` - Mapeamento de items

### Modificados
- `frontend/src/services/api.ts` - Conversão de items e cache de heróis
- `frontend/src/components/BuildPanel.tsx` - Exibição de imagens de items
- `frontend/src/components/MatchupsPanel.tsx` - Fallback de imagens de heróis

## Como Testar

1. **Recarregar aplicação**
   ```bash
   # Se dev server estiver rodando, apenas recarregue browser
   # Senão:
   npm run dev
   ```

2. **Selecionar um herói**
   - Grid deve mostrar imagens dos heróis
   - Ao clicar, deve carregar build

3. **Verificar Build Panel**
   - Items devem ter ícones + nomes
   - Ex: "Iron Branch" com ícone de galho
   - Ex: "Black King Bar" com ícone do BKB

4. **Verificar Matchups Panel**
   - Tab "Counters" deve mostrar imagens dos heróis counter
   - Tab "Bom Contra" deve mostrar imagens dos heróis favoráveis
   - Tab "Sinergias" deve mostrar imagens dos aliados com sinergia

## Troubleshooting

### Imagens de items não aparecem
1. Verificar console (F12) para erros 404
2. Verificar se itemId está mapeado em `constants/items.ts`
3. Adicionar mapping se item for novo

### Imagens de heróis não aparecem em matchups
1. Verificar se heroesCache foi populado
2. Console deve mostrar `{X} heróis carregados`
3. Verificar se heroId existe no cache

### Imagens quebradas
1. URLs seguem padrão da Steam CDN
2. Alguns heróis têm nomes especiais (ver lista acima)
3. Fallback para `default.png` se falhar

## Próximas Melhorias

1. **Tooltips de items** - Descrição ao passar mouse
2. **Imagens maiores** - Versão HD das imagens
3. **Lazy loading** - Carregar imagens sob demanda
4. **Sprite sheets** - Otimizar carregamento de múltiplas imagens
5. **Cache local** - LocalStorage para items
6. **Item stats** - Mostrar stats do item (custo, atributos)
