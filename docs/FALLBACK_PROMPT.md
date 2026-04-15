# FALLBACK_PROMPT.md — Prompts de Handoff do Pipeline Sibanki

> Dois sentidos: **Antigravity → Cowork** e **Cowork → Antigravity**

> **Como usar:** Quando os tokens do Antigravity acabarem, abra o Claude.ai (Cowork),
> inicie uma nova conversa no Project do Sibanki, e cole o prompt abaixo.
> Substitua os valores entre `[colchetes]` antes de enviar.

---

## 📋 Prompt A — Antigravity → Cowork
### Quando usar: tokens do Antigravity acabaram; colar no Claude Cowork

```
Você está continuando o trabalho do Antigravity (meu assistente de código) no projeto Sibanki Financial OS.
Os tokens do Antigravity acabaram no meio de uma sessão.

**Ação imediata — leia estes arquivos na ordem:**

1. `docs/SESSION_HANDOFF.md` — estado exato da sessão que foi interrompida
2. `CLAUDE.md` — memória permanente do projeto (fonte de verdade)
3. `docs/TASK_QUEUE.md` — fila de tarefas e status atual da pipeline

Após ler os três, me diga:
- O que estava sendo feito
- Qual é a próxima ação
- Se há algo bloqueado que você precisa de mim para resolver

Não proponha nada ainda — primeiro me dê o resumo do estado atual.
```

---

## 📋 Prompt B — Cowork → Antigravity
### Quando usar: sessão do Claude Cowork terminou; falar com o Antigravity no IDE

```
Meus tokens do Claude Cowork acabaram no meio de uma sessão de trabalho.
Por favor, leia os arquivos abaixo na ordem e continue de onde parei:

1. docs/SESSION_HANDOFF.md  ← estado da sessão (o mais importante)
2. docs/TASK_QUEUE.md       ← status do pipeline e tarefas
3. CLAUDE.md                ← memória completa do projeto (se precisar de contexto mais profundo)

Após ler, me diga:
- O que estava sendo feito
- Qual é a próxima ação concreta
- Se há alguma decisão técnica que precisa de mim

Não proponha nada ainda — primeiro confirme o estado atual.
```

**Forma curta (para sessões simples):**
```
Meus tokens do Cowork acabaram. Leia docs/SESSION_HANDOFF.md e continue o trabalho.
```

---

## 🔄 Quando atualizar o SESSION_HANDOFF.md

**Antigravity** e **Claude Cowork** devem atualizar este arquivo nos seguintes momentos:

| Situação | O que atualizar |
|----------|----------------|
| Decisão de arquitetura tomada | Seção "Decisões tomadas nesta sessão" |
| Tarefa escrita no TASK_QUEUE | Seção "O que estávamos fazendo" |
| Cursor concluiu (`CURSOR_DONE`) | Seção "O que NÃO foi feito ainda" |
| Início de verificação | Seção "Próxima ação imediata" |
| Fim de verificação | Seção "O que NÃO foi feito ainda" + marcar como concluído |
| Nova decisão de produto/UX | Seção "Contexto de decisões importantes" |

---

## 🔁 Fluxo completo com fallback

```
📱 João fala com Antigravity
        │
        ▼
🤖 Antigravity trabalha
   + atualiza SESSION_HANDOFF.md nos checkpoints
        │
        ├─── tokens OK ────────────────────────────────►  continua normalmente
        │
        └─── tokens acabam
                │
                ▼
        📋 João abre FALLBACK_PROMPT.md
        📋 João cola o prompt no Claude Cowork
                │
                ▼
        🤖 Cowork lê SESSION_HANDOFF.md + CLAUDE.md + TASK_QUEUE.md
                │
                ▼
        🤖 Cowork continua exatamente de onde parou
                │
                ▼
        (quando Antigravity tokens renovam)
        🤖 Antigravity retoma: lê SESSION_HANDOFF.md atualizado pelo Cowork
```

---

## 📌 Regras para o Claude Cowork neste projeto

1. **Design system Pierre Finance** — nunca adicione botões coloridos, gradientes ou fontes diferentes de Inter
2. **Nunca faça deploy** — apenas João autoriza (`npm run deploy:app` ou `firebase deploy`)
3. **Não crie novos listeners Firestore** — use `AppContext` como fonte única de verdade
4. **Região das Cloud Functions** — BR: `southamerica-east1`; resto: `us-central1`
5. **API keys nunca no frontend** — tudo via Cloud Functions
6. **Atualize CLAUDE.md** ao final da sessão com o que foi feito
7. **Atualize SESSION_HANDOFF.md** ao final de cada resposta relevante

---

## 🆘 Se o Cowork não tiver acesso ao filesystem

Se o Claude Cowork não conseguir ler os arquivos diretamente, peça ao João para colar o conteúdo de:
1. `docs/SESSION_HANDOFF.md` (prioritário — contexto da sessão)
2. A seção `## 🆕 ATUALIZAÇÃO DE SESSÃO` mais recente do `CLAUDE.md`
3. A seção `## 📋 TAREFA ATUAL` do `docs/TASK_QUEUE.md`

Isso é suficiente para o Cowork retomar com 95% do contexto.
