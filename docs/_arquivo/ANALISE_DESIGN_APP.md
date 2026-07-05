# Análise profunda do design do aplicativo Sibanki

Documento focado em **arquitetura, fluxo de dados, consistência de UI/UX, segurança e melhores práticas** — e em como o app se compara ao que se propõe (controle financeiro inteligente com IA, multi-módulo, PWA).

---

## 1. Visão geral da arquitetura

| Aspecto | Situação atual | Avaliação |
|--------|----------------|-----------|
| **Estrutura** | SPA em um único arquivo (`public/app/index.html` ~15,7k linhas: HTML + CSS + JS) | ⚠️ Monólito difícil de manter, testar e fazer code review. |
| **Estado** | Variáveis globais soltas: `entries`, `goals`, `budgets`, `userCats`, `userAccs`, `accountBalances`, `recurrents`, `cards`, `investments`, `achievements`, `commProfile`, `commPosts`, etc. | ⚠️ Sem single source of truth; risco de estado inconsistente e difícil de debugar. |
| **Framework** | Nenhum (Vanilla JS) | ✅ Simples de deploy e sem dependências de build; ❌ sem reatividade, sem componentes reutilizáveis, sem tipagem. |
| **Backend** | Firebase (Auth, Firestore, Functions, Hosting) | ✅ Adequado para o escopo: auth, persistência e server-side (Stripe, BRAPI, Telegram, Gemini). |

**Conclusão:** A escolha “tudo em um arquivo + Firebase” é funcional e alinhada a um MVP/PWA sem build, mas **não escala bem** para muitas pessoas trabalhando ou para evoluir módulos de forma isolada. A falta de um “estado central” dificulta previsibilidade e testes.

---

## 2. Fluxo de dados e lógica

### 2.1 Carregamento inicial

```
Auth (onAuthStateChanged) → U definido → loadData() → Firestore get()
  → preenche entries, goals, budgets, userCats, userAccs, etc.
  → initUI() → renderCatTags(); renderAccTags(); renderAll(); popTfSels(); ...
  → go('dash', firstNi) em setTimeout(50)
  → maybeShowOnboarding() em setTimeout(200)
  → loadBg hidden
```

- **loadData()** tenta primeiro `source:'server'`; em erro (unavailable/resource-exhausted) faz fallback para cache.
- **initUI()** é o “orquestrador” da primeira pintura: atualiza categorias/contas, chama **renderAll()**, preenche filtros, carrega tema, token BRAPI, etc.
- Há **duplicação de lógica** no `.then()` e no `.catch()` de loadData (mesmo bloco de atribuição e initUI repetido). Um único bloco “applyDoc(doc)” reduziria bugs e manutenção.

**Avaliação:** O fluxo “login → load → initUI → dashboard” é claro. O que falta é: **tratamento explícito de loading/erro por etapa** (ex.: “carregando contas…”, “falha ao carregar metas”) e **evitar repetir o mesmo código em vários ramos do loadData**.

### 2.2 Persistência (saveData)

- **saveData()** grava no Firestore um objeto único com: entries, investments, achievements, goals, budgets, categories, accounts, accountBalances, recurrents, cards, name, email, updated, commProfile, commPosts, commBookmarks.
- **Chamadas:** saveData() aparece dezenas de vezes no código (após add/edit/delete de lançamento, meta, orçamento, cartão, transferência, importação, configuração, etc.).
- **Sem debounce:** Cada ação do usuário (ex.: adicionar um lançamento) dispara um `set()` imediato no Firestore.

**Problemas:**

1. **Muitas escritas:** Várias ações rápidas = várias escritas. Um debounce de 1–2 s reduziria custo e risco de rate limit.
2. **Documento único gigante:** Tudo no mesmo `users/{uid}`. Com muitos `entries` (ex.: 10k+), o documento fica pesado; leituras e escritas carregam/sobrescrevem o documento inteiro.
3. **Conflitos:** Dois tabs abertos podem sobrescrever um ao outro (sem merge baseado em timestamp ou em operações).

**Recomendações:**

- **Curto prazo:** Debounce em saveData (ex.: 1,5 s) e manter um “dirty flag” para não salvar se nada mudou.
- **Médio prazo:** Considerar subcoleções (ex.: `users/{uid}/entries`) para listas grandes, ou pelo menos paginação e “lazy load” de entries antigas.

