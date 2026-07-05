# Continuar: Resumo semanal por e-mail

Use este texto na **próxima conversa** para continuar o trabalho.

---

## O que já foi feito

1. **Checklist App Check** — Criado `docs/APP_CHECK.md` com passo a passo para ativar App Check (Console, cliente, Functions, ordem recomendada).

2. **UI da preferência “Resumo semanal”** — Em **Perfil > Minha Conta > Preferências** foi adicionado:
   - Um toggle “Resumo semanal por e-mail” (botão com id `perfilResumoSemanalBtn` e thumb `perfilResumoSemanalThumb`).
   - Texto explicando que toda segunda-feira o usuário recebe um e-mail com receitas, despesas e principais categorias da semana.

---

## O que falta implementar

### 1. JavaScript no frontend (`public/app/index.html`)

- **Variável/estado:** Usar algo como `window._resumoSemanalEmail` (ou ler direto do doc do usuário).
- **Ao carregar os dados do usuário:** Em `applyDocFromServer(doc)`, ao aplicar os dados do documento (`d`), ler `d.resumoSemanalEmail` e chamar uma função que atualiza o estado visual do toggle (ex.: `updateResumoSemanalToggle(!!d.resumoSemanalEmail)`).
- **Função `updateResumoSemanalToggle(on)`:** Atualizar o botão e o thumb:
  - `perfilResumoSemanalBtn`: `aria-pressed`, classe `.on` quando ativo.
  - `perfilResumoSemanalThumb`: `transform: translateX(20px)` e cor quando ativo (ex.: `var(--vr)`).
- **Função `toggleResumoSemanalEmail()`:** Inverter o estado, chamar `updateResumoSemanalToggle`, salvar no Firestore: `db.collection('users').doc(U.uid).set({ resumoSemanalEmail: true ou false }, { merge: true })`, e dar `toast` de confirmação ou erro.
- **CSS (opcional):** Estilo para `.perfil-toggle-btn.on` (ex.: fundo azul) para o toggle ativado.

### 2. Cloud Function agendada (`functions/index.js`)

- **Nome sugerido:** `weeklySummary` (ou `enviarResumoSemanal`).
- **Agendamento:** Segunda-feira às 8h (horário de Brasília), por exemplo:
  ```js
  functions.pubsub.schedule('0 8 * * 1').timeZone('America/Sao_Paulo').onRun(async (context) => { ... });
  ```
- **Lógica:**
  1. Buscar usuários com `resumoSemanalEmail === true`: `db.collection('users').where('resumoSemanalEmail', '==', true).get()`.
  2. Para cada documento: obter `email` (do doc ou do Auth), `entries` (e o que mais estiver no doc do usuário).
  3. Calcular os últimos 7 dias: receita total, despesa total, top categorias de despesa (ex.: top 5).
  4. Montar HTML do e-mail (assunto tipo: “Seu resumo da semana — Sibanki”).
  5. Enviar com Resend (já usado no projeto: `RESEND_API_KEY`, `RESEND_FROM`). Usar o mesmo padrão de `sendFamilyInviteEmail` / `sendVerificationEmail`.
- **Índice Firestore:** Pode ser necessário criar índice composto para `users` onde `resumoSemanalEmail == true`. Se o Firebase pedir o link ao fazer o primeiro deploy, criar o índice conforme indicado.

### 3. Config do Resend

- Garantir que `RESEND_FROM` está adequado para envio (ex.: domínio verificado no Resend).
- Se quiser um “nome” diferente para o resumo semanal, pode usar outro `from` só para essa função (ou o mesmo `RESEND_FROM`).

---

## Referências no código

- **Salvar dados do usuário:** `db.collection('users').doc(U.uid).set(data, { merge: true })` — em `_persistData()` (por volta da linha 5918). O campo `resumoSemanalEmail` pode ser salvo junto nesse `data` ou em um `set` separado com `merge: true`.
- **Estrutura do doc do usuário:** Em `applyDocFromServer` são usados `d.entries`, `d.goals`, `d.name`, `d.email`, etc. Adicionar leitura de `d.resumoSemanalEmail` e repassar para o toggle.
- **Envio de e-mail com Resend:** Ver em `functions/index.js` as funções que usam `Resend` (ex.: convite família, verificação de e-mail) para reutilizar o mesmo padrão e tratamento de erro.
- **getResendApiKey:** Já existe em `functions/index.js` (por volta da linha 152); usar na nova função agendada.

---

## Ordem sugerida na próxima sessão

1. Implementar `updateResumoSemanalToggle` e `toggleResumoSemanalEmail` e integrar em `applyDocFromServer`.
2. Adicionar a Cloud Function agendada `weeklySummary` e testar em ambiente de desenvolvimento (ou com um usuário de teste com `resumoSemanalEmail: true`).
3. Ajustar CSS do toggle se necessário e testar ativar/desativar a preferência na tela de Perfil.
