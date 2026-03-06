# Sibanki / Virtus Financeiro

App de controle financeiro pessoal com IA, Bot Telegram (e **bot WhatsApp previsto**), Modo Família, investimentos, metas e relatórios. PWA + Firebase.

- **App:** [virtus-financeiro-cd7bd.web.app](https://virtus-financeiro-cd7bd.web.app)
- **Docs:** [docs/](docs/) (análises e roadmap)

---

## Estrutura

| Pasta / arquivo | Descrição |
|-----------------|-----------|
| `public/` | App SPA (`app/index.html`), landing (`index.html`), docs estáticos |
| `functions/` | Cloud Functions (Stripe, BRAPI, notícias, **Telegram bot**) — ver `functions/README.md` |
| `docs/` | `ANALISE_PROJETO_SIBANKI.md`, `ANALISE_DESIGN_APP.md` (roadmap e priorização) |

---

## Próximas pendências (a partir da análise em `docs/`)

Com base em **docs/ANALISE_PROJETO_SIBANKI.md** e **docs/ANALISE_DESIGN_APP.md**:

### Produto / UX

| # | Pendência | Fonte | Esforço |
|---|-----------|--------|--------|
| 1 | **Importação:** sugestão de categoria por IA (Gemini) quando a coluna de categoria não existir ou for genérica | §4.3 | Médio |
| 2 | **Modo Família:** mesadas — confete ao completar missão, histórico de pagamentos, notificação aos pais | §4.5 | Alto |
| 3 | **Telegram:** alertas automáticos (conta a pagar, meta atingida, orçamento estourado) no bot | §4.6 | Médio |
| 4 | **Comunidade:** transformar em "dicas da comunidade" ou desafios mensais para engajamento | §4.8 | Alto |
| 5 | **Landing:** depoimentos e reforço de CTA (já tem hero, planos, FAQ) | §4.7 | Baixo |
| 6 | **Bot WhatsApp:** mesmo conceito do Telegram (lançar gastos, saldo, alertas) via WhatsApp Business API; para demo/investidores no gratuito, evoluir para recursos premium no pago | Roadmap | Alto (API paga por conversa) |

### Técnico / Design (ANALISE_DESIGN_APP)

| # | Pendência | Impacto |
|---|-----------|--------|
| 7 | **Paginação** na tabela de lançamentos já existe (50 por página); revisar se há edge cases | UX |
| 8 | **appState:** objeto de estado único e, onde fizer sentido, ler/escrever por ele (preparar reatividade) | Escalabilidade |
| 9 | **Subcoleções ou lazy load** para `entries` muito grandes (evitar documento único gigante) | Performance |

### Já implementado (referência)

- Onboarding: redirecionar para Lançar ao concluir; primeiro lançamento guiado (destaque no formulário); card Importar extrato no dashboard.
- Card Insight do Dia; saúde financeira com frase explicativa; previsão de fim do mês.
- Importação: preview com edição de categoria e totais (CSV genérico e fatura cartão); mensagem de sucesso.
- PDF: capa, resumo, rodapé, cores de marca (gerarPDF + Exportar na aba Relatórios).
- Modo Família: convite com link direto, status "Aguardando aceite de [email]", abertura por `#invite=ID`.
- Telegram: vinculação por código (coleção `telegramCodes`, 10 min); lançamento em linguagem natural (ex.: "compras no mercado 350 reais"); comandos `/resumo`, `/saldo`, `/carteira`, etc.
- Design: escapeHtml, debounce saveData, getFilteredEntries unificado, renderAll condicional por aba, loadData refatorado.

---

## Deploy

```bash
firebase deploy                  # hosting + functions + firestore rules
firebase deploy --only hosting   # só app e landing
firebase deploy --only functions # só Cloud Functions
```

Variáveis de ambiente das functions: ver **functions/README.md** (Stripe, Telegram, Gemini, BRAPI, notícias).
