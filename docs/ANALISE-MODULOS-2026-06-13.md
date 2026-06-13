# Análise Módulo a Módulo — 13/06/2026 (Claude Cowork)

> Método: conta teste populada com 90 dias de vida financeira realista (60 lançamentos,
> 2 contas, 3 investimentos, 2 metas, orçamentos, recorrentes), screenshots de 16 módulos
> em produção (`screenshots/a5-*.png`), leitura de código. Três lentes por módulo:
> **Design** (padrão Pierre/landing) · **Lógica** (corretude e fontes de verdade) ·
> **Comercial** (papel no funil e na monetização).
>
> Pendências comerciais macro: `docs/PENDENCIAS-COMERCIAIS.md`.

## 🚨 Achados transversais (corrigir antes de tudo)

1. **Ld com DUAS fontes de verdade** — Painel mostra **82 dias** (só saldos de conta:
   16,2k ÷ R$197/dia) e Crescimento mostra **"Liberdade 175 dias"** (inclui carteira).
   Mesmo conceito, números diferentes em telas vizinhas = mina a confiança na métrica-mãe.
   → Unificar no `IntelligenceContext` (única função, único resultado), e decidir a regra:
   investimentos líquidos entram (recomendado: Tesouro/CDB líquidos sim; FII/ações com
   redutor de liquidez).
2. **Pills de aba ativa verdes** remanescentes (Crescimento "MINHA CARTEIRA"; conferir
   Cripto/MeuCpf) → branco Pierre, como já feito no Painel/Lançamentos.
3. **Missões SibCoin obsoletas**: "Primeiro Lançamento +50 SC" com 60 lançamentos e
   "Primeiro Investimento +150 SC" com 3 ativos. Missão por evento não reconhece estado
   pré-existente → validar missão contra o estado atual ao montar (ou marcar concluída
   server-side num sweep).
4. **Gráfico Orçamento (Gasto vs Limite) não renderiza barras** com dados presentes
   (alertas da mesma tela provam que o gasto existe) + tick "R$2k" duplicado no eixo.
   Provável mismatch de chaves categoria/da série → investigar `BudgetBarChart`.

---

## 1. Assistente (/consultor-ia) — nota 9/10
- **Design**: Chat 2.0 no padrão (saudação com Ld real, cards de sugestão, IA sem bolha,
  composer grande). Referência interna de qualidade.
- **Lógica**: contexto financeiro completo + perfil consolidado no prompt; fallback de
  provedores; captura voz/foto unificada. Sentinela 99999 tratado.
- **Comercial**: é O diferencial. Teto gratuito de 40 msgs/mês já existe server-side —
  quando flags ligarem, é o upsell nº 1. Falta CTA de upgrade contextual ao atingir teto.
- Ações: streaming de resposta na página (hoje só no drawer?), histórico persistente de
  conversas (hoje só sessão), botão copiar resposta.

## 2. Painel (/dashboard) — nota 8/10
- **Design**: hero Ld correto (inclusive estado sem-dados), KPIs com trends, sub-nav ok.
- **Lógica**: ver achado transversal nº 1 (82 vs 175). Trends de receitas/despesas ✓.
  Próximas ações contextuais boas ("Conectar banco", "Criar meta").
- **Comercial**: hero é funil de ativação (CTA conectar banco quando vazio ✓). Falta
  bloco "destrave com Pro" discreto quando flags ligarem.
- Ações: glow do hero ainda usa cor do tier sentinela quando sem dados (neutralizar);
  sub-abas (Transações/Parcelamentos/...) merecem validação com cartão de crédito real.

## 3. Lançamentos (/lancamentos) — nota 8/10 (após fixes desta sessão)
- **Design**: limpo; Foto/Voz/Importar/PDF agora neutros.
- **Lógica**: corrigido nesta análise: filtro "Hoje" vazio mostrava o empty state de
  primeira-vez mesmo com histórico (agora mensagem de período). Filtro padrão "Hoje"
  é discutível — "Este mês" daria primeira impressão melhor.
- **Comercial**: voz/foto/PDF/import são candidatos naturais a Pro.
- Ações: default "Este mês"; Sv badge inline na listagem (existe na sub-aba do Painel,
  não aqui — inconsistente); agrupamento por dia com total ✓ manter.

## 4. Contas (/contas) — nota 7.5/10
- **Design**: cards com identidade visual por banco (logos oficiais) muito bons.
- **Lógica**: saldo manual vs Open Finance ok; `incluirNaSoma` flexível.
- **Comercial**: 1 conta OF no gratuito / multi-banco no Pro (proposta em pendências).
- Ações: empty state rico ✓ já; mostrar "última atualização" por conta; CTA OF mais
  proeminente quando só há contas manuais.

## 5. Crédito (/credito/*) — nota 7/10
- **Design**: Pierre ok pós-varredura; KPIs e pressão bons. Muitas abas (6) para pouco
  conteúdo no estado atual — risco de parecer vazio.
