# Consultor IA – Feedback e Fallback

## 1. Feedback do usuário (Lucide + Firestore)

- **Onde:** No modal do Consultor Financeiro (FAB), cada resposta da IA exibe os botões **“Foi útil?”** com ícones Lucide **thumbs-up** e **thumbs-down**.
- **Persistência:** Ao clicar, o app grava em Firestore em `users/{uid}/aiFeedback/{docId}`:
  - `userMessage`: pergunta do usuário
  - `contextStr`: resumo do contexto enviado (até 2000 caracteres)
  - `aiReply`: resposta bruta da IA (até 8000 caracteres)
  - `feedback`: 1 (útil) ou -1 (não útil)
  - `createdAt`: timestamp
- **Uso futuro:** Esses documentos podem ser exportados (ex.: JSONL) para fine-tuning de um modelo próprio; priorizar registros com `feedback === 1`.
- **Identidade visual:** Ícones Lucide (message-circle, user, alert-triangle, thumbs-up, thumbs-down) em todo o fluxo do consultor, sem emojis.

## 2. Fallback LLM – DeepSeek

- **Arquivo:** `functions/services/llm/llmService.js`
- **Ordem de chamada (task "fast"):** Gemini → Groq → **DeepSeek** → OpenAI → Claude.
- **Variável de ambiente:** `DEEPSEEK_KEY` (opcional). Se não estiver definida, o DeepSeek é ignorado e o fallback segue para os demais.
- **Configuração:** No Firebase (Cloud Functions), defina `DEEPSEEK_KEY` com a chave da API DeepSeek (https://platform.deepseek.com). Modelo usado: `deepseek-chat`.

## 3. Mini badge de score na home

- **Onde:** Dashboard, ao lado do “Bom dia, [Nome]”.
- **Comportamento:** Exibe o score de saúde financeira (0–100) com ícone Lucide:
  - **trending-up** (verde) se score ≥ 70  
  - **minus** (amarelo) se 40 ≤ score < 70  
  - **alert-triangle** (vermelho) se score < 40  
- **Acessibilidade:** `aria-label` e `title` com o valor do score.
- O widget “Saúde financeira” (healthGauge) na página Perfil também usa Lucide: **trophy** (excelente), **thumbs-up** (atenção), **alert-triangle** (crítico).

## 4. Configuração em produção (DEEPSEEK_KEY) – tarefa para segunda-feira

- A configuração da variável **DEEPSEEK_KEY** nas Cloud Functions em **produção** (Firebase Console ou Google Cloud) está documentada na regra **`.cursor/rules/segunda.mdc`**.
- Na segunda-feira (ou quando o usuário pedir "configuração da segunda"), o assistente deve seguir essa regra para definir a variável de ambiente no Console e ativar o fallback DeepSeek em produção.
