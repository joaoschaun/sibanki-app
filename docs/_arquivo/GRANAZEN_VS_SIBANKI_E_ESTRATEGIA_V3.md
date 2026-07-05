# GranaZen vs Sibanki + Estratégia Sibanki v3.1

**Data:** 08 de Março de 2026  
**Referência:** Análise da conversa (Perplexity) + staging Sibanki (staging-13a0b.web.app)

---

## Parte 1 — O que o GranaZen oferece

### Núcleo do produto
- **Registro por WhatsApp com IA:** texto, áudio, foto e PDF (ex.: "conta de luz 220 reais todo dia 12").
- **Painel web** com gráficos e relatórios em tempo real (saldo, despesas, receitas).
- **Categorias e subcategorias automáticas com IA** + categorias personalizadas.
- **Múltiplas contas bancárias e cartões** com visão consolidada.

### Automação e lembretes
- Lembretes de contas a pagar/receber via WhatsApp e e-mail.
- Identificação de recorrências (contas mensais) e organização temporal.

### Colaboração e planos
- Perfil individual (quem está gastando); útil para casais/famílias.
- Modo compartilhado (plano Zen): vários usuários, seus WhatsApps, visão centralizada.
- **Premium:** até 3 contas bancárias.
- **Zen:** contas ilimitadas + gestão compartilhada.
- Teste grátis 3 dias, cobrança via Stripe.

### Segurança
- WhatsApp E2E, servidores seguros, backups, promessa de não usar dados financeiros para treinar modelos.
- Prova social (depoimentos, "+38 mil pessoas").

---

## Parte 2 — Sibanki: o que já temos

| Área | Status | Detalhes |
|------|--------|----------|
| **Menu / Módulos** | ✅ | Dashboard, Lançamentos, Investimentos, Metas, Orçamento, Cartões, Consultor IA, Educação, Família, Relatórios, Conquistas, Configurações |
| **Lançamentos** | ✅ | Despesa/Receita, valor, descrição, data, categoria, conta/cartão, status, forma de pagamento, tags, parcelas |
| **Transferências** | ✅ | Conta origem → destino |
| **Fixos/Recorrentes** | ✅ | Tipo, valor, categoria, frequência mensal, dia do mês |
| **Investimentos** | ✅ | Visão geral, Carteira, Análise B3, Proventos, cotações |
| **Metas** | ✅ | Reserva, Viagem, Imóvel, Carro; valor alvo, atual, prazo |
| **Orçamento** | ✅ | Limites por categoria (15+ categorias) |
| **Cartões** | ✅ | Múltiplos cartões, saldo, vencimento |
| **Dashboard** | ✅ | Saldo mensal, KPIs, importar extrato (Nubank/Inter/C6/Itaú) |
| **Auth e plano** | ✅ | Login e-mail/senha, plano Gratuito, upgrade Pro |
| **Modo Família** | ✅ | Mencionado na proposta; implementação a validar |
| **Telegram** | ✅ | Vincular Telegram (alertas/insights) |
| **Resumo semanal** | ✅ | Preferência no perfil + Cloud Function agendada (e-mail segunda 8h) |

---

## Parte 3 — O que falta (comparado ao GranaZen)

| # | Funcionalidade | GranaZen | Sibanki hoje | Prioridade |
|---|----------------|----------|--------------|------------|
| 1 | **Canal WhatsApp** | Registro de transações por texto/áudio/foto/PDF com IA | ❌ Não tem | Crítica |
| 2 | **IA para categorização automática** | Reconhece categoria, valor, data, recorrência na descrição | ❌ Categorização manual | Alta |
| 3 | **Lembretes inteligentes** | Contas a pagar/receber via WhatsApp/e-mail | ❌ Sem lembretes | Alta |
| 4 | **Bot Telegram** | Alertas e resumos nativos | ✅ Tem “Vincular Telegram”; fluxo a aprofundar | Média |
| 5 | **Modo família/multiusuário** | Vários usuários, WhatsApps, visão central | ✅ Módulo Família; alinhar com “Zen” | Média |
| 6 | **Importação OFX/automática** | OFX e bancos | ✅ Botão importar extrato; evoluir para OFX completo | Média |
| 7 | **Relatórios avançados** | PDF mensal, envio WhatsApp/e-mail | Parcial (Análise B3); sem PDF automático/envio | Média |
| 8 | **IA conversacional** | Consultor que analisa e responde sobre orçamento | ✅ Consultor IA no app; evoluir para “AIKO” | Média |
| 9 | **Reconhecimento de recorrências** | “Todo dia 12” → recorrência + lembretes | ✅ Fixos manuais; falta detecção automática | Média |
| 10 | **OCR boletos/notas** | Foto/PDF → extração de valor e vencimento | ❌ Não tem | Desejável |

