# Issues Pendentes - Sibanki App

## 1. Dropdown do Avatar não funciona
**Status:** Pendente  
**Prioridade:** Alta  
**Arquivo:** `public/app/app.js` (linha ~750) e `public/app/index.html` (linha ~375)

**Descrição:**  
O botão do avatar no header (canto superior direito) não abre o dropdown quando clicado.

**Função afetada:**
```javascript
function toggleAvatarDropdown(e)
```

**Elementos HTML:**
- `#topHeaderAvatar` - botão do avatar
- `#avatarDropdown` - dropdown menu

**Observações:**
- A função é chamada corretamente (verificado via console.log)
- Os elementos existem no DOM
- A classe `open` é adicionada ao dropdown
- Possível conflito com otimizações de performance adicionadas

---

## 2. Travamentos da página
**Status:** Parcialmente resolvido  
**Prioridade:** Alta  
**Arquivo:** `public/app/app.js`

**Descrição:**  
A página trava frequentemente, especialmente no carregamento inicial e ao navegar entre abas.

**Causas identificadas:**
- Arquivo `app.js` com 16.000+ linhas
- 109 chamadas de `lucide.createIcons()`
- 44 chamadas de `renderAll()`
- 50+ gráficos Chart.js sendo criados/destruídos
- Transições CSS globais em todos elementos

**Otimizações aplicadas:**
- CSS: Transições apenas em elementos interativos (funcionando)
- JS: Debounce no Lucide, renderAll e rCharts (pode estar causando problema no dropdown)

**Sugestão para correção definitiva:**
- Modularizar o arquivo `app.js` em múltiplos arquivos menores
- Implementar lazy loading de componentes por aba
- Usar Web Workers para processamento pesado

---

## 3. Ícones com nome incorreto
**Status:** Corrigido  
**Arquivo:** `public/app/index.html`

**Descrição:**  
Ícones `circle-dollar` não existem no Lucide. Corrigido para `circle-dollar-sign`.

---

## Histórico de alterações (12/03/2026)

1. CSS: Removida transição global `*{transition:...}` - **OK**
2. JS: Otimizador Lucide com debounce - **Pode afetar dropdown**
3. JS: Throttle no renderAll - **Pode afetar dropdown**
4. JS: Debounce no rCharts - **OK**
5. HTML: Corrigido nome dos ícones circle-dollar - **OK**