### 2.3 Renderização (renderAll)

**renderAll()** chama em sequência:

- rKPI(); rE(); rCharts(); rDicas(); rBadges(); rRel(); rInv();
- renderPortfolio(); rMetas(); rOrc(); checkAch(); renderCarteira(); renderDashW(); renderInsightDoDia(); rnRc(); checkAlerts(); renderDashPremium(); renderNewCharts(); renderCards(); renderFatura(); popFilMes(); popTfSels(); bldN(); etc.

Ou seja: **qualquer mudança que chame renderAll() re-renderiza todo o app** (KPIs, tabela de lançamentos, gráficos, dicas, badges, relatórios, investimentos, metas, orçamento, carteira, cartões, fatura, filtros, notificações…), mesmo que só uma aba esteja visível.

**Problemas:**

1. **Performance:** Com muitos dados, cada “salvar lançamento” ou “mudar filtro” recalcula e redesenha tudo. Em mobile ou com muitos entries, isso pode travar ou demorar.
2. **Filtros na aba Lançar:** `filMes`, `filBusca`, `filTipo` disparam `onchange`/`onkeyup` → renderAll(). O `onkeyup` em “Buscar” re-renderiza tudo a cada tecla (sem debounce visível no handler).
3. **Duplicação de “filtro de entries”:** getFilteredEntries() (usado na aba Lançar) e a função rE() aplicam filtros de forma parecida mas em lugares diferentes (rE() lê filM, filT, filA, filDe, filAte, filCat, filMin, filMax; getFilteredEntries lê filMes, filBusca, filTipo). Dois conjuntos de filtros para a mesma lista aumentam risco de inconsistência e manutenção.

**Recomendações:**

- **Curto prazo:**  
  - Fazer renderAll() só atualizar as seções da **aba ativa** (ex.: se tab “lanc” está on, chamar só rE() + rKPI() + o que for necessário para o dashboard resumido).  
  - Unificar “filtro de entries” em uma única função (ex.: getFilteredEntries()) e fazer rE() usar só ela.  
  - Debounce no campo de busca (ex.: 300 ms) antes de chamar renderAll() ou rE().
- **Médio prazo:** Quebrar “renderAll” em funções por contexto (renderDashboard(), renderLanc(), renderInvest(), etc.) e chamar apenas o bloco relevante após cada ação.

### 2.4 Navegação (go)

- **go(id, el)** remove `.on` de todas as `.tab` e `.ni`, ativa a tab `id` e o item de menu `el`, faz scroll para o topo.
- Hooks por aba: ao entrar em “comunidade” chama initCommunity; em “config” chama loadIAUsage e checkTelegramLink; em “casal” mostra familyChildSection e childAdminPanel; em “lanc” initLancDate; em “calendario” rCal().

**Avaliação:** O padrão “mudar tab → executar hook” é claro. O que falta é **lazy init**: não montar todo o HTML de todas as abas no primeiro load; ou pelo menos não executar lógica pesada de abas que o usuário nunca abrir. Hoje todo o DOM já está presente e renderAll() atualiza tudo.

---

## 3. UI/UX e consistência

### 3.1 Pontos fortes

- **Design system em CSS:** Variáveis :root (--vr, --bg, --card, --t1, --t2, --brd, --r, --rs, etc.), classes reutilizáveis (.kpi, .cb, .tb, .btn, .fg, .fr, .bdg, .modal-overlay, .onb-*). Consistência visual e de espaçamento.
- **Feedback imediato:** toasts em erros e sucessos; botões desabilitados durante login/registro; loadBg durante loadData.
- **Onboarding e tour:** Fluxo de 4 passos + tour de 18 passos pós-onboarding bem definidos e com persistência (Firestore + localStorage).
- **Acessibilidade parcial:** Alguns `role` e `aria-label` (ex.: nav, main, Buscar); foco em campos críticos (ex.: após “Lançar meu primeiro gasto”).

### 3.2 Lacunas

