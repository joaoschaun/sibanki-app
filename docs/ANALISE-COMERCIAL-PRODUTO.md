# Sibanki — Análise Comercial de Produto
> Versão 1.0 — Abril 2026

---

## 1. O mercado real em números

### Brasil

O Brasil concentra **58,7% de todas as fintechs da América Latina** e tem hoje mais de 1.700 startups financeiras ativas. O mercado fintech brasileiro movimentou **USD 4,7 bilhões em 2024** e a projeção é USD 17,5 bilhões até 2033 — crescimento composto de 15,7% ao ano.

As fintechs de crédito digital somaram **67,5 milhões de clientes pessoa física** só em 2024, crescimento de 26% em um ano. Nos primeiros meses de 2025, o Brasil abocanhou **40% dos dez maiores aportes em fintech da América Latina**.

Conclusão: o contexto brasileiro é excepcionalmente favorável. O usuário brasileiro já está acostumado a usar fintech (Nubank, PicPay, Mercado Pago). O salto para um app de gestão financeira pessoal é curto.

### Global — apps de finanças pessoais

- Mercado global de personal finance apps: crescimento projetado para **USD 1,5 trilhão até 2034**
- Sessão média de uso: **6,2 minutos**, **4,5 logins por semana**
- DAU/MAU médio em fintech: **22%** (acima de e-commerce, abaixo de social)
- Apps com recomendações de IA: retenção **40% maior** que apps sem
- Assinaturas já representam **50% da receita global de apps** em 2025

---

## 2. O problema central: a maioria dos apps não faz o usuário mudar de comportamento

O Mint tinha 30 milhões de usuários. Fechou. Por quê?

Porque rastrear o passado não prende ninguém. O Mint mostrava onde o dinheiro *foi*. Não mudava o que o usuário *faria* em seguida.

Isso é o principal achado de todo o mercado de personal finance: **o usuário paga (e fica) quando sente que o app muda seu comportamento financeiro — não quando ele apenas mostra números.**

O YNAB cobra USD 99/ano (antes cobrava USD 84). Tem estimativa de receita anual de **USD 49 milhões**, uma comunidade de 75 mil pessoas no Reddit, dois podcasts, dois livros. Por que alguém paga USD 99 por um app de orçamento quando existem dezenas gratuitos?

A resposta documentada: **novos usuários do YNAB economizam em média USD 600 no primeiro mês e mais de USD 6.000 no primeiro ano.** O app se paga sozinho com sobra. Quando o valor é desse tamanho, o preço deixa de ser uma objeção.

---

## 3. O que faz o usuário ficar (retenção)

### O "aha moment" — a virada que separa usuários que ficam dos que somem

Pesquisas de ativação mostram que existe um momento específico em que o usuário passa de "estou testando" para "eu preciso desse app". Esse momento precisa acontecer **durante o onboarding ou na primeira semana**, caso contrário o usuário vai embora.

Em apps de finanças pessoais, o aha moment normalmente é um destes:

| Momento | O que o usuário sente |
|---|---|
| Ver pela primeira vez quanto gasta por categoria | "Eu não sabia que gastava tanto nisso" |
| Ver o saldo projetado daqui a X dias | "Finalmente entendo onde vou estar" |
| Receber um alerta que evitou estouro de orçamento | "O app me salvou" |
| Ver a primeira meta progredindo | "Estou chegando lá" |
| Receber insight personalizado que faz sentido | "Esse app me entende" |

**Quanto mais rápido o usuário chega num desses momentos, maior a retenção.**

### Benchmarks de retenção

| Período | Retenção média (apps) | Referência boa |
|---|---|---|
| Dia 1 | 30% | 40%+ |
| Dia 7 | 15% | 25%+ |
| Dia 30 | 7–10% | 15%+ |

Churn mensal médio em apps de assinatura: **5,3%** (top performers ficam abaixo de 3%).