- **Lógica**: "nu bank R$ 0,00" — conta de crédito sem fatura confunde; normalização de
  nome aplicada. Simuladores (quitação/compra/FGTS) são joias escondidas na aba Plano.
- **Comercial**: oportunidades/parceiros é canal de receita (afiliados) — hoje discreto.
- Ações: consolidar abas (Visão+Plano juntas?); trazer 1 simulador para a Visão Geral;
  badge "simule" como gancho.

## 6. Investimentos (/crescimento) — nota 8/10
- **Design**: Raio-X da Carteira é excelente (rentab vs CDI, renda passiva, FIRE).
  Pill ativa verde → corrigir; "FIRE 1.9%" azul → neutro/semântico.
- **Lógica**: "Liberdade 175 dias" diverge do Painel (transversal nº 1); banner
  "cotações não sincronizadas" honesto ✓; P&L correto com seed.
- **Comercial**: Análise B3/Watchlist/Raio-X de ativos = isca Pro perfeita.
- Ações: unificar Ld; donut de alocação usa azul/laranja — paleta própria de dados ok,
  mas alinhar com tokens si-*.

## 7. Orçamento (/orcamento) — nota 6.5/10
- **Design**: Sync de Soberania (economia→dias) é conceito killer, bem apresentado.
- **Lógica**: alertas de burn rate funcionam; **gráfico principal vazio** (transversal
  nº 4) derruba o módulo; rollover ZBB existe mas é invisível para iniciante.
- **Comercial**: neutro (recurso de retenção).
- Ações: consertar BudgetBarChart; barras por categoria com cor semântica de estouro;
  onboarding do modo Envelope.

## 8. Metas (/planejamento) — nota 7/10
- **Design**: cards de progresso simples e claros; empty rico ✓.
- **Lógica**: "quanto poupar/mês" calculado é o valor da tela — checar se usa prazo.
- **Comercial**: metas conjuntas = Família.
- Ações: data-alvo + projeção ("nesse ritmo, chega em out/2027"); ligação meta→aporte
  automático (recorrente).

## 9. Recorrentes (/recorrentes) — nota 7/10
- **Lógica**: `aplicarRecorrentesDoMes` + botão manual ✓; duração (qtd/data) ✓.
- Ações: mostrar próxima execução por item; alerta de recorrente não aplicado.

## 10. Loja (/loja) — nota 6/10
- **Design**: estrutura ok; depende de catálogo Lomadee (pendência operacional de
  ativação `/affiliate/products` no painel — segue aberta).
- **Comercial**: motor de cashback SibCoin pronto; sem catálogo denso, parece demo.
- Ações: ativar Lomadee products; banner contextual por `catTotals` (já existe) precisa
  do catálogo para brilhar.

## 11. SibCoin (/sibcoin) — nota 6.5/10
- **Lógica**: missões por evento (transversal nº 3 — não reconhecem estado).
- **Comercial**: moeda de engajamento boa; tiers claros. Conectar a descontos de plano
  (SC abate mensalidade?) seria gancho de retenção forte — decidir custo.

## 12. Social (/social) — nota 6/10
- Feed funciona; sem massa crítica de usuários é deserto. Comercial: adiar investimento
  até ter base; manter leve.

## 13. Relatórios (/relatorios) — nota 7/10
- PDF dynamic import ✓. Candidato a Pro. Ação: preview antes de gerar.

## 14. Perfil (/perfil) — nota 7.5/10
- AccountSummaryStrip ✓. Ação: completar cadastro (CPF) com barra de progresso — CPF
  agora é obrigatório para assinar (descoberto no E2E de billing).

## 15. Configurações (/configuracoes) — nota 8/10
- Pierre completo pós-fix; billing Pix funcional; Open Finance, backup, preferências.
- Ações: seção "Plano" merece destaque visual (é a página de dinheiro); link "rever
  tour" morto (tour removido) → trocar por "rever boas-vindas do Assistente".

## 16. Família (/casal) — não auditado a fundo (gating + abas novas do Antigravity)
- Validar com segunda conta; é o pilar do plano Família.

---

## Priorização sugerida (próximas sessões)

| # | Item | Lente | Esforço |
|---|------|-------|---------|
| 1 | Unificar cálculo de Ld (uma fonte) | Lógica | M |
| 2 | Consertar BudgetBarChart | Lógica | S |
| 3 | Pills verdes restantes + FIRE azul | Design | S |
| 4 | Missões SibCoin reconhecerem estado | Lógica | M |
| 5 | Default "Este mês" + Sv inline em Lançamentos | Design/Lógica | S |
| 6 | Feature flags Pro/Família (pendências comerciais) | Comercial | M |
| 7 | Metas com prazo+projeção | Lógica | M |
| 8 | Crédito: consolidar abas + simulador na visão geral | Design | M |