---

## Parte 4 — Como adicionar ao Sibanki (arquitetura em 4 blocos)

### 1. Canal WhatsApp + ingestão
- **Meta:** WhatsApp Cloud API para receber texto, áudio, foto, PDF.
- **Backend:** fila para transcrever áudio (Speech-to-Text), OCR em imagem/PDF, normalizar para formato interno (usuário, valor, descrição, tipo, recorrência).
- **Stack sugerida:** Node/Python + WhatsApp Cloud API + serviço de transcrição + Tesseract/Google Vision.

### 2. Camada de IA e regras
- **NLP/LLM** para extrair: valor, moeda, categoria, subcategoria, periodicidade, conta.
- **Motor de regras:** criar/atualizar lançamento simples, lançamento recorrente, lembretes.
- Ajuste de prompts (ou modelo) para vocabulário financeiro BR (conta de luz, boleto, cartão, Pix, etc.).

### 3. Backend financeiro (core ledger)
- **Entidades:** Usuário, Conta, Cartão, Lançamento, Categoria, Recorrência, Lembrete.
- **Cálculos:** saldo por conta, consolidado, fluxo por período, fluxo de caixa futuro.
- **Rotinas:** cron para lembretes diários (contas a pagar/receber, próximos 7 dias, atrasos); geração de lançamentos futuros a partir de recorrências.
- **Importação:** OFX e planilha (como no GranaZen).

### 4. Front-end e relatórios
- Painel: gráficos por categoria, linha de saldo no tempo, tabela de lançamentos.
- Filtros: conta, período, pessoa (modo compartilhado).
- Exportar CSV/Excel; resumo mensal em PDF; envio por WhatsApp/e-mail.

---

## Parte 5 — Roteiro de implementação (MVP)

| Fase | Prazo | Foco |
|------|--------|------|
| **Fase 1** | 2–3 semanas | WhatsApp Cloud API, webhook texto; analisador simples (regex + NLP básico); criar lançamento no Firestore/app atual |
| **Fase 2** | 2 semanas | Áudio → transcrição; IA para categorização; regras de recorrência |
| **Fase 3** | 1–2 semanas | Cron lembretes; bot Telegram; notificações por e-mail |
| **Fase 4** | 1 semana | OCR boletos/imagens; testes e refinamento |

**Fluxo mínimo (MVP):**  
Usuário manda mensagem → Webhook WhatsApp → Backend chama IA → IA devolve JSON estruturado → Backend grava e responde confirmação amigável ("Lancei sua conta de luz de 220 todo dia 12").

---

## Parte 6 — Estratégia Sibanki v3.1 (resumo)

### Os 4 pilares
1. **AIKO v3.1 — Financial Products Advisor:** consultor pós-ativo com psicologia comportamental; análise em camadas; recomendação ética de produtos.
2. **Visão Inteligente (OCR/PDF):** boletos, notas, extratos, faturas, comprovantes PIX, tickets; alta precisão em documentos BR.
3. **WhatsApp nativo + Telegram:** registro por texto/voz/imagem; lembretes; insights; < 5 s de resposta.
4. **Produtos financeiros com vendas consultivas:** empréstimos, consórcios, investimentos, seguros, cartões, refinanciamento (comissões definidas).

### Receita (projeção do documento)
- Assinaturas + comissões: ordem de **R$ 1,47M–2,94M/ano** (conforme usuários ativos e conversão).
- Vendas éticas: regras de horário, perfil e contexto para não spammar.

### Próximos passos sugeridos
1. Priorizar **WhatsApp + IA** (maior alinhamento com o diferencial GranaZen).
2. Em seguida: lembretes, recorrências inteligentes, bot Telegram, OCR.
3. Documentar modelo de dados (tabelas/entidades) para o backend quando for implementar o canal WhatsApp.

---

## Como usar este documento

- **Para produto:** usar Partes 1–3 como checklist “Sibanki vs GranaZen” e Partes 4–5 como roadmap técnico.
- **Para estratégia:** Parte 6 como resumo da visão v3.1 (detalhes completos ficam na conversa original).
- **Para PDF:** abrir este `.md` no VS Code ou colar em Google Docs / ferramenta Markdown→PDF e exportar como PDF.

---

*Documento gerado a partir da análise da conversa (GranaZen, Sibanki staging, estratégia v3.1).*