### O que destrói retenção (principais causas de abandono documentadas)

1. **Onboarding longo demais** — usuário sai antes de sentir valor
2. **Os números param de bater** — qualquer inconsistência nos dados e o usuário perde confiança
3. **Sem novidade** — app que não surpreende vira rotina e é desinstalado
4. **Complexidade sem recompensa** — o usuário percebe que dá trabalho mas não vê o que ganha
5. **Notificações irrelevantes** — notificação que não tem sentido no contexto do usuário é sinal para desativar

---

## 4. O que faz o usuário pagar (conversão freemium → pago)

### Os números

- Conversão freemium → pago (média geral): **4,2%**
- Conversão em trial sem cartão: **14%**
- Conversão em trial com cartão: **43%**
- Conversão de tráfego pago para freemium: **15,9%**

O modelo com trial de 34 dias (padrão do YNAB) converte muito melhor que paywall imediato, porque o usuário já formou hábito antes de precisar pagar.

### O que a pesquisa mostra sobre disposição para pagar

Há três gatilhos principais que fazem um usuário de app financeiro decidir pagar:

**Gatilho 1 — ROI óbvio**
O usuário consegue calcular (ou sentir) que o app já valeu mais do que o preço. "O app me fez economizar R$ 300 esse mês. A assinatura é R$ 30. Fácil."

**Gatilho 2 — Confiança e privacidade**
Apps gratuitos que vendem dados ou empurram produtos financeiros geram desconfiança. O usuário que entende isso prefere pagar para ter um produto que joga do lado dele. Citação literal de usuários do YNAB: *"prefiro pagar porque aí sei que o app não precisa me vender nada."*

**Gatilho 3 — Identidade e pertencimento**
O usuário do YNAB não usa "um app de orçamento" — ele segue uma filosofia. Tem comunidade, vocabulário próprio, conteúdo. Quando o app vira parte da identidade financeira do usuário, a assinatura deixa de ser custo e vira investimento em quem ele quer ser.

---

## 5. Onde o Sibanki está — análise honesta

### O que está muito certo

**O conceito central é diferenciado de verdade.**
Ld (Dias de Liberdade), Sg (Spread Gap) e Sv (Sovereignty Score) não existem em nenhum app brasileiro. A ideia de mostrar *quantos dias você consegue viver sem renda* é visceral — qualquer pessoa entende imediatamente o que isso significa para ela. Esse é o tipo de métrica que produz o aha moment.

**O Consultor IA com contexto financeiro real é raro.**
A maioria dos chatbots financeiros responde perguntas genéricas. O Sibanki manda o contexto financeiro completo do usuário (saldo, categorias, metas, cartões, Ld, Sg) para o modelo. Isso é concretamente diferente.

**A stack técnica suporta crescimento.**
Firebase + React + Cloud Functions é uma arquitetura que muitos apps de VC usam. O sistema de multi-tenant já está montado. Open Finance (Pluggy) já conectado. O produto está mais maduro tecnicamente do que a maioria de apps na mesma fase.

**Design monochromático e premium.**
Pierre Finance com fundo #0a0a0a em vez de as cores de banco de varejo tradicionais (azul/verde/vermelho) posiciona o Sibanki visualmente no mesmo quadrante de apps como Copilot, Monarch Money — percebidos como mais sérios e inteligentes.

### O que ainda é frágil (visão comercial)

**O aha moment está enterrado.**
O usuário entra no app e cai no Consultor IA. O Ld só aparece depois de configurar conta, lançamentos, investimentos. A maioria dos usuários vai embora antes de ver o número que tornaria o app indispensável. **O aha moment do Sibanki (ver o Ld pela primeira vez) acontece tarde demais.**

**O onboarding coleta dados mas não entrega valor imediato.**
O wizard de 6 passos é necessário para funcionar, mas o usuário não vê nada impressionante enquanto preenche. O Mint, o Copilot e o Monarch Money todos mostram um dashboard funcional dentro de 60 segundos usando dados bancários reais. O Sibanki depende do usuário inserir dados manualmente.