- **Muitos IDs diretos:** Uso intenso de getElementById('...'). Qualquer troca de ID quebra a função. Não há camada de “componentes” que escondam os IDs.
- **Duplicação de filtros:** Dois “sistemas” de filtro para lançamentos (aba Lançar com filMes/filBusca/filTipo vs rE() com filM/filT/filA/filDe/filAte/filCat/filMin/filMax) podem confundir e gerar bugs.
- **Listas longas:** A tabela de lançamentos (rE()) monta todo o HTML de uma vez. Com 1.000+ entries, o DOM fica pesado; não há virtualização nem paginação no front.
- **Mobile:** Nav com muitos .ni pode quebrar linha de forma confusa; não foi validado comportamento em telas muito pequenas em todos os fluxos.

**Recomendações:**

- Unificar filtros de lançamentos e expor uma única API (getFilteredEntries com todos os parâmetros).
- Para listas grandes: paginação (ex.: 50 por página) ou virtualização (renderizar só as linhas visíveis).
- Considerar um “mapa” de IDs (objeto ou constantes) para reduzir strings mágicas.

---

## 4. Segurança

### 4.1 XSS (Cross-Site Scripting)

- Há **centenas de usos de innerHTML** no arquivo. Vários deles interpolam dados do usuário **sem escape**:
  - **rE():** monta linhas da tabela com `e.desc`, `e.category`, `e.account`, `e.tags`, etc. Se o usuário salvar `<script>...` ou `<img onerror="...">` em desc/categoria, o script roda.
  - **openKpiModal:** usa `e.desc` e valores em HTML (content += '...' + e.desc + '...') e depois innerHTML no modal.
  - **renderCatTags / renderAccTags:** montam onclick com nome da categoria/conta; se o nome tiver aspas ou caracteres especiais, pode quebrar ou abrir brecha.
  - Outros blocos que montam listas (metas, orçamento, cartões, comunidade, etc.) também podem inserir conteúdo do usuário em HTML.

**Recomendação obrigatória:** Criar uma função `escapeHtml(str)` (ou usar textContent onde for só texto) e usá-la em **todo** innerHTML que incluir:
- desc, category, account, tags, nome de meta, nome de cartão, comentários da comunidade, etc.

Exemplo:

```js
function escapeHtml(s) {
  if (s == null) return '';
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
```

Substituir concatenações do tipo `'<td>'+ e.desc +'</td>'` por `'<td>'+ escapeHtml(e.desc) +'</td>'`.

### 4.2 CSP e dependências

- A CSP atual permite `'unsafe-inline'` e `'unsafe-eval'` em script. Isso reduz a proteção contra XSS. O ideal é ir eliminando inline scripts e eval e endurecer a CSP.
- Scripts de terceiros (Firebase, Chart.js, Confetti, etc.) são carregados por CDN; confiar nos domínios oficiais é razoável, mas vale documentar e, se possível, usar integridade (SRI) nos scripts.

### 4.3 Auth e Firestore

- Autenticação e regras do Firestore (server-side) estão alinhadas com “cada usuário só acessa seus dados”. Isso está correto do ponto de vista de segurança de dados.

---

## 5. Performance

| Ponto | Situação | Recomendação |
|------|----------|--------------|
| **Tamanho do arquivo** | ~15,7k linhas em um único HTML | A longo prazo: separar JS (e eventualmente CSS) em módulos e carregar sob demanda por aba ou feature. |
| **renderAll** | Re-renderiza tudo a cada ação | Renderizar só a aba/seção visível; debounce em filtros. |
| **saveData** | Sincrono e sem debounce | Debounce 1–2 s; salvar só quando houver mudança (dirty). |
| **Listas** | Tabela de lançamentos e outras listas sem paginação | Paginação ou virtualização para listas grandes. |
| **Gráficos** | Chart.js; vários gráficos no dashboard | Criar/destruir gráficos por aba ou lazy init; evitar redesenhar todos a cada renderAll. |
| **Service Worker** | Cache-first, depois network; fallback “Offline” | Ok para PWA; considerar estratégia “network-first” para a API do app (Firestore) e cache para estáticos. |

---

## 6. Manutenção e escalabilidade do código

