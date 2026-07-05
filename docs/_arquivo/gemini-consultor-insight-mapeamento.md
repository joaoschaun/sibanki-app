# Mapeamento: conversa Gemini → implementações Sibanki

Este documento relaciona as propostas da conversa com o Gemini (consultor financeiro, anti-poluição, RAG, gatilhos, score, LLM própria) com o que **já existe** no projeto e o que foi **implementado** nesta sessão.

---

## 1. O que o Gemini propôs (resumo)

- **Fallback de APIs:** OpenRouter, Hugging Face, DeepSeek, GitHub Models.
- **Consultor “invisível”:** Progressive disclosure, semáforo na home, insights só quando há gatilho, feedback 👍/👎.
- **RAG / Snapshot:** Não enviar extrato bruto; snapshot em markdown; resposta em JSON (insight_curto, detalhe, acao_sugerida, deep_link, relevancia_score).
- **Gatilhos:** Só chamar a IA quando: anomalia (categoria >30% acima da média), burn rate, oportunidade (economia → meta), fatura próxima (vencimento ≤3 dias e saldo < fatura).
- **Financial Health Score (FHS):** Fórmula 40% Solvência + 40% Orçamento + 20% Metas; usar para decidir quando exibir alerta ou parabenizar.
- **Armazenar para treino:** Log de contexto + resposta + feedback para fine-tuning de LLM própria (JSONL).
- **Intent + lançamento por voz/texto:** Classificar REGISTER_TRANSACTION / FINANCIAL_QUERY / APP_NAVIGATION; extração profunda (valor, categoria, método, data); Speech-to-Text (Whisper/Google).

---

## 2. O que já existia no Sibanki

| Recurso | Onde está |
|--------|------------|
| Fallback LLM | `functions/services/llm/llmService.js`: Gemini → Groq → DeepSeek → OpenAI → Claude |
| Consultor no app | `chatApi` (Cloud Function) + `getFinancialContext` / `buildPrompt` em `app.js` |
| RAG (conhecimento) | `getRagChunksForMessage` em `functions/index.js`; usado no `chatApi` |
| Score simples | `calcFinScore()` em `app.js` (1–10, baseado em % gasto, metas, orçamento, investimentos) |
| Mini badge de score na home | `#dashScoreBadge` ao lado do “Bom dia, [Nome]”; preenchido em `rKPI()` |
| Extração de lançamento | `llmService.extractEntry` (usado em WhatsApp, etc.) |
| Feedback 👍/👎 no FAB | Modal do consultor FAB: thumbs-up/thumbs-down; persistência em `users/{uid}/aiFeedback` |
| FAB voz/texto | `openModalConsultorFAB`, `fabConsultorSend`, Web Speech API |

---

## 3. O que foi implementado nesta sessão

### 3.1 Backend (Cloud Functions)

- **`generateProactiveInsight(snapshotMarkdown)`** em `functions/services/llm/llmService.js`
  - Recebe snapshot em markdown.
  - Usa system prompt fixo (consultor objetivo, regra 50-30-20, sem invenção de dados).
  - Pede resposta **apenas em JSON**: `insight_curto`, `detalhe`, `acao_sugerida`, `deep_link`, `relevancia_score`; ou `{"status":"OK"}` quando não houver relevância.
  - Retorna objeto parseado ou `{ status: "OK" }`.

- **`proactiveInsightApi`** em `functions/index.js`
  - Callable HTTPS; recebe `{ snapshot: string }`.
  - Chama `generateProactiveInsight` e devolve o resultado ao cliente.

### 3.2 Front (public/app)

- **`buildSnapshotMarkdown(ctx)`**
  - Monta markdown curto a partir de `getFinancialContext()`: score, receita/despesa/saldo do mês, % gasto, top categorias, contas, metas, orçamentos.
  - Usado como input do insight proativo.

- **`checkInsightTriggers()`**
  - **Anomalia:** alguma categoria do mês > 30% acima da média dos últimos 3 meses → `shouldGenerate: true`, `reason: 'anomalia'`.
  - **Fatura próxima:** fatura(s) com vencimento em até 3 dias e saldo total < valor das faturas → `reason: 'fatura'`.
  - **Score baixo / desequilíbrio:** score < 50 ou despesa > receita → `reason: 'score'`.
  - Caso contrário: `shouldGenerate: false` (não chama a IA).