**Não existe loop de hábito claro.**
Para o usuário voltar todo dia (ou toda semana), precisa ter um motivo concreto. O YNAB tem "dar um destino para cada real antes de gastar". O Copilot tem o feed de transações personalizadas. Qual é o loop do Sibanki? Hoje não está definido de forma que o usuário sinta.

**Os planos não estão diferenciados.**
A decisão de liberar tudo para todos ("fase de construção") faz sentido enquanto itera, mas significa que quando chegar a hora de cobrar, não há razão clara para fazer upgrade. O usuário precisa sentir a diferença antes do paywall aparecer.

**SibCoin precisa de um propósito mais forte.**
O sistema de rewards existe e está tecnicamente completo, mas moedas virtuais só prendem quando têm utilidade real percebida. Hoje a loja ainda está em modo demonstração. Sem uma recompensa tangível, o SibCoin vira ruído.

---

## 6. O que os melhores fazem que ainda não fazemos

### Copilot Money (USD 13/mês, 4,8 estrelas App Store)
- Categorização automática com ML que aprende com correções do usuário
- Revisão semanal gamificada — o app "resume" a semana e pede confirmação de categorias
- Design que parece mais Apple do que banco — usuário orgulhoso de mostrar para amigos

### Monarch Money (USD 14,99/mês, crescimento 300% pós-fechamento do Mint)
- Herdou 4 milhões de usuários do Mint em 6 meses
- Forte em casais e famílias — conta compartilhada com permissões
- Relatórios de patrimônio líquido que evoluem no tempo — o usuário acompanha uma trajetória, não um snapshot

### YNAB (USD 99/ano)
- Filosofia de 4 regras que o usuário aprende e evangeliza
- Comunidade massiva que gera retenção por pertencimento
- Trial de 34 dias sem cartão — o usuário forma hábito antes de pagar

### O que todos compartilham:
1. **Velocidade até o valor** — o usuário vê algo relevante em menos de 2 minutos
2. **Narrativa de progresso** — o app conta a história de como o usuário está melhorando
3. **Automação que elimina trabalho** — quanto menos o usuário precisa fazer manualmente, mais tempo ele fica
4. **Loop semanal** — há um motivo específico para abrir o app toda semana

---

## 7. As alavancas concretas para crescimento e retenção

### Alavanca 1 — Antecipação do aha moment (maior impacto, mais urgente)

**Problema:** O Ld só aparece depois de muita configuração.
**Solução:** Mostrar uma estimativa do Ld *durante o onboarding*, mesmo com dados parciais. "Com base no que você informou, seus Dias de Liberdade são **12**. Vamos melhorar isso."

Isso cria urgência e significado antes mesmo do usuário terminar o cadastro. O número que parecia abstrato antes do app agora é pessoal.

### Alavanca 2 — Loop semanal explícito

**Problema:** Não existe razão definida para o usuário abrir o app toda semana.
**Solução:** Um "Relatório de Soberania" semanal — push notification toda segunda-feira com:
- Como o Ld mudou na semana
- Uma categoria que surpreendeu (positiva ou negativamente)
- Uma ação concreta que aumentaria o Ld em X dias

Isso é o Sentinela Semanal que já existe, mas precisa ser posicionado como o principal motivo de retorno.

### Alavanca 3 — Primeira sessão impressionante com Open Finance

**Problema:** Usuário sem dados = dashboard vazio = sem aha moment.
**Solução:** Fazer o Open Finance ser o passo zero, não o passo 4. Conectar o banco antes de qualquer configuração manual. Com a conexão Pluggy, o usuário vê Ld, categorias e fluxo de caixa em menos de 60 segundos.

Dados de mercado: apps que conectam dados bancários automaticamente têm retenção D30 **2-3x maior** que apps que dependem de entrada manual.