- **Nomenclatura:** Mistura de português e inglês (rKPI, rE, rMetas, renderCarteira, getFilteredEntries, addE, delE, saveData). Padronizar (ex.: tudo em inglês para funções/variáveis) facilita para novos devs.
- **Funções muito longas:** Várias funções com dezenas de linhas e múltiplas responsabilidades (ex.: loadData, initUI, renderAll). Quebrar em funções menores com nomes descritivos melhora leitura e testes.
- **Duplicação:** Lógica de “aplicar doc ao estado + initUI” repetida em loadData; filtros de entries em dois lugares; construção de options de select repetida em vários pontos. Extrair para funções únicas reduz bugs.
- **Testes:** Não há testes automatizados visíveis no repositório. Para um app com lógica financeira (cálculo de saldo, metas, orçamento), testes unitários para funções puras (fmt, getAccBal, getFilteredEntries, etc.) seriam muito úteis.

---

## 7. Resumo: está a lógica fluida e eficiente?

- **Fluidez para o usuário:** Em uso normal (centenas de lançamentos, algumas metas e cartões), o app responde e o fluxo “login → dashboard → lançar → ver gráficos” é coerente. O que pode atrapalhar é: muitas abas e listas pesadas sem paginação, e re-render completo a cada ação.
- **Eficiência técnica:** Há desperdício de trabalho (renderAll completo, saveData sem debounce, documento Firestore único e grande) e risco de segurança (XSS em innerHTML com dados do usuário). A abordagem “tudo em um arquivo, estado global, re-render geral” é compreensível para um MVP, mas não é a mais eficiente para crescimento e segurança.

---

## 8. Priorização sugerida (ações práticas)

| Prioridade | Ação | Impacto | Esforço |
|------------|------|--------|--------|
| 1 | **Escape XSS:** escapeHtml() em rE, openKpiModal, tags (delCatByIndex/delAccByIndex). Feito. | Segurança alto | Médio |
| 2 | **Debounce saveData:** 1,5 s e dirty flag; evitar salvar sem mudança | Performance e custo Firestore | Baixo |
| 3 | **Unificar filtros de entries:** Uma única getFilteredEntries(mes, tipo, conta, busca, dataDe, dataAte, cat, min, max) e rE() só usar essa função | Consistência e manutenção | Baixo |
| 4 | **Debounce no campo Buscar (Lançar):** 300 ms antes de re-renderizar | Performance em digitação | Baixo |
| 5 | **renderAll condicional:** Se tab ativa for conhecida, chamar só as funções de render daquela aba + KPIs comuns | Performance | Médio |
| 6 | **Refatorar loadData:** Um único bloco applyDoc(doc) usado no .then e no .catch; reduzir duplicação | Manutenção | Baixo |
| 7 | **Paginação na tabela de lançamentos:** Ex.: 50 por página com “Carregar mais” ou paginação numérica | Performance e UX em listas grandes | Médio |
| 8 | **Documento de estado:** Criar um objeto appState e, onde fizer sentido, ler/escrever por ele (facilita depois migrar para um estado reativo ou framework) | Escalabilidade | Médio |

**Implementado (sessão atual):** Itens 1 a 6 — escapeHtml, debounce saveData + saveDataNow, getFilteredEntries unificado, debounce busca, renderAll condicional por aba, loadData refatorado com applyDocFromServer. Pendentes: 7 (paginação) e 8 (appState); retomar com o roadmap.

---

## 9. Conclusão

O Sibanki **entrega a proposta** de app financeiro multi-módulo com IA, PWA e Firebase de forma funcional e com boa experiência em cenários típicos. A **lógica de negócio** (saldo por conta, metas, orçamento, cartões, importação, PDF, IA) está organizada em funções que podem ser evoluídas.

Os principais pontos a melhorar para **design mais sólido e eficiente** são:

1. **Segurança:** Eliminar XSS em todo conteúdo gerado a partir de dados do usuário.
2. **Dados:** Debounce e dirty flag no save; considerar subcoleções ou paginação para listas grandes.
3. **Render:** Evitar re-render completo; unificar filtros e debounce em buscas.
4. **Código:** Reduzir duplicação (loadData, filtros), quebrar funções gigantes e padronizar nomenclatura; no longo prazo, separar módulos e considerar testes automatizados.

Com essas melhorias, o app fica mais seguro, mais rápido e mais fácil de manter sem precisar, necessariamente, migrar para um framework pesado de imediato.
