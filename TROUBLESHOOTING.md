# Troubleshooting - Frontend Issues

## Problema: Não consigo selecionar/digitar nenhum herói

### Possíveis Causas e Soluções

#### 1. **Componentes Select do shadcn-ui não aparecem**

**Sintoma**: Ao clicar nos dropdowns de Patch ou MMR, nada acontece ou o menu não aparece.

**Solução A - Verificar Portal**:
Os componentes Select do shadcn-ui usam Radix UI que renderiza em um portal. Verifique se há estilos CSS conflitantes.

```bash
# Abra o console do browser (F12) e execute:
document.querySelectorAll('[data-radix-portal]')
```

Se não retornar nada quando o dropdown estiver "aberto", há um problema de renderização.

**Solução B - Verificar z-index**:
Adicione ao arquivo `frontend/src/index.css`:

```css
[data-radix-popper-content-wrapper] {
  z-index: 9999 !important;
}
```

#### 2. **Input de busca não funciona**

**Sintoma**: Campo de busca de heróis não responde ao digitar.

**Solução**: Verifique no console do browser (F12) se há erros de JavaScript.

#### 3. **Heróis não aparecem no grid**

**Sintoma**: Grid de heróis fica vazio ou mostra "Carregando heróis..." indefinidamente.

**Diagnóstico**:
1. Abra o console (F12)
2. Vá para a aba Network
3. Recarregue a página
4. Procure por chamada para `/api/heroes`
5. Verifique se:
   - Status é 200 OK
   - Resposta contém array de heróis

**Se API falha**:
```bash
# Verificar se backend está rodando
curl http://localhost:3001/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
```

**Se API retorna dados mas heróis não aparecem**:
- Verifique console para erros ao converter dados
- Verifique se imagens estão carregando (aba Network → Img)

#### 4. **Imagens dos heróis não carregam**

**Sintoma**: Grid aparece mas imagens estão quebradas.

**Solução**: As URLs das imagens são construídas dinamicamente. Verifique se:

```
https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{hero_name}.png
```

Está acessível. Alguns heróis têm nomes especiais:
- Shadow Fiend = `nevermore`
- Wraith King = `skeleton_king`
- Timbersaw = `shredder`
- etc.

### Como Debugar Passo a Passo

#### Passo 1: Verificar se backend está rodando

```bash
curl http://localhost:3001/health
```

Deve retornar JSON com `"status":"ok"`.

#### Passo 2: Verificar se frontend se comunica com backend

Abra http://localhost:5173 e abra o console (F12). Deve ver:

```
Carregando heróis...
123 heróis carregados [...]
```

Se não ver isso:
1. Erro de rede → backend não está rodando ou proxy falhou
2. Erro de CORS → configurar CORS no backend
3. Erro 404 → rota errada

#### Passo 3: Inspecionar elementos

Use o Dev Tools (F12):
- **Elements tab**: Verifique se o HTML dos heróis foi renderizado
- **Console tab**: Procure por erros em vermelho
- **Network tab**: Verifique chamadas à API
- **Sources tab**: Adicione breakpoints no código para debugar

#### Passo 4: Verificar estado React

Instale a extensão **React Developer Tools**:
- Chrome: https://chrome.google.com/webstore → React Developer Tools
- Firefox: https://addons.mozilla.org/firefox → React Developer Tools

Depois:
1. Abra Dev Tools (F12)
2. Vá para aba "Components"
3. Encontre `HeroPicker`
4. Verifique o estado:
   - `loading`: deve ser `false` após carregar
   - `heroes`: deve ter array com ~123 heróis
   - `search`: deve mudar quando você digita

### Verificações Rápidas

```bash
# Backend rodando?
ps aux | grep "tsx watch" | grep -v grep

# Frontend rodando?
ps aux | grep vite | grep -v grep

# Portas corretas?
netstat -tlnp | grep -E "3001|5173"
```

### Teste Manual da Integração

1. **Abrir http://localhost:5173**
   - Deve ver título "Guia de Build Dota 2"
   - Deve ver filtros de Patch e MMR no topo
   - Deve ver componente Timers no canto superior direito

2. **Aguardar carregamento**
   - Ver mensagem "Carregando heróis..." por 1-2 segundos
   - Grid de heróis deve aparecer

3. **Buscar herói**
   - Digitar "anti" no campo de busca
   - Deve filtrar para mostrar apenas "Anti-Mage"

4. **Selecionar herói**
   - Clicar em qualquer herói
   - Deve ver "Carregando dados..." por 1-2 segundos
   - Deve aparecer: Imagem do herói, nome, Build, Skills, Matchups

5. **Testar draft context**
   - Com herói selecionado, clicar em "+ Adicionar Aliado"
   - Selecionar um aliado
   - Dados devem recarregar (ver "Carregando dados..." novamente)

6. **Testar timers**
   - No componente Timers, selecionar "Runa de Poder"
   - Clicar "Iniciar"
   - Timer deve aparecer contando de 7:00 para baixo

### Se Nada Funciona

**Reset Completo**:

```bash
# Parar tudo
pkill -f "node|vite|tsx"

# Limpar node_modules
cd /home/tallesnicacio/dota2-coach
rm -rf node_modules frontend/node_modules backend/node_modules
rm -rf package-lock.json frontend/package-lock.json backend/package-lock.json

# Reinstalar
npm install
cd frontend && npm install
cd ../backend && npm install

# Reiniciar
cd /home/tallesnicacio/dota2-coach
npm run dev
```

**Verificar Logs**:

```bash
# Ver logs do backend
tail -f /home/tallesnicacio/dota2-coach/backend/*.log

# Ver logs no console do browser
# F12 → Console tab
```

### Problemas Conhecidos

1. **Select do shadcn-ui não abre**: Comum em ambientes com z-index complexo
2. **Imagens 404**: Alguns heróis têm nomes diferentes na URL vs nome display
3. **CORS errors**: Backend precisa ter CORS habilitado para dev
4. **Rate limiting**: OpenDota API tem limite de requests

### Contato para Suporte

Se o problema persistir:
1. Abra o console do browser (F12)
2. Tire screenshot da aba Console com os erros
3. Tire screenshot da aba Network mostrando as requisições
4. Anote exatamente o que você tentou fazer
5. Compartilhe essas informações

## Logs Úteis

### Ver o que está sendo carregado
```javascript
// No console do browser (F12 → Console):
console.log(window.localStorage)
console.log(document.querySelectorAll('[data-hero]'))
```

### Forçar reload de dados
```javascript
// No console do browser:
localStorage.clear()
location.reload()
```

### Verificar store Zustand
```javascript
// Adicione temporariamente no código:
console.log(useBuildStore.getState())
```