### Alavanca 4 — Monetização baseada em ROI explícito

**Problema:** Não há proposta de valor financeira clara para o plano pago.
**Solução:** O copy de conversão precisa ser: *"Usuários pro do Sibanki aumentam o Ld em média X dias no primeiro mês."* ou *"Plano pro = R$ X/mês. Nossos usuários economizam em média R$ Y/mês."*

O YNAB só consegue cobrar USD 99 porque tem essa prova. Precisamos construir essa prova com dados reais dos usuários.

### Alavanca 5 — Diferenciação de planos que o usuário *sente*

Sugestão de estrutura freemium que faz sentido:

| Feature | Gratuito | Pro |
|---|---|---|
| Lançamentos manuais | ✓ | ✓ |
| Ld e Sg básicos | ✓ | ✓ |
| Consultor IA | 5 msgs/mês | Ilimitado |
| Open Finance (Pluggy) | — | ✓ |
| Sentinela Semanal | — | ✓ |
| Relatório em PDF | — | ✓ |
| Metas com projeção | 1 meta | Ilimitado |
| SibCoin multiplicador | 1x | 2x |

O free precisa ser útil o suficiente para o usuário não ir embora, mas limitado o suficiente para a decisão de pagar ser óbvia depois de 2-3 semanas.

### Alavanca 6 — Comunidade como retenção

O YNAB tem 75 mil pessoas no Reddit evangelizando o produto. Isso gera: aquisição gratuita, suporte peer-to-peer, e retenção por identidade.

O Sibanki já tem o módulo Social (feed comunitário). A questão é criar um gatilho para o usuário compartilhar sua evolução: *"Meu Ld subiu de 12 para 34 dias em 3 meses"* — isso é compartilhável, é orgulhoso, é marketing gratuito.

---

## 8. Prioridade de execução (o que atacar primeiro)

Baseado no impacto esperado em retenção e na viabilidade técnica:

| Prioridade | Ação | Impacto | Esforço |
|---|---|---|---|
| 🔴 1 | Open Finance no passo 0 do onboarding | Retenção D7 +40% estimado | Médio |
| 🔴 2 | Mostrar Ld estimado durante onboarding | Conversão ativação +30% | Baixo |
| 🔴 3 | Sentinela Semanal como produto, não feature | Retenção D30 +25% | Médio |
| 🟡 4 | Diferenciação real de planos (paywall) | Receita direta | Alto |
| 🟡 5 | Copy de conversão baseado em ROI real | Conversão pago +20% | Baixo |
| 🟡 6 | Compartilhamento de milestones (Ld, metas) | Aquisição viral | Médio |
| 🟢 7 | Loja com checkout nativo | Nova linha de receita | Alto |
| 🟢 8 | SibCoin com utilidade real | Retenção por engajamento | Alto |

---

## 9. O posicionamento que vai funcionar no Brasil

O Brasil tem um contexto específico que poucos apps de finanças pessoais exploram:

- **Taxa de juros real entre as mais altas do mundo** — o spread entre investimentos e dívidas (Sg) é uma realidade visceral para o brasileiro médio
- **Informalidade financeira alta** — muitos brasileiros não têm noção de quanto gastam porque usam Pix, dinheiro e cartão misturados
- **Relação emocional com dinheiro** — no Brasil, dinheiro é tabu. Um app que fala sobre isso sem julgamento, com clareza, captura um espaço que nenhum banco ocupa

O posicionamento que fecha com tudo isso:

> **"Sibanki: quantos dias você consegue viver sem trabalhar?"**

Essa pergunta é desconfortável. É verdadeira. E só o Sibanki responde.

Não é um app de orçamento. Não é um app de investimentos. É um sistema operacional financeiro que mostra a realidade e te ajuda a mudar ela.

---

*Documento gerado em Abril/2026 com base em dados de mercado e análise do produto atual.*