- **`fetchAndRenderProactiveInsight()`**
  - Chamada ao abrir o dashboard (com pequeno delay).
  - Só chama a API se `checkInsightTriggers()` indicar gatilho.
  - Cache por dia em `localStorage` (`sibanki_proactive_insight_YYYY-MM-DD`) e em `window._lastProactiveInsight`.
  - Se a API retornar `status: 'OK'`, o card fica oculto.

- **`renderProactiveInsightCard(insight)`**
  - Preenche `#dashProdutoInsightCard` com: título (insight_curto), detalhe, botão de ação (deep link) e botões 👍/👎 (Lucide).

- **`saveProactiveInsightFeedback(value)`**
  - Persiste em `users/{uid}/aiFeedback` (mesmo contrato do feedback do FAB): `contextStr`, `aiReply` (JSON do insight), `feedback` (1 ou -1), `createdAt`.
  - Serve para treino futuro e calibração de relevância.

- **CSS** em `app.css`
  - Classes `.dash-insight-proativo-card`, `.dash-insight-proativo-hd`, `.dash-insight-proativo-title`, `.dash-insight-proativo-detalhe`, `.dash-insight-proativo-actions`, `.dash-insight-proativo-feedback` para o card de insight na home.

### 3.3 Fluxo na home

1. Usuário abre o dashboard (aba “dash”).
2. Após `rKPI()` e widgets, `fetchAndRenderProactiveInsight()` roda (setTimeout 600 ms).
3. Se houver cache do dia com insight, exibe o card e para.
4. Senão, calcula `checkInsightTriggers()`. Se não houver gatilho, esconde o card e não chama a API.
5. Se houver gatilho, monta `buildSnapshotMarkdown(getFinancialContext())`, chama `proactiveInsightApi({ snapshot })`.
6. Se a resposta for `status: 'OK'`, esconde o card. Caso contrário, guarda no cache e chama `renderProactiveInsightCard(data)`.
7. No card, o usuário pode clicar na ação (deep link) ou em 👍/👎; o feedback é salvo em `aiFeedback`.

---

## 4. O que ficou de fora (para depois)

- **FHS “rico” (40/40/20):** Score atual continua o de `calcFinScore()`. A fórmula Solvência + Orçamento + Metas pode ser adotada em refatoração futura.
- **OpenRouter / Hugging Face:** Fallback hoje é Gemini → Groq → DeepSeek → OpenAI → Claude; outros provedores podem ser adicionados em `llmService.js`.
- **Intent (REGISTER vs QUERY vs NAVIGATION):** FAB continua enviando tudo ao `chatApi`; classificação de intenção e fluxo “registrar lançamento” com micro-formulário podem ser feitos em fase posterior.
- **Speech-to-Text (Whisper/Google):** Continua Web Speech API no FAB; backend com Whisper/Google STT pode ser adicionado depois.
- **Vector DB / RAG vetorial:** RAG atual é por palavras-chave (`getRagChunksForMessage`); Pinecone/Weaviate etc. são evolução futura.
- **Prisma/PostgreSQL:** Projeto usa Firestore; schema e scripts do Gemini (Prisma, seed, export JSONL) são referência para quando/se houver migração ou serviço separado.
- **Export JSONL para fine-tuning:** Dados em `aiFeedback` (e feedback do insight proativo) já estão no formato útil; script de export para JSONL pode ser criado quando for treinar LLM própria.

---

## 5. Arquivos alterados ou criados

| Arquivo | Alteração |
|---------|-----------|
| `functions/services/llm/llmService.js` | `generateProactiveInsight`, system prompt, export |
| `functions/index.js` | `proactiveInsightApi` callable, require de `generateProactiveInsight` |
| `public/app/app.js` | `buildSnapshotMarkdown`, `checkInsightTriggers`, `fetchAndRenderProactiveInsight`, `renderProactiveInsightCard`, `saveProactiveInsightFeedback`, chamada no dashboard |
| `public/app/app.css` | Estilos do card de insight proativo |
| `docs/gemini-consultor-insight-mapeamento.md` | Este documento |

---

## 6. Referências

- Consultor IA e feedback: `docs/ia-consultor-feedback-e-fallback.md`
- Regras Firestore (incl. `aiFeedback`): `docs/regras-firebase.md`
- Configuração DEEPSEEK_KEY em produção: `.cursor/rules/segunda.mdc`
