# Pendências Comerciais — anotadas em 13/06/2026 (Claude Cowork)

> Billing Asaas está 100% operacional em produção (Pix recorrente, webhook,
> plano automático). Estas decisões destravam a monetização de fato.

## 1. Feature flags Pro/Família (CRÍTICO comercial)
Hoje `useFeatureFlags` libera TUDO para todos os planos ("fase de construção").
Pagar não destrava nada → não há motivo objetivo para assinar.

Decidir o que é exclusivo:
- Sugestão de partida (alinhada ao texto já exibido no Settings):
  - **Gratuito**: lançamentos manuais ilimitados, 1 conta Open Finance, Ld/Sg/Sv,
    consultor IA com teto mensal (já existe server-side: FREE_AI_MESSAGES_PER_MONTH=40).
  - **Pro (R$ 19,90)**: consultor IA ilimitado, Open Finance multi-banco,
    relatórios PDF, lançamento por voz/foto, bot WhatsApp, Raio-X de ativos.
  - **Família (R$ 29,90)**: tudo do Pro + visão compartilhada casal/filhos
    (`familia_compartilhado`), metas conjuntas.
- Implementação: flags por plano no Firestore (admin já tem tela de Feature Flags),
  `useFeatureFlags` deixa de liberar tudo, upsell contextual nos pontos de bloqueio.

## 2. Política de inadimplência
`PAYMENT_OVERDUE` hoje só registra log. Definir:
- Carência sugerida: 7 dias após vencimento → downgrade automático para gratuito
  (webhook/rotina diária), e-mail de aviso no dia 1 e no dia 5.
- Dados não são apagados no downgrade; recursos pagos ficam read-only.

## 3. Higiene de segredos
- Regenerar ASAAS_API_KEY no painel (a atual transitou por chat) + redeploy.
- Trocar ASAAS_WEBHOOK_TOKEN junto (1 comando, Claude executa).

## 4. Primeiro pagamento real
- Teste de fogo com CPF real do João assinando Pro mensal; acompanhar logs
  do asaasWebhook e o flip de `users/{uid}.plan`.
