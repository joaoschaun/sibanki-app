/**
 * educationContent.ts — Conteúdo completo do módulo de Educação Financeira
 *
 * 5 trilhas · 22 lições · 3 questões por lição = 66 quiz questions
 *
 * Estrutura:
 *   Trail → Lesson → (intro + points + example + quiz)
 *
 * Filosofia de conteúdo:
 *   - Prático e aplicável imediatamente
 *   - Integrado à linguagem do Sibanki (Ld, Sg, Sv)
 *   - Exemplos com valores realistas do mercado brasileiro
 *   - Sem paternalismo — o usuário é tratado como adulto capaz
 */

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number; // index
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  xp: number;
  icon: string;
  intro: string;
  /** Blocos de conteúdo — cada string é um parágrafo/bullet renderizado separadamente */
  points: string[];
  example: string;
  quiz: QuizQuestion[];
  tags: string[];
}

export interface Trail {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  textColor: string;
  totalXp: number;
  level: 'iniciante' | 'intermediário' | 'avançado';
  lessons: Lesson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRILHA 1 — Fundamentos da Soberania
// ─────────────────────────────────────────────────────────────────────────────

const trail1: Trail = {
  id: 't1',
  title: 'Fundamentos da Soberania',
  description: 'Orçamento, reserva, metas e o mapa para sua independência financeira.',
  icon: '🏛️',
  color: 'bg-emerald-500/10',
  textColor: 'text-emerald-400',
  level: 'iniciante',
  totalXp: 250,
  lessons: [
    {
      id: 't1l1',
      title: 'A lógica do orçamento consciente',
      duration: '5 min',
      xp: 40,
      icon: '📊',
      intro: 'Orçamento não é restrição — é clareza. Quem sabe para onde vai o dinheiro, decide com soberania. Quem não sabe, segue ilusões.',
      points: [
        '**Visibilidade antes de controle.** Antes de cortar gastos, você precisa saber exatamente o que entra e o que sai. Sem diagnóstico, qualquer ação é tiro no escuro.',
        '**Despesas fixas vs. variáveis.** Fixas (aluguel, financiamento) são previsíveis mas difíceis de cortar no curto prazo. Variáveis (lazer, alimentação fora) têm mais flexibilidade e são onde a maioria das otimizações acontecem.',
        '**Orçamento é uma hipótese.** Você cria um plano, a realidade testa. Ao revisar mensalmente, você descobre padrões que não enxergaria de outra forma — o restaurante que "não é nada" que acumula R$ 400/mês, o streaming que ninguém assiste.',
        '**O efeito do registro.** Pesquisas mostram que só o ato de registrar gastos reduz o consumo impulsivo. Ao nomear um gasto, você o avalia antes de fazê-lo.',
        '**Meta mínima de conscientização.** Você não precisa categorizar cada centavo. Precisa saber, ao final do mês: quanto entrou, quanto saiu, o que sobrou (ou faltou).',
      ],
      example: 'João recebia R$ 6.000/mês e nunca sobrava nada. Ao registrar gastos por 30 dias, descobriu que gastava R$ 900/mês em delivery — R$ 10.800/ano. Ao reduzir para R$ 300, liberou R$ 600/mês para investir. Em 5 anos com juros compostos: mais de R$ 50.000.',
      quiz: [
        {
          q: 'Qual é a primeira etapa de um orçamento eficaz?',
          options: ['Cortar todos os gastos supérfluos imediatamente', 'Entender para onde vai o dinheiro antes de qualquer corte', 'Definir quanto quer investir por mês', 'Pagar todas as dívidas antes de começar'],
          correct: 1,
          explanation: 'Sem diagnóstico preciso, qualquer ação de corte é arbitrária. O primeiro passo é visibilidade — saber o que entra e o que sai com exatidão.',
        },
        {
          q: 'Por que as despesas variáveis têm mais potencial de otimização que as fixas?',
          options: ['Porque são sempre mais altas', 'Porque podem ser ajustadas a qualquer momento sem contratos ou multas', 'Porque o banco não cobra juros sobre elas', 'Porque não impactam o Sovereignty Score'],
          correct: 1,
          explanation: 'Despesas fixas como aluguel e financiamento geralmente envolvem contratos. Variáveis como lazer, alimentação e assinaturas podem ser ajustadas imediatamente.',
        },
        {
          q: 'O que pesquisas indicam sobre o simples ato de registrar gastos?',
          options: ['Aumenta o consumo porque cria consciência de quanto a pessoa tem', 'Não tem efeito mensurável', 'Tende a reduzir gastos impulsivos ao criar consciência no momento da compra', 'Só funciona se combinado com planilha específica'],
          correct: 2,
          explanation: 'O ato de nomear e registrar um gasto ativa o córtex pré-frontal (decisão racional). Isso reduz compras impulsivas antes mesmo de qualquer meta definida.',
        },
      ],
      tags: ['orçamento', 'gastos', 'controle financeiro'],
    },
    {
      id: 't1l2',
      title: 'Reserva de emergência: quanto, onde e como',
      duration: '6 min',
      xp: 50,
      icon: '🛡️',
      intro: 'A reserva de emergência é o alicerce de qualquer vida financeira saudável. Sem ela, qualquer imprevisto vira dívida — e dívida cara.',
      points: [
        '**Quanto guardar?** O padrão recomendado é 3 a 6 meses do seu custo de vida mensal. Autônomos, freelancers e quem tem renda variável devem mirar em 6 a 12 meses. Funcionários CLT com emprego estável podem começar com 3.',
        '**O Ld no Sibanki mede exatamente isso.** Seus Dias de Liberdade (Ld) representam quantos dias você consegue sustentar seu padrão de vida com o patrimônio atual sem nova renda. Um Ld abaixo de 30 é zona de vulnerabilidade crítica.',
        '**Onde guardar?** Liquidez e segurança são os critérios — não rentabilidade máxima. Opções: Tesouro Selic (rendimento próximo de 100% CDI, liquidez D+1), CDB com liquidez diária de banco sólido, conta remunerada de fintechs reguladas pelo BC.',
        '**O que NÃO usar como reserva:** imóveis (não têm liquidez), ações/FIIs (valor oscila na hora que você mais precisa), poupança (rendimento abaixo da inflação em períodos de Selic alta).',
        '**Como construir se ainda não tem?** Defina um valor mensal específico e automatize a transferência no dia do pagamento. Quanto antes, melhor — mas "perfeito mais tarde" é pior que "bom agora".',
      ],
      example: 'Com gastos de R$ 3.000/mês, a reserva ideal de 6 meses é R$ 18.000. No Tesouro Selic a 10,5% a.a., essa reserva renderia cerca de R$ 157/mês — suficiente para cobrir boa parte de uma conta de luz ou plano de saúde.',
      quiz: [
        {
          q: 'Para um autônomo com renda variável, qual é o tamanho de reserva mais recomendado?',
          options: ['1 a 2 meses de gastos', '3 meses de gastos', '6 a 12 meses de gastos', '2 anos de gastos'],
          correct: 2,
          explanation: 'Autônomos têm renda imprevisível. Uma reserva maior protege contra períodos de baixa demanda, enfermidade ou transições de carreira.',
        },
        {
          q: 'Por que ações e FIIs NÃO são adequados como reserva de emergência?',
          options: ['Porque rendem menos que a poupança', 'Porque seu valor oscila — justamente quando você mais precisa do dinheiro, o mercado pode estar em queda', 'Porque é difícil comprar e vender', 'Porque têm imposto de renda'],
          correct: 1,
          explanation: 'Crises econômicas (quando emergências são mais prováveis) costumam coincidir com quedas de mercado. Vender ações na baixa significa transformar volatilidade em perda permanente.',
        },
        {
          q: 'O indicador Ld (Dias de Liberdade) do Sibanki representa o quê?',
          options: ['O número de dias desde o último aporte', 'Quantos dias você consegue viver com seu patrimônio atual sem nova renda', 'O prazo de vencimento dos seus investimentos', 'Quantos dias você tem de férias acumuladas'],
          correct: 1,
          explanation: 'Ld = Patrimônio Líquido / Burn Rate Diário. Abaixo de 30 dias é zona crítica. Acima de 365, você tem soberania financeira real.',
        },
      ],
      tags: ['reserva de emergência', 'Ld', 'liquidez', 'segurança'],
    },
    {
      id: 't1l3',
      title: 'A regra 50-30-20 na vida real',
      duration: '5 min',
      xp: 40,
      icon: '⚖️',
      intro: 'A regra 50-30-20 é um ponto de partida, não uma lei. Entender por que ela funciona é mais valioso do que segui-la cegamente.',
      points: [
        '**50% para necessidades.** Moradia, alimentação básica, transporte essencial, plano de saúde, educação dos filhos. A pergunta de teste: "Se eu não pagar isso, tenho consequência séria?" Se sim, é necessidade.',
        '**30% para desejos.** Lazer, restaurantes, viagens, streaming, moda, hobbies. São gastos que trazem qualidade de vida mas não são críticos. Aqui mora a maior margem de ajuste.',
        '**20% para construir patrimônio.** Investimentos, pagamento de dívidas além do mínimo, reserva de emergência. Esse bloco é o que separa quem cresce financeiramente de quem não cresce.',
        '**Limitação importante.** A regra assume renda suficiente para cobriros 50% de necessidades com folga. Quem ganha menos pode ter 70-80% só em necessidades — e está tudo bem. O princípio é: sempre tenha um percentual destinado a crescer.',
        '**Adaptações válidas.** Quem tem dívida cara pode usar 30% para quitá-la aceleradamente. Quem tem meta de viagem pode reduzir desejos temporariamente para 20% e investir 30%. A flexibilidade é o ponto.',
      ],
      example: 'Renda de R$ 5.000/mês: R$ 2.500 em necessidades, R$ 1.500 em desejos, R$ 1.000 investidos. Em 20 anos com rendimento de 10% a.a. os R$ 1.000/mês viram mais de R$ 750.000. Reduzindo desejos para R$ 1.000 e investindo R$ 1.500/mês: mais de R$ 1.150.000.',
      quiz: [
        {
          q: 'Qual critério define se um gasto é "necessidade" na regra 50-30-20?',
          options: ['Qualquer gasto recorrente', 'Gasto que traz felicidade imediata', 'Gasto cujo não-pagamento gera consequência grave (desabastecimento, multa, saúde)', 'Gasto acima de R$ 500/mês'],
          correct: 2,
          explanation: 'A distinção entre necessidade e desejo não é sobre o valor, mas sobre a consequência da ausência. Netflix é desejo (dá pra cancelar). Aluguel é necessidade (não dá).',
        },
        {
          q: 'Para quem tem dívida com juros altos, como adaptar a regra?',
          options: ['Manter os 20% para investimento e ignorar a dívida', 'Redirecionar parte do bloco de desejos e/ou investimentos para acelerar a quitação da dívida cara', 'Só pagar o mínimo da dívida e investir o restante', 'Esperar até quitar tudo para começar a investir'],
          correct: 1,
          explanation: 'Uma dívida a 5% a.m. "rende" -5% ao mês. Nenhum investimento de baixo risco bate isso. Quitá-la é o melhor "investimento" possível nesse momento.',
        },
        {
          q: 'O que diferencia quem cresce financeiramente de quem não cresce, segundo essa lógica?',
          options: ['O tamanho da renda', 'A consistência em direcionar um percentual para construção de patrimônio todo mês', 'A escolha de investimentos mais rentáveis', 'Ter um planejador financeiro profissional'],
          correct: 1,
          explanation: 'Consistência supera rentabilidade. Quem investe R$ 500/mês por 30 anos acumula mais do que quem investe R$ 5.000/mês por 5 anos — mesmo com a mesma taxa.',
        },
      ],
      tags: ['orçamento', '50-30-20', 'alocação'],
    },
    {
      id: 't1l4',
      title: 'Metas financeiras que você cumpre',
      duration: '6 min',
      xp: 50,
      icon: '🎯',
      intro: 'A maioria das metas financeiras falha não por falta de disciplina, mas por ser mal formulada. Uma meta vaga é um desejo. Uma meta específica é um plano.',
      points: [
        '**O framework SMART aplicado a finanças.** Específica (R$ 15.000, não "uma grana"), Mensurável (acompanhamento semanal/mensal), Atingível (compatível com sua renda), Relevante (conectada a um motivo real), Temporal (prazo definido).',
        '**Objetivos de curto, médio e longo prazo.** Curto: até 12 meses (viagem, eletrônico, fundo de emergência). Médio: 1-5 anos (troca de carro, entrada de imóvel). Longo: acima de 5 anos (aposentadoria, independência financeira).',
        '**O poder da automação.** Defina o valor mensal necessário (meta ÷ prazo em meses) e automatize a transferência no dia do salário — antes de gastar qualquer coisa. Se o dinheiro "nunca chegou" à conta corrente, você não o gasta.',
        '**Contas separadas por meta.** Misturar a reserva de emergência com a poupança para viagem sabota ambas. Use contas ou "caixinhas" diferentes por objetivo. Você mantém clareza e evita usar o dinheiro "errado".',
        '**Revisão trimestral.** Renda muda, prioridades mudam, contexto muda. Uma meta revisada e ajustada ainda é uma meta. Uma meta abandonada não é nada.',
      ],
      example: 'Meta: entrada de R$ 60.000 em 36 meses. Valor mensal necessário: R$ 1.667. Investindo em Tesouro IPCA+ ou CDB a 110% CDI, o valor necessário cai para cerca de R$ 1.520/mês (os juros fazem parte do trabalho). Automatizando no dia 5, junto com o pagamento de contas fixas.',
      quiz: [
        {
          q: 'Qual das opções abaixo é uma meta financeira bem formulada (SMART)?',
          options: ['Quero economizar mais dinheiro', 'Vou tentar gastar menos em lazer', 'Vou guardar R$ 800/mês por 18 meses para um fundo de emergência de R$ 14.400', 'Quero comprar uma casa nos próximos anos'],
          correct: 2,
          explanation: 'A terceira opção tem valor específico (R$ 800/mês), prazo definido (18 meses), resultado mensurável (R$ 14.400) e finalidade clara (fundo de emergência).',
        },
        {
          q: 'Por que é recomendado usar contas separadas por meta?',
          options: ['Para facilitar a declaração de IR', 'Para evitar confusão entre dinheiros com propósitos diferentes e impedir uso inadvertido', 'Porque rende mais em contas separadas', 'Porque é obrigatório pelo Banco Central'],
          correct: 1,
          explanation: 'Misturar recursos com destinos diferentes cria ambiguidade. Você não sabe o que pode gastar. Contas separadas criam clareza e fricção positiva antes de desviar recursos.',
        },
        {
          q: 'Qual a principal vantagem de automatizar transferências para metas no dia do salário?',
          options: ['Gera mais rendimento bancário', 'Remove a decisão diária de "poupar ou gastar" — o dinheiro é separado antes de qualquer gasto impulsivo', 'Facilita o controle fiscal', 'Libera o limite do cartão'],
          correct: 1,
          explanation: 'Willpower é um recurso limitado. Automatizar a separação do dinheiro elimina a necessidade de decidir toda semana. Você não resiste ao gasto — ele simplesmente não está disponível.',
        },
      ],
      tags: ['metas', 'SMART', 'planejamento'],
    },
    {
      id: 't1l5',
      title: 'O custo invisível das assinaturas e gastos fixos menores',
      duration: '4 min',
      xp: 40,
      icon: '🔍',
      intro: 'Gastos pequenos e recorrentes são os mais difíceis de perceber e os mais fáceis de eliminar. R$ 50/mês parece pouco — mas são R$ 600/ano e R$ 30.000 em 50 anos com reinvestimento.',
      points: [
        '**O efeito da normalização.** Assinaturas criadas meses atrás já não aparecem mais no seu radar mental. Você paga automaticamente por algo que talvez não use mais — ou que poderia substituir por alternativa mais barata.',
        '**A matemática do longo prazo.** R$ 50/mês investidos a 10% a.a. por 20 anos viram R$ 38.000. Três assinaturas de R$ 50 que você cancela = R$ 114.000 em 20 anos. Isso é o custo real de "só R$ 50".',
        '**Onde geralmente aparecem.** Streaming (2-5 serviços que você esqueceu), planos de celular acima do necessário, academias que não frequenta, seguros com coberturas redundantes, software "gratuito por 30 dias" que continua cobrando, planos família que só você usa.',
        '**Auditoria semestral de assinaturas.** Acesse o extrato do cartão e banco. Liste tudo que é recorrente. Para cada item, pergunte: "Se eu fosse contratar hoje, contrataria?" Se a resposta for "talvez" ou "não", cancele ou renegocie.',
        '**Renegociação como alternativa.** Antes de cancelar, ligue e peça desconto. Serviços como celular, internet, TV e seguros frequentemente têm margens para redução de até 30% para clientes que pedem.',
      ],
      example: 'Auditoria de 30 min identificou: 2 streamings não usados (R$ 72/mês), academia sem frequência (R$ 89/mês), plano de celular com 15GB não consumidos (redução de R$ 45/mês). Total: R$ 206/mês. Investindo esse valor por 15 anos a 10% a.a.: R$ 85.000.',
      quiz: [
        {
          q: 'Por que gastos pequenos e recorrentes são especialmente perigosos para o patrimônio?',
          options: ['Porque geram juros bancários', 'Porque são grandes demais individualmente', 'Porque somam valores significativos no longo prazo e não aparecem no radar pela normalização', 'Porque reduzem o limite do cartão de crédito'],
          correct: 2,
          explanation: 'O problema não é o valor individual mas a combinação de muitos pequenos gastos normalizados + o efeito do tempo. R$ 300/mês em assinaturas que você não usa = R$ 3.600/ano = ~R$ 240.000 em 30 anos com rendimento composto.',
        },
        {
          q: 'Qual a pergunta certa para avaliar cada assinatura na sua lista?',
          options: ['Esse serviço é popular?', 'Esse serviço custa menos que R$ 50/mês?', 'Se eu fosse contratar esse serviço hoje do zero, eu contrataria?', 'Quantas pessoas usam esse serviço?'],
          correct: 2,
          explanation: 'Essa pergunta elimina o viés de sunk cost ("já paguei faz tempo"). Você avalia o valor presente da assinatura, não a inércia histórica.',
        },
        {
          q: 'Antes de cancelar uma assinatura de serviço (celular, internet), o que é recomendado tentar?',
          options: ['Usar mais o serviço para justificar o custo', 'Ligar e solicitar renegociação — empresas frequentemente oferecem descontos para não perder o cliente', 'Contratar um plano ainda mais caro', 'Esperar o contrato vencer'],
          correct: 1,
          explanation: 'Custo de retenção é menor que custo de aquisição. A maioria das empresas tem margens para redução de 20-30% para clientes que simplesmente pedem.',
        },
      ],
      tags: ['assinaturas', 'gastos fixos', 'custo de vida'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TRILHA 2 — Entenda seus Indicadores (Ld, Sg, Sv)
// ─────────────────────────────────────────────────────────────────────────────

const trail2: Trail = {
  id: 't2',
  title: 'Seus Indicadores — Ld, Sg, Sv',
  description: 'Entenda os 3 números que definem sua soberania financeira no Sibanki.',
  icon: '📡',
  color: 'bg-blue-500/10',
  textColor: 'text-blue-400',
  level: 'iniciante',
  totalXp: 180,
  lessons: [
    {
      id: 't2l1',
      title: 'Ld — Dias de Liberdade: o que é e como aumentar',
      duration: '6 min',
      xp: 45,
      icon: '🗓️',
      intro: 'Ld (Dias de Liberdade) é a resposta para a pergunta: "Se eu parar de trabalhar hoje, por quantos dias minha vida financeira continua normal?" É o indicador mais honesto de resiliência financeira.',
      points: [
        '**Como é calculado.** Ld = Patrimônio Líquido ÷ Burn Rate Diário. Patrimônio Líquido é a soma dos seus saldos em contas + valor atual dos investimentos. Burn Rate Diário é a média dos seus gastos diários nos últimos 90 dias.',
        '**Os tiers de Ld.** Frágil (0–30 dias): qualquer imprevisto vira emergência. Em Construção (31–90): você tem alguma proteção. Resiliente (91–180): boa segurança. Soberano (181–365): você pode escolher oportunidades. Inabalável (365+): independência real.',
        '**O que eleva o Ld.** Duas alavancas: aumentar o patrimônio (mais investimentos, mais saldo) OU reduzir o burn rate (menores gastos). Aumentar o patrimônio sem reduzir o burn rate pode ser menos eficiente do que se imagina.',
        '**Burn Rate vs. Renda.** Pessoas de alta renda frequentemente têm Ld baixo porque seus gastos acompanham (ou superam) a renda. Pessoas de renda média com gastos disciplinados podem ter Ld superior ao dobro.',
        '**Acompanhe mensalmente.** O Ld sobe quando você poupa/investe e desce quando gasta mais ou quando investimentos caem. É o termômetro mais imediato da sua trajetória.',
      ],
      example: 'Patrimônio: R$ 45.000. Gastos médios: R$ 3.500/mês = R$ 117/dia. Ld = 45.000 / 117 ≈ 385 dias. Tier: "Soberano". Se reduzir gastos para R$ 3.000/mês: Ld sobe para ~450 dias sem nenhum novo aporte.',
      quiz: [
        {
          q: 'Como é calculado o Ld (Dias de Liberdade)?',
          options: ['Renda mensal ÷ despesas mensais', 'Patrimônio Líquido ÷ Burn Rate Diário', 'Total de investimentos × taxa de rendimento', 'Saldo da conta ÷ número de dias do mês'],
          correct: 1,
          explanation: 'Ld = Patrimônio Líquido / Burn Rate Diário. O patrimônio inclui saldos + investimentos. O burn rate é a média de gastos diários reais (últimos 90 dias).',
        },
        {
          q: 'Qual das ações abaixo aumenta o Ld de forma mais eficiente?',
          options: ['Apenas aumentar investimentos sem mexer nos gastos', 'Apenas reduzir gastos sem novos investimentos', 'Simultaneamente aumentar o patrimônio E reduzir o burn rate', 'Contratar mais seguros para proteção'],
          correct: 2,
          explanation: 'As duas alavancas trabalham em conjunto. Aumentar o numerador (patrimônio) E reduzir o denominador (burn rate) maximiza o resultado. Só uma das duas tem efeito mais limitado.',
        },
        {
          q: 'Uma pessoa de alta renda pode ter Ld baixo?',
          options: ['Não — alta renda sempre significa alto Ld', 'Sim — se os gastos acompanham ou superam a renda, o patrimônio não cresce e o Ld permanece baixo', 'Só se tiver muitas dívidas', 'Apenas se tiver filhos dependentes'],
          correct: 1,
          explanation: 'Ld mede patrimônio vs. gasto, não renda. Quem ganha R$ 30.000/mês mas gasta R$ 29.000 tem Ld próximo de zero. Quem ganha R$ 5.000 e gasta R$ 2.500 constrói Ld rapidamente.',
        },
      ],
      tags: ['Ld', 'dias de liberdade', 'patrimônio', 'burn rate'],
    },
    {
      id: 't2l2',
      title: 'Sg — Spread Gap: você está ganhando ou perdendo para os juros?',
      duration: '5 min',
      xp: 45,
      icon: '📉',
      intro: 'Sg (Spread Gap) é a diferença entre o que seus investimentos rendem e o que suas dívidas custam. Um Sg negativo significa que você está pagando mais ao banco do que o banco (ou a bolsa) lhe paga.',
      points: [
        '**A fórmula.** Sg = Taxa Média dos Investimentos (a.m.) − Taxa Média das Dívidas (a.m.). Exemplo: investimentos rendendo 0,8%/mês, dívidas custando 1,5%/mês → Sg = -0,7%. Cada mês, você perde 0,7% sobre o total de dívidas.',
        '**Os quatro quadrantes.** Sg > 2%: Alavancagem Inteligente (você está ganhando dos juros). 0–2%: Zona Neutra (eficiência marginal). -2%–0%: Ineficiência Moderada (atenção). Abaixo de -2%: Dreno Crítico (prioridade máxima).',
        '**Vazamento mensal.** Quando Sg < 0, o Sibanki calcula o vazamento: |Sg| × total de dívidas. Com Sg = -0,7% e R$ 20.000 em dívidas, você perde R$ 140/mês em ineficiência pura — dinheiro que evaporou.',
        '**Como melhorar o Sg.** Dois caminhos: aumentar a taxa dos investimentos (ir de Tesouro Selic para CDB melhor, de CDB para FIIs ou ações) OU reduzir a taxa das dívidas (portabilidade de crédito, renegociação, antecipação de parcelas).',
        '**A armadilha do Sg aparente.** Ter R$ 10.000 investidos a 10% a.a. e R$ 10.000 de dívida de cartão a 300% a.a. é matematicamente catastrófico. O "investimento" existe, mas o Sg está profundamente negativo.',
      ],
      example: 'Investimentos: CDB a 0,9%/mês. Dívidas: cartão rotativo a 15%/mês + financiamento a 1,8%/mês. Taxa média de dívidas: ~5%/mês. Sg = 0,9% - 5% = -4,1%. Com R$ 15.000 em dívidas: vazamento de R$ 615/mês. Quitando o cartão com os CDBs, o Sg vai imediatamente a 0 ou positivo.',
      quiz: [
        {
          q: 'O que significa um Sg (Spread Gap) negativo?',
          options: ['Que seus investimentos rendem mais que suas dívidas custam', 'Que suas dívidas custam mais do que seus investimentos rendem — você está perdendo para os juros', 'Que você não tem investimentos suficientes', 'Que seu crédito está comprometido'],
          correct: 1,
          explanation: 'Sg = Taxa Investimentos − Taxa Dívidas. Quando negativo, você paga mais para os credores do que recebe dos seus ativos. É uma ineficiência que drena patrimônio mês a mês.',
        },
        {
          q: 'Qual é a forma mais rápida de melhorar um Sg muito negativo causado por dívida de cartão rotativo?',
          options: ['Investir mais em renda variável para aumentar o retorno', 'Quitar a dívida de cartão — a taxa do rotativo (200-300% a.a.) raramente é superada por nenhum investimento', 'Contratar mais crédito para pagar o cartão', 'Reduzir o limite do cartão'],
          correct: 1,
          explanation: 'O rotativo do cartão cobra 15-25% ao mês. Nenhum investimento de baixo risco bate isso. Quitá-lo com reservas (se existirem) é sempre a decisão matematicamente correta.',
        },
        {
          q: 'Como o Sibanki usa o Sg para alertar o usuário?',
          options: ['Bloqueia novos gastos quando o Sg é negativo', 'Calcula o "vazamento mensal" (|Sg| × total de dívidas) para mostrar o custo real da ineficiência', 'Envia notificação apenas quando Sg cai abaixo de -5%', 'Aplica penalidade no Sovereignty Score'],
          correct: 1,
          explanation: 'O vazamento mensal torna o Sg concreto: ao invés de dizer "seu Sg é -0,7%", mostra "você perde R$ 140/mês por essa ineficiência". Isso facilita a tomada de decisão.',
        },
      ],
      tags: ['Sg', 'spread gap', 'juros', 'dívidas'],
    },
    {
      id: 't2l3',
      title: 'Sv — Sovereignty Score: cada gasto tem um impacto',
      duration: '5 min',
      xp: 45,
      icon: '⚡',
      intro: 'Sv é a nota de 0 a 100 atribuída a cada gasto, indicando se ele aumenta ou diminui sua soberania financeira. Não é julgamento moral — é física financeira.',
      points: [
        '**A lógica do score.** Um gasto que preserva saúde (plano médico, alimentação nutritiva) pontua alto porque reduz risco futuro. Um gasto no rotativo do cartão à meia-noite pontua baixo porque combina alto custo de capital com impulso.',
        '**Fatores considerados.** Categoria (necessidade vs. desejo vs. auto-sabotagem), forma de pagamento (débito/PIX perde menos que parcelado, que perde muito menos que rotativo), timing (gastos de final de mês quando o orçamento está apertado pontuam menos), impacto no burn rate.',
        '**Verdicts por range.** 80-100: Soberano (verde). 60-79: Consciente (azul). 40-59: Atenção (âmbar). 0-39: Auto-Sabotagem (vermelho). O objetivo não é ter 100% dos gastos no verde — é reduzir a frequência dos vermelhos.',
        '**Sv médio como indicador.** O score médio do mês revela padrões. Um Sv médio de 45 sugere que muitos gastos estão na zona de atenção — e o Consultor IA pode analisar quais e sugerir alternativas.',
        '**O Sv não restringe, informa.** Você pode gastar no vinho caro em um jantar especial com Sv 38. A questão é: isso é uma escolha consciente ou um padrão habitual inconsciente?',
      ],
      example: 'Compra de R$ 200 à vista no débito em supermercado (categoria essencial): Sv ~82. Mesma compra no cartão com 10x e parcelas no limite do cartão: Sv ~35. A diferença não é o gasto — é a forma de fazer o gasto.',
      quiz: [
        {
          q: 'O que o Sv (Sovereignty Score) mede em cada transação?',
          options: ['O valor absoluto do gasto', 'Se o gasto foi necessário ou supérfluo, segundo uma regra fixa', 'O impacto relativo do gasto na soberania financeira, considerando categoria, forma de pagamento, timing e contexto', 'A popularidade da categoria de gasto entre outros usuários'],
          correct: 2,
          explanation: 'O Sv é multidimensional. Um mesmo valor pode ter Sv muito diferente dependendo de como foi pago, quando, em qual categoria e qual o contexto do orçamento do usuário.',
        },
        {
          q: 'Por que uma compra parcelada no rotativo do cartão tem Sv muito mais baixo que a mesma compra no débito?',
          options: ['Porque débito é mais seguro que cartão', 'Porque o custo do capital no rotativo é altíssimo (200-300% a.a.) e representa uma decisão de menor soberania financeira', 'Porque cartão gera mais burocracia', 'Porque débito dá pontos no programa de fidelidade'],
          correct: 1,
          explanation: 'A forma de pagamento determina o custo real do bem. Um produto de R$ 200 no rotativo por 3 meses pode custar R$ 290 ou mais. O Sv captura esse custo implícito.',
        },
        {
          q: 'Qual é a função principal do Sv no uso diário?',
          options: ['Bloquear compras acima de certo valor', 'Substituir o orçamento tradicional', 'Tornar visível o padrão de qualidade das decisões financeiras ao longo do tempo, sem restringir escolhas', 'Calcular o imposto de renda sobre consumo'],
          correct: 2,
          explanation: 'O Sv informa, não proíbe. Ao ver que seu Sv médio do mês é 42, você tem um dado objetivo para conversar com o Consultor IA e identificar oportunidades de melhoria.',
        },
      ],
      tags: ['Sv', 'sovereignty score', 'gastos', 'decisões'],
    },
    {
      id: 't2l4',
      title: 'Como usar os três indicadores para decidir',
      duration: '6 min',
      xp: 45,
      icon: '🧭',
      intro: 'Ld, Sg e Sv não são apenas métricas — são um framework de decisão. Entender como os três se relacionam transforma como você aborda cada escolha financeira.',
      points: [
        '**O triângulo de soberania.** Ld mede onde você está (sua reserva de tempo). Sg mede a qualidade estrutural do seu portfólio (se está ganhando ou perdendo para os juros). Sv mede a qualidade das suas decisões do dia a dia (o fluxo de gastos).',
        '**Decisão de compra parcelada.** Antes de parcelar algo: Qual será o impacto no meu burn rate (→ impacto no Ld)? Vou criar ou aumentar uma dívida (→ impacto no Sg)? Estou fazendo isso conscientemente ou por impulso (→ Sv)?',
        '**Decisão de investimento.** Qual é meu Ld atual? Se for abaixo de 90 dias, prioridade é liquidez (Tesouro Selic/CDB com liquidez), não rentabilidade máxima. Com Sg muito negativo, quitar dívida cara rende mais que qualquer investimento.',
        '**Diagnóstico rápido do momento atual.** Ld < 30 + Sg muito negativo + Sv médio baixo = sinal de alerta. O Sibanki identifica esse padrão e sugere prioridades através do Consultor IA e dos alertas do hub de Crédito.',
        '**A evolução dos indicadores.** Começar com Ld 15, Sg -3%, Sv 45 e chegar a Ld 120, Sg +0,5%, Sv 68 em 12 meses é uma transformação financeira real — mesmo com renda idêntica.',
      ],
      example: 'Marina, renda R$ 4.500/mês: Ld 8 dias (crítico), Sg -2,8% (dívida de cartão), Sv médio 38. Estratégia de 6 meses: 1) Quitar cartão com CDB (Sg vai a ~0), 2) Construir reserva de 3 meses (Ld vai a ~90), 3) Categorizar gastos consciente (Sv sobe para ~58). Resultado: de zona crítica para zona de construção.',
      quiz: [
        {
          q: 'Qual indicador deve ser priorizado por quem tem Sg muito negativo?',
          options: ['Aumentar o Ld maximalamente', 'Melhorar o Sv médio dos gastos', 'Resolver o Sg negativo quitando a dívida cara, pois ela drena patrimônio mais rapidamente que qualquer otimização de gastos', 'Diversificar os investimentos'],
          correct: 2,
          explanation: 'Um Sg de -3% com R$ 20.000 em dívidas drena R$ 600/mês. Nenhuma melhora de Sv resolve isso. A dívida cara é o buraco no balde — até tapar o buraco, não adianta encher mais.',
        },
        {
          q: 'Quando o Ld está abaixo de 90 dias, qual deve ser a prioridade de investimento?',
          options: ['Ações de crescimento para maximizar retorno', 'FIIs para gerar renda passiva', 'Ativos com alta liquidez (Tesouro Selic, CDB com liquidez diária) para construir a reserva', 'Criptoativos de alto risco/alto retorno'],
          correct: 2,
          explanation: 'Com Ld baixo, qualquer emergência transforma-se em dívida. A prioridade é construir a reserva com ativos líquidos. Rentabilidade máxima vem depois que a base está consolidada.',
        },
        {
          q: 'Um Sv médio baixo (< 40) mas com Ld 200 e Sg +1% é um problema grave?',
          options: ['Sim — o Sv baixo cancela qualquer progresso nos outros indicadores', 'Não necessariamente — os outros indicadores mostram que a base está sólida, mas o Sv baixo é um sinal de atenção para o longo prazo', 'Sim — qualquer Sv abaixo de 50 requer ação imediata', 'Não — Sv é apenas informativo e não impacta nada'],
          correct: 1,
          explanation: 'Indicadores precisam ser lidos em conjunto. Ld 200 e Sg positivo mostram uma base sólida. Sv baixo indica oportunidade de melhoria nas decisões de consumo, mas não é uma emergência — é uma otimização.',
        },
      ],
      tags: ['Ld', 'Sg', 'Sv', 'tomada de decisão', 'soberania'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TRILHA 3 — Investimentos Descomplicados
// ─────────────────────────────────────────────────────────────────────────────

const trail3: Trail = {
  id: 't3',
  title: 'Investimentos Descomplicados',
  description: 'Da renda fixa às ações — como cada classe de ativo funciona e quando usá-la.',
  icon: '📈',
  color: 'bg-violet-500/10',
  textColor: 'text-violet-400',
  level: 'intermediário',
  totalXp: 270,
  lessons: [
    {
      id: 't3l1',
      title: 'Renda fixa: CDB, LCI, LCA e Tesouro Direto',
      duration: '7 min',
      xp: 55,
      icon: '🏦',
      intro: 'Renda fixa não significa ganho fixo — significa que a regra de remuneração é definida no início. Entender cada produto é a diferença entre ganhar 100% do CDI ou 80%.',
      points: [
        '**CDB (Certificado de Depósito Bancário).** Você empresta dinheiro ao banco. Em troca, recebe juros. Taxa varia: 80% a 130%+ do CDI. Bancos maiores pagam menos; fintechs e bancos médios pagam mais. Garantido pelo FGC até R$ 250.000 por CPF/instituição.',
        '**LCI e LCA (Letras de Crédito Imobiliário e do Agronegócio).** Similares ao CDB, mas isentos de IR para pessoa física. Por isso, uma LCI a 90% CDI pode ser mais rentável que um CDB a 108% CDI — depende da alíquota de IR sobre o prazo.',
        '**Tesouro Direto.** Você empresta para o governo federal (risco soberano — menor risco do país). Tipos: Selic (acompanha a taxa básica, liquidez diária), IPCA+ (protege da inflação + taxa real), Prefixado (taxa fixa — bom quando você acredita que a Selic vai cair).',
        '**Como comparar corretamente.** Sempre converta para retorno líquido. CDB a 110% CDI por 12 meses: paga 17,5% de IR sobre o rendimento. LCI a 95% CDI: isento. Com CDI a 10,5% a.a.: CDB rende ~9,5% líquido, LCI rende ~9,97% líquido. A LCI ganha nesse caso.',
        '**Liquidez importa.** Um CDB de 3 anos com liquidez diária é diferente de um CDB de 3 anos sem liquidez (mas com taxa melhor). Para a reserva de emergência: sempre liquidez diária. Para investimentos de médio/longo prazo: pode abrir mão da liquidez em troca de taxa melhor.',
      ],
      example: 'R$ 10.000 investidos por 2 anos. CDB 115% CDI: rendimento bruto ~23,4%, IR 15% = ~19,9% líquido (~R$ 1.990). LCI 100% CDI: rendimento ~21% líquido (isento IR) = ~R$ 2.100. A LCI rende R$ 110 a mais no mesmo período — só por ser isenta.',
      quiz: [
        {
          q: 'Por que uma LCI com taxa menor que um CDB pode ser mais rentável?',
          options: ['Porque tem mais garantias', 'Porque a LCI é isenta de IR para PF, enquanto o CDB é tributado — no líquido, a LCI pode ganhar', 'Porque bancos públicos pagam mais na LCI', 'Porque a LCI tem liquidez diária sempre'],
          correct: 1,
          explanation: 'A comparação deve sempre ser feita no retorno líquido. LCI/LCA são isentos de IR. Um CDB paga 17,5% de IR (2 anos) ou 15% (acima de 2 anos) sobre o rendimento. Esse imposto muda a rentabilidade real.',
        },
        {
          q: 'Qual produto de Tesouro Direto é mais adequado para reserva de emergência?',
          options: ['Tesouro IPCA+ com vencimento em 2035', 'Tesouro Prefixado', 'Tesouro Selic (com liquidez D+1 e sem volatilidade de preço)', 'Tesouro Renda+ para aposentadoria'],
          correct: 2,
          explanation: 'Tesouro Selic acompanha a taxa básica, tem liquidez diária real (D+1), e não tem volatilidade de preço (ao contrário de IPCA+ e Prefixado que oscilam com a marcação a mercado).',
        },
        {
          q: 'O que é o FGC e por que é relevante para CDBs?',
          options: ['Fundo Garantidor de Cartões — protege até R$ 500k em gastos', 'Fundo Garantidor de Créditos — garante devolução de até R$ 250k por CPF/instituição em caso de falência do banco', 'Fundo Geral de Câmbio — protege de variação cambial', 'Fundo de Gestão Coletiva — para investimentos coletivos'],
          correct: 1,
          explanation: 'O FGC garante até R$ 250.000 por CPF por instituição financeira (e R$ 1 milhão total no prazo de 4 anos). CDBs de bancos médios com taxa alta são seguros até esse limite.',
        },
      ],
      tags: ['CDB', 'LCI', 'LCA', 'Tesouro Direto', 'renda fixa'],
    },
    {
      id: 't3l2',
      title: 'Ações e FIIs: o que são e como avaliar',
      duration: '7 min',
      xp: 55,
      icon: '📊',
      intro: 'Comprar ações é ser sócio de uma empresa. Comprar FIIs é ser sócio de imóveis. Ambos geram renda (dividendos/proventos) e podem valorizar — mas exigem horizonte de longo prazo e tolerância a oscilações.',
      points: [
        '**Ações: o que você compra.** Uma ação representa uma fração da empresa. Se a empresa cresce e lucra, suas ações (tendem a) valorizar. Se distribui lucros, você recebe dividendos. O risco: empresas podem perder valor, reduzir dividendos ou falir.',
        '**FIIs: imóvel sem comprar imóvel.** Um Fundo de Investimento Imobiliário reúne investidores para adquirir imóveis (lajes corporativas, galpões logísticos, shoppings, hospitais). Você recebe proventos mensais isentos de IR. O preço oscila com o mercado e com a taxa Selic.',
        '**Métricas de avaliação básicas.** P/L (Preço/Lucro): quantas vezes o preço está no lucro anual — P/L 10 = você paga 10 anos de lucro para ser sócio. DY (Dividend Yield): rendimento anual em dividendos sobre o preço — DY 8% significa R$ 80/ano em dividendos para cada R$ 1.000 investidos.',
        '**Graham e Bazin no Sibanki.** O Sibanki usa duas análises clássicas: Preço Justo de Graham (√(22,5 × LPA × VPA)) e Teto de Bazin (Dividendo anual / 6%). Se o preço atual está abaixo do preço justo: potencial de compra. Acima: potencial de sobrepreço.',
        '**Volatilidade não é risco permanente.** Ações oscilam 20-40% ao ano com frequência. Quem vendeu em março 2020 (queda de 45%) concretizou a perda. Quem manteve recuperou em 6 meses. Prazo e diversificação são os maiores redutores de risco em renda variável.',
      ],
      example: 'ITUB4 com preço de R$ 28, LPA R$ 4,20, VPA R$ 19. Graham: √(22,5 × 4,20 × 19) ≈ √1.795,5 ≈ R$ 42,37. Desconto de ~34% vs. preço justo. DY histórico 6,5%. Bazin: R$ 1,82 (div. anual) / 0,06 = R$ 30,33. Preço abaixo do teto Bazin: potencialmente atrativo.',
      quiz: [
        {
          q: 'O que representa o P/L (Preço/Lucro) de uma ação?',
          options: ['A diferença entre o preço máximo e mínimo histórico', 'Quantas vezes o preço da ação representa o lucro anual por ação — o "payback" se todo lucro fosse dividendo', 'O preço ajustado pela inflação', 'A relação entre preço e volume negociado'],
          correct: 1,
          explanation: 'P/L = Preço / Lucro Por Ação. Se P/L = 12, ao preço atual você pagaria 12 anos de lucro para ser sócio. P/L mais baixo pode indicar ação mais barata, mas contexto de setor e crescimento são essenciais.',
        },
        {
          q: 'Por que proventos de FIIs são isentos de IR para pessoa física?',
          options: ['Porque FIIs são considerados poupança pelo governo', 'Porque a lei tributária isenta distribuições de FIIs listados na B3 com pelo menos 50 cotistas e o cotista com menos de 10% do fundo', 'Porque FIIs não têm lucro tributável', 'Porque o imposto é pago pelo administrador do fundo'],
          correct: 1,
          explanation: 'A isenção é um benefício legal específico para FIIs com distribuição de no mínimo 95% do lucro semestral, listados em bolsa, com no mínimo 50 cotistas e o cotista com participação < 10%.',
        },
        {
          q: 'O que o Teto de Bazin representa na análise de ações?',
          options: ['O preço máximo histórico da ação', 'O preço máximo que se justificaria pagar por uma ação com base no dividendo anual esperado (dividendo / 6%)', 'O limite de volatilidade anual aceitável', 'A capitalização de mercado máxima'],
          correct: 1,
          explanation: 'Bazin propôs que o investidor não deve pagar mais por uma ação do que o valor que oferece 6% de rendimento em dividendos. Fórmula: Teto = Dividendo Anual / 0,06. É uma análise conservadora focada em renda.',
        },
      ],
      tags: ['ações', 'FIIs', 'dividendos', 'P/L', 'DY', 'Graham', 'Bazin'],
    },
    {
      id: 't3l3',
      title: 'ETFs: diversificação automática e barata',
      duration: '5 min',
      xp: 50,
      icon: '🧺',
      intro: 'Um ETF (Exchange Traded Fund) é um fundo que replica um índice e negocia como uma ação. Você compra o BOVA11 e passa a ser sócio (indiretamente) das 84 maiores empresas do Brasil de uma vez.',
      points: [
        '**Como funcionam.** O gestor do ETF mantém as ações que compõem o índice na proporção correta. Quando o índice sobe, o ETF sobe. Quando o índice cai, o ETF cai. Não há gestão ativa — só replicação.',
        '**Taxa de administração (TER).** ETFs têm taxas menores que fundos de gestão ativa. BOVA11: 0,1% a.a. IVVB11 (S&P 500): 0,23% a.a. Um fundo de ações ativo médio: 1,5–2,5% a.a. A diferença de 2% ao ano em 20 anos pode representar 40% a mais de patrimônio no ETF passivo.',
        '**Principais ETFs do Brasil.** BOVA11: replica o Ibovespa (84 maiores empresas do Brasil). SMAL11: small caps brasileiras. IVVB11: replica o S&P 500 (500 maiores empresas dos EUA) com proteção cambial implícita. HASH11: criptoativos.',
        '**Para quem é indicado.** Iniciantes que não querem selecionar ações individualmente. Investidores que acreditam em diversificação ampla. Quem quer exposição global com facilidade.',
        '**Limite do ETF.** Você ganha e perde com o índice — não pode superar o mercado. Em momentos de crise generalizada, todos os ativos do índice caem juntos. A tese é que no longo prazo (10+ anos) o índice amplo tende a superar a maioria dos gestores ativos.',
      ],
      example: 'R$ 500/mês em BOVA11 por 15 anos, com rendimento histórico médio do Ibovespa de 12% a.a.: patrimônio de ~R$ 250.000. Taxa de adm. 0,1% vs. fundo ativo 2%: diferença de ~R$ 45.000 a favor do ETF ao final do período — só pela diferença de taxa.',
      quiz: [
        {
          q: 'O que diferencia um ETF de um fundo de investimento comum?',
          options: ['ETFs são isentos de IR', 'ETFs negociam na bolsa como ações (compra/venda intraday) e geralmente replicam passivamente um índice com taxas menores', 'ETFs não têm risco de perda', 'ETFs são gerenciados por bancos públicos'],
          correct: 1,
          explanation: 'ETFs combinam a diversificação de um fundo com a liquidez de uma ação (negociação intraday). A maioria replica índices (gestão passiva), o que resulta em taxas muito menores que fundos ativos.',
        },
        {
          q: 'Por que a diferença de 2% ao ano em taxa de administração é tão relevante no longo prazo?',
          options: ['Porque 2% ao mês é muito dinheiro', 'Porque juros compostos fazem pequenas diferenças anuais se acumularem exponencialmente — 2% a.a. em 20 anos pode representar 40%+ do patrimônio final', 'Porque taxas acima de 2% são ilegais', 'Porque fundos ativos têm taxa de saída adicional'],
          correct: 1,
          explanation: 'Exemplo: R$ 100.000 a 10% a.a. por 20 anos = R$ 672.000. A 8% a.a. (descontado 2% de taxa) = R$ 466.000. A diferença de 2% ao ano custou R$ 206.000 — 43% do patrimônio final.',
        },
        {
          q: 'O IVVB11 oferece qual exposição ao investidor brasileiro?',
          options: ['Exposição ao mercado imobiliário dos EUA', 'Exposição às 500 maiores empresas dos EUA (S&P 500) negociado em reais na B3, com exposição implícita ao dólar', 'Exposição apenas a empresas de tecnologia americanas', 'Exposição ao mercado de renda fixa dos EUA'],
          correct: 1,
          explanation: 'IVVB11 é um ETF que negocia em BRL na B3 mas replica o S&P 500. Além da performance das 500 maiores empresas dos EUA, o investidor brasileiro ganha (ou perde) com a variação do dólar.',
        },
      ],
      tags: ['ETFs', 'BOVA11', 'IVVB11', 'diversificação', 'índice'],
    },
    {
      id: 't3l4',
      title: 'Criptoativos: oportunidade e gestão de risco',
      duration: '5 min',
      xp: 50,
      icon: '🔗',
      intro: 'Criptoativos são ativos digitais sem autoridade central. Bitcoin e Ethereum são os maiores por capitalização. A oportunidade é real — assim como o risco de perda total.',
      points: [
        '**O que é e o que não é.** Cripto é uma classe de ativos digitais descentralizados. Não é dinheiro garantido pelo governo, não é investimento de renda fixa, não é ação de empresa. É um ativo especulativo com altíssima volatilidade — perdas de 70-80% em meses são históricas.',
        '**Bitcoin como reserva de valor.** BTC tem oferta máxima de 21 milhões de unidades. Essa escassez programada é o argumento principal para usá-lo como proteção de longo prazo contra inflação e desvalorização monetária. Comparado frequentemente ao ouro digital.',
        '**Ethereum e o ecossistema DeFi.** ETH é a plataforma sobre a qual contratos inteligentes rodam. Permite DeFi (Finanças Descentralizadas), NFTs, stablecoins. Mais volátil que BTC por ter uso mais amplo e experimental.',
        '**Tamanho adequado de alocação.** A maioria dos gestores prudentes sugere 1-5% do portfólio em cripto para perfis moderados a arrojados. A tese: se cripto explodir, você participa; se for a zero, não destroça seu patrimônio.',
        '**Custódia é tudo.** "Not your keys, not your coins." Exchanges podem falir (FTX, 2022: US$ 32 bilhões evaporados). Grandes valores devem ficar em carteira própria (hardware wallet). Pequenos valores em exchanges reguladas no Brasil (Mercado Bitcoin, Binance BR).',
      ],
      example: 'Portfólio de R$ 100.000. Alocação cripto de 3% = R$ 3.000 em BTC. Cenário pessimista: BTC cai 80% → perda de R$ 2.400 (2,4% do portfólio, recuperável). Cenário otimista: BTC sobe 400% → ganho de R$ 12.000 (12% do portfólio). Assimetria favorável com perda controlada.',
      quiz: [
        {
          q: 'Qual é o principal argumento para Bitcoin como reserva de valor no longo prazo?',
          options: ['É aprovado pelo Banco Central do Brasil', 'Tem respaldo em ouro físico', 'Tem oferta máxima de 21 milhões de unidades — a escassez programada protege contra inflação monetária', 'Gera dividendos mensais'],
          correct: 2,
          explanation: 'A oferta de BTC é matematicamente limitada e decresce progressivamente (halvings). Ao contrário de moedas fiduciárias que podem ser emitidas em qualquer quantidade, BTC tem deflação programada de oferta.',
        },
        {
          q: 'O que significa "Not your keys, not your coins"?',
          options: ['Você só pode comprar cripto com chave PIX', 'Enquanto seus criptoativos ficam em uma exchange, você confia na solvência dela — se ela falir, você pode perder tudo. Custódia própria dá controle real', 'Chaves privadas são necessárias apenas para transferências internacionais', 'Refere-se a senhas bancárias de exchanges'],
          correct: 1,
          explanation: 'A falência da FTX (2022) provou isso com US$ 32 bilhões. Quem tinha BTC/ETH na própria carteira (hardware wallet) não perdeu nada. Quem confiou na exchange, perdeu.',
        },
        {
          q: 'Para um investidor moderado, qual é o range de alocação geralmente recomendado em criptoativos?',
          options: ['50-70% do portfólio para maximizar retorno', '20-30% para capturar crescimento', '1-5% — participa do potencial sem que uma queda destrua o patrimônio', '0% — cripto não é investimento adequado'],
          correct: 2,
          explanation: 'Cripto tem volatilidade extrema. Uma alocação de 1-5% cria assimetria favorável: se subir muito, o impacto é positivo significativo; se cair 80%, o impacto no portfólio total é gerenciável.',
        },
      ],
      tags: ['criptoativos', 'Bitcoin', 'Ethereum', 'DeFi', 'risco'],
    },
    {
      id: 't3l5',
      title: 'Montando sua carteira por perfil de risco',
      duration: '6 min',
      xp: 60,
      icon: '🗂️',
      intro: 'Uma carteira de investimentos não é uma lista de ativos — é uma estratégia. A alocação certa depende do seu horizonte, do seu Ld e da sua tolerância a ver o valor cair temporariamente.',
      points: [
        '**Perfil conservador (Ld < 90 ou tolerância baixa a volatilidade).** 70-80% em renda fixa (Tesouro Selic, CDB, LCI). 15-20% em FIIs de tijolo (menor volatilidade). 5% em ações/ETFs. Meta: preservação + rendimento acima da inflação.',
        '**Perfil moderado (Ld 90-365, horizonte 5+ anos).** 40-50% renda fixa. 30-40% em FIIs + ETFs (BOVA11, IVVB11). 10-15% ações selecionadas. 0-5% cripto. Equilíbrio entre crescimento e proteção.',
        '**Perfil arrojado (Ld 365+ anos, horizonte 10+ anos).** 20-30% renda fixa (principalmente como rebalanceamento). 50-60% renda variável (ações, FIIs, ETFs). 10-15% internacional (IVVB11). 5-10% cripto. Crescimento acelerado com volatilidade aceita.',
        '**Rebalanceamento periódico.** Defina uma alocação-alvo e rebalanceie semestralmente (ou quando qualquer classe desviar >5%). Rebalancear força você a vender o que subiu e comprar o que caiu — o oposto do instinto humano.',
        '**A regra da "liquidez primeiro".** Independente do perfil, mantenha sempre a reserva de emergência separada da carteira de investimentos. A reserva não é investimento — é seguro.',
      ],
      example: 'Carteira moderada de R$ 50.000: R$ 22.500 renda fixa (45%), R$ 15.000 FIIs (30%), R$ 7.500 ETFs BOVA11+IVVB11 (15%), R$ 5.000 ações (10%). Após 1 ano: ações sobem 40% (+R$ 2.000), renda fixa +10% (+R$ 2.250). Renda variável agora é 35% vs. alvo 25%. Rebalanceamento: vende parcialmente ações, compra renda fixa.',
      quiz: [
        {
          q: 'O que é rebalanceamento de carteira e por que é contraintuitivo?',
          options: ['Adicionar sempre novos ativos a cada mês', 'Ajustar a carteira periodicamente para a alocação-alvo, o que exige vender o que subiu e comprar o que caiu — contrário ao instinto humano', 'Trocar toda a carteira quando o mercado cai', 'Contratar um novo gestor quando os rendimentos caem'],
          correct: 1,
          explanation: 'Rebalancear é disciplina programática. Quando ações sobem muito e ultrapassam a alocação-alvo, você as vende (realizando ganho) e compra renda fixa (que "está barata" relativamente). Isso automatiza o "compre na baixa, venda na alta".',
        },
        {
          q: 'Por que um investidor com Ld < 90 dias deve priorizar renda fixa de alta liquidez?',
          options: ['Porque renda variável é proibida para esse perfil', 'Porque ele pode precisar do dinheiro em breve — e ações podem estar em queda exatamente quando ele precisar', 'Porque renda fixa rende mais que ações no curto prazo', 'Porque bancos exigem renda fixa como garantia de crédito'],
          correct: 1,
          explanation: 'Com Ld baixo, qualquer emergência vira liquidação de investimentos. Se as ações estiverem em queda nesse momento (que é quando emergências são mais prováveis), você vende em perda. Liquidez é a prioridade antes de qualquer otimização de rentabilidade.',
        },
        {
          q: 'A reserva de emergência deve ser considerada parte da carteira de investimentos?',
          options: ['Sim — é o bloco mais conservador da carteira', 'Não — é um "seguro" separado com objetivo diferente (proteger de imprevistos), enquanto a carteira de investimentos tem objetivo de crescimento/renda', 'Depende do banco onde está aplicada', 'Só se for em Tesouro Direto'],
          correct: 1,
          explanation: 'Misturar reserva com investimentos é um erro conceitual. A reserva tem objetivo único: estar disponível intacta quando você precisar. A carteira tem objetivo de crescimento. Misturá-las sabota os dois objetivos.',
        },
      ],
      tags: ['carteira', 'perfil de risco', 'alocação', 'rebalanceamento', 'diversificação'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TRILHA 4 — Crédito como Ferramenta
// ─────────────────────────────────────────────────────────────────────────────

const trail4: Trail = {
  id: 't4',
  title: 'Crédito como Ferramenta',
  description: 'Juros, portabilidade, score e a estratégia para sair do vermelho com método.',
  icon: '💳',
  color: 'bg-amber-500/10',
  textColor: 'text-amber-400',
  level: 'intermediário',
  totalXp: 210,
  lessons: [
    {
      id: 't4l1',
      title: 'Como os juros destroem patrimônio — e quando são aliados',
      duration: '6 min',
      xp: 55,
      icon: '⚠️',
      intro: 'Juros compostos são a maior força do universo financeiro — na frase atribuída a Einstein. Quando trabalham para você, constroem fortuna. Quando trabalham contra você, destroem com a mesma velocidade.',
      points: [
        '**Taxas do mercado brasileiro (referência 2025-2026).** Cheque especial: 8-10% a.m. Rotativo do cartão: 15-25% a.m. Empréstimo pessoal sem garantia: 3-6% a.m. Crédito consignado: 1-2% a.m. Financiamento imobiliário: 0,7-1,0% a.m. A diferença entre a pior e a melhor linha é de 10-20x.',
        '**O efeito de R$ 1.000 no rotativo por 12 meses.** A 20% a.m. (taxa média de mercado): R$ 1.000 viram R$ 7.430 em 12 meses. Você pagaria R$ 6.430 de juros sobre R$ 1.000 de principal. Esse é o custo de não pagar a fatura do cartão.',
        '**Quando o crédito é aliado.** Parcelamento sem juros em compra planejada: você usa o dinheiro do lojista por 30-90 dias enquanto o seu rende no Tesouro Selic. Financiamento imobiliário a 8% a.a. enquanto a inflação está a 5% e seu patrimônio cresce a 10%: o crédito está trabalhando para você.',
        '**O critério de decisão.** Só use crédito quando a taxa é menor que o retorno do que você vai fazer com o dinheiro. Financiamento de veículo a 24% a.a. para um carro que perde 20% de valor no primeiro ano: nunca faz sentido. Crédito para capital de giro de negócio que gera 40% ao ano: pode fazer sentido.',
        '**Score de crédito (Serasa/SPC).** Pontua de 0 a 1.000. Acima de 700: boas taxas disponíveis. Abaixo de 400: taxas máximas ou sem aprovação. Construído com: pagamento em dia, tempo de relacionamento, variedade de crédito, e histórico limpo.',
      ],
      example: 'Pedro tem R$ 5.000 no rotativo (20% a.m.) e R$ 5.000 em CDB a 1% a.m. Saldo: zero aparente. Realidade: paga R$ 1.000/mês em juros de cartão, recebe R$ 50/mês no CDB. Resultado: -R$ 950/mês. Usando o CDB para quitar o rotativo: economiza R$ 950/mês. Em 12 meses: R$ 11.400 a mais.',
      quiz: [
        {
          q: 'Qual modalidade de crédito tem a maior taxa média no mercado brasileiro?',
          options: ['Crédito consignado', 'Financiamento imobiliário', 'Rotativo do cartão de crédito (15-25% a.m.)', 'Empréstimo pessoal em banco tradicional'],
          correct: 2,
          explanation: 'O rotativo do cartão tem as maiores taxas do sistema financeiro brasileiro — historicamente entre 200-300% ao ano (15-25% ao mês). É matematicamente a pior forma de crédito disponível.',
        },
        {
          q: 'Em qual cenário o crédito é genuinamente uma ferramenta de crescimento?',
          options: ['Comprar roupas parceladas em 10x sem juros porque o dinheiro está no CDB', 'Financiamento a 24% a.a. para veículo que deprecia 20%/ano', 'Crédito para capital de giro de negócio que gera 40% de retorno anual, com taxa de 15% a.a.', 'Parcelar qualquer compra para não gastar o dinheiro de uma vez'],
          correct: 2,
          explanation: 'A única lógica saudável para crédito como ferramenta: a taxa do crédito deve ser menor que o retorno gerado com o capital. 15% a.a. de custo vs. 40% de retorno = alavancagem positiva. 24% a.a. vs. -20% de depreciação = destruição de valor.',
        },
        {
          q: 'O que mais impacta positivamente o score de crédito no curto prazo?',
          options: ['Contratar mais linhas de crédito de uma vez', 'Pagar todas as contas em dia, consistentemente', 'Aumentar o limite do cartão de crédito', 'Ter conta em banco público'],
          correct: 1,
          explanation: 'O fator mais ponderado nos modelos de score é o histórico de pagamento. Pagar em dia, mês após mês, é o caminho mais consistente para construir e recuperar score.',
        },
      ],
      tags: ['juros', 'crédito', 'rotativo', 'score', 'dívida'],
    },
    {
      id: 't4l2',
      title: 'Portabilidade de crédito: a arma mais subutilizada',
      duration: '5 min',
      xp: 50,
      icon: '🔄',
      intro: 'Portabilidade de crédito é o direito de transferir sua dívida de um banco para outro com taxa menor — sem custos e sem burocracia excessiva. É regulamentada pelo Banco Central e pouco usada por falta de conhecimento.',
      points: [
        '**Como funciona.** Você solicita ao banco destino que assuma sua dívida do banco origem com taxa menor. O banco destino paga o banco origem. Você passa a pagar ao banco destino. Prazo, valor e data de pagamento ficam iguais ou melhores.',
        '**Onde é mais impactante.** Crédito consignado: portabilidade para taxa menor (de 2% para 1,5% a.m.) em 48 parcelas restantes de R$ 1.500 = economia de ~R$ 3.200. Financiamento imobiliário: de 11% para 9% a.a. em saldo de R$ 200.000 = economia de R$ 25.000+ ao longo do prazo.',
        '**Pré-requisito essencial.** Score bom (700+). Renda comprovável. Sem restrição nos bureaus. Dívida ativa (não renegociada recentemente). O banco destino também "vende" — ele quer seu negócio, então negocie.',
        '**O processo na prática.** Acesse o app do banco onde quer levar a dívida. Informe os dados da dívida atual (banco, contrato, saldo). Receba a proposta. Compare CET (Custo Efetivo Total) — não só a taxa nominal. Aceite se vantajoso. O banco cuida do restante.',
        '**Cuidados.** Compare o CET total, não só a parcela. Portabilidade com prazo muito maior pode ter parcela menor mas CET total maior. Verifique se não há penalidades no contrato original (financiamento imobiliário pode ter).',
      ],
      example: 'Consignado: R$ 800/mês, 36 meses restantes, taxa 2,1%/mês. Portabilidade para 1,6%/mês: parcela cai para ~R$ 755. Economia: R$ 45/mês × 36 = R$ 1.620. Mais: o CET total cai de R$ 28.800 para R$ 27.180. R$ 1.620 recuperados sem nenhum esforço — só uma ligação.',
      quiz: [
        {
          q: 'O que é portabilidade de crédito?',
          options: ['Transferir o limite do cartão entre bancos', 'Direito regulamentado pelo BC de transferir uma dívida para outro banco com taxa menor, sem custo para o devedor', 'Mudar a data de vencimento de uma parcela', 'Negociar desconto para pagamento à vista'],
          correct: 1,
          explanation: 'Portabilidade é um direito do consumidor estabelecido pelo Banco Central. Qualquer pessoa com dívida ativa pode solicitar a outro banco que assuma a dívida com taxa mais baixa.',
        },
        {
          q: 'Qual métrica deve ser comparada — não apenas a taxa nominal — ao avaliar uma proposta de portabilidade?',
          options: ['O valor da parcela', 'O nome do banco destino', 'O CET (Custo Efetivo Total) — que inclui taxa + IOF + seguros + tarifas', 'O prazo total'],
          correct: 2,
          explanation: 'Uma parcela menor com prazo muito maior pode ter CET total superior. O CET consolida todos os custos em uma taxa única anual e é o número correto para comparar.',
        },
        {
          q: 'Em qual tipo de dívida a portabilidade tem o maior impacto em valor absoluto?',
          options: ['Dívida de cartão de crédito', 'Cheque especial', 'Financiamento imobiliário (saldos altos + prazos longos amplificam qualquer redução de taxa)', 'Crédito pessoal de curto prazo'],
          correct: 2,
          explanation: 'Quanto maior o saldo e o prazo, maior o impacto de cada ponto percentual de redução. Reduzir 2% a.a. em um financiamento imobiliário de R$ 300.000 em 20 anos economiza R$ 60.000+ no CET total.',
        },
      ],
      tags: ['portabilidade', 'crédito', 'dívida', 'CET', 'banco central'],
    },
    {
      id: 't4l3',
      title: 'Estratégia para sair do vermelho',
      duration: '7 min',
      xp: 55,
      icon: '🧗',
      intro: 'Ter dívidas não é derrota moral — é um estado financeiro que pode ser revertido com método. Quem tenta sair do vermelho sem estratégia geralmente piora a situação.',
      points: [
        '**Diagnóstico primeiro.** Liste todas as dívidas: credor, saldo devedor, taxa de juros, parcela mínima. Isso é o mapa. Sem mapa, você está perdido. Muitas pessoas evitam esse momento por ansiedade — mas a ignorância é mais cara que o desconforto.',
        '**Dois métodos comprovados.** Avalanche (matemático): pague o mínimo em todas e concentre o extra na de maior taxa. Economiza mais dinheiro. Bola de neve (psicológico): pague o mínimo em todas e concentre o extra na de menor saldo. Gera vitórias rápidas que mantêm a motivação.',
        '**Avalanche na prática.** Rotativo 20%/mês: concentre aqui todo o recurso extra. Financiamento 1,5%/mês: pague só o mínimo. Quando quitar o rotativo, o valor da parcela inteira vai para o financiamento. A matemática favorece quem elimina as taxas mais altas primeiro.',
        '**Renegociação pró-ativa.** Ligar antes de atrasar é sempre melhor que ligar depois. Credores oferecem descontos maiores (30-60% em juros) quando percebem risco de default do que quando a dívida já está em cobrança. Se já atrasou: Serasa Limpa Nome e Feirão Limpa Nome são recursos legítimos.',
        '**A cilada do consolidador de dívidas.** Emprestar de C para pagar A e B faz sentido se — e somente se — a taxa de C é menor que A e B. "Empréstimo para quitar dívidas" com taxa de 8%/mês para quitar cartão de 20%/mês é uma melhora real. Mas tomar empréstimo caro para ter sensação de organização é piorar o problema.',
      ],
      example: 'Dívidas: Cartão rotativo R$ 3.000 (20%/mês), Empréstimo pessoal R$ 8.000 (3%/mês), Parcela carro R$ 12.000 (1,5%/mês). Extra disponível: R$ 500/mês. Método Avalanche: todo o extra vai para o rotativo. Quitado em ~7 meses. Os R$ 500 + parcela do rotativo (~R$ 800) vão para o empréstimo. Total de juros pagos: ~R$ 8.200. Bola de neve: começa pelo menor saldo (rotativo) — mesmo resultado neste caso. No geral, avalanche economiza mais.',
      quiz: [
        {
          q: 'No método Avalanche, qual dívida recebe o recurso extra?',
          options: ['A de menor saldo', 'A de maior saldo', 'A de maior taxa de juros', 'A que foi contraída primeiro'],
          correct: 2,
          explanation: 'Avalanche = atacar a taxa mais alta primeiro. Matematicamente, isso minimiza o total de juros pagos. A dívida mais cara cresce mais rápido — eliminá-la primeiro é a decisão de maior retorno.',
        },
        {
          q: 'Por que ligar para renegociar antes de atrasar é melhor do que depois?',
          options: ['Porque o juros ainda não começaram', 'Porque credores oferecem descontos maiores para evitar o default do que para recuperar crédito já inadimplente', 'Porque o Serasa só registra após 90 dias de atraso', 'Porque as parcelas são menores no início'],
          correct: 1,
          explanation: 'Credores têm custo alto para recuperar crédito inadimplente (jurídico, cobrança, provisão). Uma renegociação preventiva é mais barata para eles — logo, melhores condições para você.',
        },
        {
          q: 'Quando consolidar dívidas em um único empréstimo faz sentido?',
          options: ['Sempre — simplifica o controle', 'Nunca — é sempre um sinal de má gestão', 'Quando a taxa do empréstimo consolidador é significativamente menor que a média das dívidas sendo quitadas', 'Apenas se o prazo for menor que o das dívidas originais'],
          correct: 2,
          explanation: 'Consolidação é uma operação financeira neutra. Faz sentido se e somente se reduz o custo total. Empréstimo a 3%/mês para quitar cartão a 20%/mês: ganho real. Empréstimo a 8%/mês para "organizar" dívidas a 6%/mês: perda real.',
        },
      ],
      tags: ['dívida', 'avalanche', 'bola de neve', 'renegociação', 'inadimplência'],
    },
    {
      id: 't4l4',
      title: 'Cartão de crédito: arma ou armadilha?',
      duration: '5 min',
      xp: 50,
      icon: '🃏',
      intro: 'O cartão de crédito é a ferramenta financeira mais mal compreendida do Brasil. Usado corretamente, é um float gratuito de 30-40 dias, gera cashback e pontos. Usado incorretamente, é o crédito mais caro do sistema.',
      points: [
        '**O float gratuito.** Se você compra R$ 3.000 no dia 1 e a fatura fecha dia 10 com vencimento dia 30, você usa o dinheiro do banco por 29 dias. Enquanto isso, seu dinheiro está rendendo no Tesouro Selic. Para quem paga fatura integral: custo zero, benefício real.',
        '**Benefícios reais (quando bem escolhidos).** Cashback de 1-3% em todas as compras. Programas de pontos para passagens aéreas. Salas VIP em aeroportos. Seguros de viagem e compra. Proteção de preço e garantia estendida. Esses benefícios têm valor real — só se você paga a fatura toda.',
        '**A armadilha do mínimo.** Pagar o mínimo da fatura é entrar no rotativo. R$ 2.000 de fatura com pagamento mínimo de R$ 80 (4%): o restante R$ 1.920 vai para o rotativo a 20%/mês. No mês seguinte, a dívida é R$ 2.304. Isso é uma espiral impossível de escalar.',
        '**Controle: limite vs. disponível.** O limite do cartão não é renda. Muitas pessoas tratam como extensão do salário. O controle correto: use o cartão como método de pagamento (não como crédito), registre cada compra no Sibanki, pague a fatura integral sempre.',
        '**Quando cortar o cartão.** Se você não consegue pagar a fatura integralmente por 2+ meses seguidos, o cartão de crédito não é adequado para o seu momento atual. Não é vergonha — é lucidez. Use débito ou PIX até reconstruir a estabilidade.',
      ],
      example: 'Ana compra R$ 1.500/mês no cartão e sempre paga integralmente. Cashback de 1,5%: R$ 22,50/mês = R$ 270/ano. Seguro de viagem: evitou contratar seguro de R$ 350 em uma viagem. Pontos: R$ 800 em passagem aérea em 18 meses. Custo: zero. Benefício total no ano: ~R$ 1.420. O cartão trabalhou para ela — não contra.',
      quiz: [
        {
          q: 'O "float gratuito" do cartão de crédito refere-se a:',
          options: ['O limite não usado que fica disponível', 'Usar o dinheiro do banco por 25-40 dias sem custo enquanto o seu próprio dinheiro rende em outro investimento', 'A taxa zero de algumas transferências', 'O período de carência antes de cobrança de anuidade'],
          correct: 1,
          explanation: 'Quem paga a fatura integralmente nunca paga juros ao banco. Enquanto isso, o dinheiro que seria usado para as compras pode render no Tesouro Selic ou CDB pelo período entre a compra e o vencimento da fatura.',
        },
        {
          q: 'O que acontece quando você paga apenas o mínimo da fatura do cartão?',
          options: ['Paga os juros e quita gradualmente a dívida', 'O restante entra no rotativo — a taxa mais alta do sistema financeiro — e a dívida pode crescer exponencialmente', 'Seu score de crédito melhora por mostrar pagamento', 'O banco entra em contato para negociação'],
          correct: 1,
          explanation: 'Pagar o mínimo é entrar no rotativo. R$ 2.000 com pagamento mínimo de 4% (R$ 80) deixa R$ 1.920 em rotativo a ~20%/mês. Em 6 meses, a dívida pode ser maior do que a compra original.',
        },
        {
          q: 'Quando é recomendado parar de usar cartão de crédito temporariamente?',
          options: ['Quando a taxa de juros subir', 'Quando não conseguir pagar a fatura integralmente por 2+ meses consecutivos — é sinal de que o cartão está servindo como crédito, não como ferramenta de pagamento', 'Quando mudar de banco', 'Quando o cashback cair abaixo de 1%'],
          correct: 1,
          explanation: 'O cartão de crédito só funciona a favor do usuário quando a fatura é paga integralmente. Se você não consegue pagar o total, o cartão virou uma linha de crédito cara. Usar débito temporariamente não é derrota — é estratégia.',
        },
      ],
      tags: ['cartão de crédito', 'rotativo', 'cashback', 'pontos', 'fatura'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TRILHA 5 — Longo Prazo e Liberdade
// ─────────────────────────────────────────────────────────────────────────────

const trail5: Trail = {
  id: 't5',
  title: 'Longo Prazo e Liberdade',
  description: 'FIRE, IR sobre investimentos, proteção patrimonial e independência financeira.',
  icon: '🔥',
  color: 'bg-rose-500/10',
  textColor: 'text-rose-400',
  level: 'avançado',
  totalXp: 240,
  lessons: [
    {
      id: 't5l1',
      title: 'FIRE: o movimento de independência financeira',
      duration: '7 min',
      xp: 60,
      icon: '🏄',
      intro: 'FIRE (Financial Independence, Retire Early) é um framework para alcançar independência financeira antes da aposentadoria tradicional. A matemática é simples — a disciplina é o desafio.',
      points: [
        '**A regra dos 25x (ou 4%).** Para ser financeiramente independente, você precisa de um patrimônio de 25 vezes seus gastos anuais. Com R$ 5.000/mês de gastos (R$ 60.000/ano), o alvo é R$ 1.500.000. A lógica: investindo o patrimônio em carteira diversificada com 7% real de retorno e retirando 4%/ano (R$ 60.000), o patrimônio não se esgota historicamente.',
        '**Variações do FIRE.** Fat FIRE: patrimônio maior que 25x para vida mais confortável (30-40x). Lean FIRE: patrimônio menor com estilo de vida mais frugal. Barista FIRE: alcança metade da independência, reduz horas de trabalho para cobrir a outra metade. Coast FIRE: investiu o suficiente para que os juros compostos levem ao FIRE sem novos aportes.',
        '**A taxa de poupança é o principal acelerador.** Quem poupa 10% da renda precisa de ~40 anos para FIRE. Quem poupa 25%: ~32 anos. 50%: ~17 anos. 75%: ~7 anos. Aumentar a taxa de poupança tem impacto exponencial, não linear.',
        '**Número FIRE no Sibanki.** O módulo de Crescimento calcula seu progresso FIRE: patrimônio atual ÷ (gastos mensais × 300) × 100%. Com R$ 200.000 investidos e R$ 5.000/mês de gastos: 200.000 / 1.500.000 = 13,3% do caminho.',
        '**FIRE não exige perfeição.** Você não precisa cortar tudo e viver como monge. Precisa aumentar sua taxa de poupança ao ponto de que os juros compostos trabalhem mais rápido do que seus gastos. A maioria consegue 30-40% de taxa com ajustes moderados de estilo de vida.',
      ],
      example: 'Renda R$ 10.000/mês. Gastos atuais R$ 8.000/mês. Poupança: R$ 2.000/mês (20%). FIRE a 25x: R$ 2.400.000. Tempo estimado: 37 anos. Reduzindo gastos para R$ 6.000/mês (poupança R$ 4.000/mês, 40%): 22 anos. Reduzindo para R$ 5.000/mês (50%): 15 anos. A diferença de 15 anos de liberdade vem de R$ 3.000/mês a menos em gastos.',
      quiz: [
        {
          q: 'Qual é a lógica da "regra dos 25x" para calcular o patrimônio FIRE?',
          options: ['Você precisa de 25 anos de salário guardado', 'Patrimônio de 25x os gastos anuais permite retirada de 4%/ano sem esgotamento histórico do patrimônio', 'Você deve ter 25 fontes de renda diferentes', 'O patrimônio deve crescer 25% ao ano'],
          correct: 1,
          explanation: 'A regra do 4% (pesquisa Trinity, 1998) mostrou que carteiras diversificadas suportam saques de 4%/ano por 30+ anos em cenários históricos. 1/0,04 = 25. Portanto, patrimônio = gastos anuais × 25.',
        },
        {
          q: 'O que é "Coast FIRE"?',
          options: ['FIRE alcançado na praia', 'Estado em que você investiu o suficiente para que os juros compostos, sem novos aportes, cheguem ao patrimônio FIRE no prazo desejado', 'FIRE com patrimônio abaixo do necessário para cobrir todos os gastos', 'Uma variação de FIRE para aposentadoria no litoral'],
          correct: 1,
          explanation: 'Em Coast FIRE, você pode parar de investir (ou investir menos) porque o juro composto "cruza para a outra margem" sozinho. Ex.: R$ 300.000 aos 35 anos, crescendo a 7% real, virarão R$ 1.200.000 em 25 anos — sem um real a mais.',
        },
        {
          q: 'Qual variável tem maior impacto no tempo para alcançar o FIRE?',
          options: ['A taxa de retorno dos investimentos', 'A taxa de poupança (percentual da renda poupado/investido)', 'O valor absoluto da renda', 'A diversificação da carteira'],
          correct: 1,
          explanation: 'A taxa de poupança impacta simultaneamente dois fatores: aumenta os aportes (mais patrimônio acumulado) E reduz o patrimônio necessário (gastos menores = menor alvo de 25x). Renda maior sem aumento de poupança muda pouco o prazo.',
        },
      ],
      tags: ['FIRE', 'independência financeira', 'aposentadoria', 'patrimônio'],
    },
    {
      id: 't5l2',
      title: 'IR sobre investimentos: como funciona e como otimizar',
      duration: '6 min',
      xp: 60,
      icon: '📋',
      intro: 'Imposto de Renda sobre investimentos não é opcional. Mas há diferenças significativas de alíquota e isenção entre produtos — e ignorá-las pode custar 15-20% dos ganhos desnecessariamente.',
      points: [
        '**Tabela regressiva de IR (renda fixa e fundos).** Até 180 dias: 22,5%. De 181 a 360 dias: 20%. De 361 a 720 dias: 17,5%. Acima de 720 dias: 15%. A regra: quanto mais tempo você fica investido, menor o IR. Para maximizar, planeje resgates para após 720 dias sempre que possível.',
        '**Ações: 15% sobre o ganho de capital.** Só paga IR se vender com lucro. Até R$ 20.000/mês em vendas de ações: isento. Acima de R$ 20.000/mês: 15% sobre o lucro. FIIs: 20% sobre ganho de capital na venda. Day trade: 20% sobre o lucro sempre, sem isenção.',
        '**Isentos de IR para PF.** LCI, LCA, CRI, CRA, Debêntures incentivadas. Proventos mensais de FIIs. Dividendos de ações (atualmente). Poupança. A isenção justifica aceitar taxa menor — calcule o equivalente bruto antes de comparar.',
        '**Declaração de ajuste anual.** Ganhos de capital em ações acima da isenção mensal devem ser apurados e pagos via DARF até o último dia útil do mês seguinte à venda. Não espere o IRPF para regularizar — gera multa de 0,33%/dia.',
        '**Compensação de perdas.** Prejuízo em ações pode ser compensado com lucros futuros do mesmo mercado. Perdeu R$ 3.000 em PETR4 em março? Quando ganhar R$ 5.000 em ITUB4 em agosto, paga IR só sobre R$ 2.000. Mantenha o controle no GCAP (ferramenta gratuita da Receita Federal).',
      ],
      example: 'R$ 50.000 em CDB: mantido por 180 dias (22,5% IR) vs. 730 dias (15% IR). Lucro bruto de 12% em ambos = R$ 6.000. IR 180 dias: R$ 1.350. IR 730 dias: R$ 900. Diferença: R$ 450. Mais: se fosse LCI a 10% (isento): R$ 5.000 líquidos vs. R$ 4.650 do CDB 12% em 180 dias. A LCI ganhou mesmo com taxa menor.',
      quiz: [
        {
          q: 'Qual alíquota de IR se aplica a um CDB resgatado após 730 dias?',
          options: ['22,5%', '20%', '17,5%', '15%'],
          correct: 3,
          explanation: 'A tabela regressiva de IR favorece quem investe por mais tempo. Acima de 720 dias, a alíquota é 15% — a menor da tabela. O tempo de permanência é a principal variável de otimização fiscal em renda fixa.',
        },
        {
          q: 'Um investidor em ações que vendeu R$ 15.000 em um único mês e teve lucro deve pagar IR?',
          options: ['Sim — qualquer lucro em ações é tributado', 'Não — vendas abaixo de R$ 20.000/mês em ações têm isenção de IR sobre o ganho de capital', 'Sim, mas com alíquota reduzida de 7,5%', 'Apenas se declarar no IRPF anual'],
          correct: 1,
          explanation: 'A lei prevê isenção de IR para ganhos de capital em vendas de ações até R$ 20.000/mês. Acima desse limite, incide 15% sobre o lucro e deve ser recolhido via DARF no mês seguinte.',
        },
        {
          q: 'O que é compensação de perdas em ações e por que é importante registrar?',
          options: ['O banco credita automaticamente perdas no IR', 'Prejuízos realizados em ações podem ser abatidos de lucros futuros no mesmo mercado, reduzindo o IR a pagar — mas só se o contribuinte mantiver o controle e declarar corretamente', 'Só funciona para day trade', 'A Receita Federal calcula automaticamente'],
          correct: 1,
          explanation: 'A compensação de perdas é um direito do contribuinte — mas não é automática. Você precisa manter o controle mensal (GCAP) e declarar corretamente. Ignorar isso significa pagar IR sobre lucro que já teve parte compensada por perda anterior.',
        },
      ],
      tags: ['imposto de renda', 'IR', 'DARF', 'isenção', 'otimização fiscal'],
    },
    {
      id: 't5l3',
      title: 'Proteção patrimonial: seguros que realmente valem',
      duration: '5 min',
      xp: 60,
      icon: '🛡️',
      intro: 'Seguros são instrumentos para transferir riscos que você não pode absorver. A maioria das pessoas contrata seguros que não precisam e não tem os que precisam. A pergunta é sempre: qual perda eu não conseguiria absorver?',
      points: [
        '**O critério correto.** Seguro vale a pena quando: a perda seria catastrófica para seu patrimônio ou renda, a probabilidade é baixa mas o impacto é irreversível, e o prêmio é proporcional ao risco. Não assegure o que é facilmente recuperável com a sua reserva.',
        '**Seguro de vida: para quem é essencial.** Se você tem dependentes financeiros (filhos, cônjuge sem renda, pais idosos) e não tem patrimônio suficiente para sustentá-los sem sua renda. Regra de ouro: cobertura de 5 a 10 vezes a renda anual. Para quem não tem dependentes: raramente necessário.',
        '**Plano de saúde: o seguro que mais vale.** Internação cirúrgica de emergência no Brasil pode custar R$ 50.000-300.000 sem convênio. Para a maioria das pessoas, essa é a perda mais provável e mais catastrófica. Mesmo planos intermediários (R$ 500-800/mês) justificam-se matematicamente.',
        '**Seguro do imóvel: obrigatório e barato.** Seguro contra incêndio é obrigatório no financiamento. Mas adicionar cobertura contra danos elétricos, alagamentos e responsabilidade civil por ~R$ 30-80/mês é risco assimétrico: você paga pouco para cobrir muito.',
        '**O que raramente vale.** Seguro de assistência 24h de cartão (para quem tem reserva de emergência). Seguros de celular de operadora (geralmente R$ 50-80/mês por um celular de R$ 800). Seguro prestamista em crédito (protege o banco, não você — leia o contrato).',
      ],
      example: 'Família com 2 filhos, renda do provedor R$ 8.000/mês, sem patrimônio significativo. Cenário sem seguro de vida: provedor falece, família perde renda, sem reserva para manter padrão de vida. Seguro de vida por R$ 150/mês com cobertura de R$ 800.000 (8 anos de renda): família mantém estabilidade por 8+ anos enquanto se reorganiza. Custo real: R$ 1.800/ano para proteger R$ 800.000.',
      quiz: [
        {
          q: 'Qual é o critério fundamental para decidir se um seguro vale a pena?',
          options: ['Se é oferecido pelo banco onde você tem conta', 'Se a perda potencial seria catastrófica para seu patrimônio ou renda e você não conseguiria absorvê-la com a reserva', 'Se o prêmio é inferior a 1% da renda', 'Se coberto por cartão de crédito com benefícios'],
          correct: 1,
          explanation: 'Seguro é para riscos que você NÃO pode absorver. Se o celular quebrar e você tem R$ 2.000 na reserva, o seguro é desnecessário. Se sua casa pegar fogo e você não tem R$ 300.000 para reconstruí-la, o seguro é essencial.',
        },
        {
          q: 'Para quem o seguro de vida é genuinamente essencial?',
          options: ['Para qualquer pessoa acima de 30 anos', 'Para quem tem dependentes financeiros sem patrimônio suficiente para sustentá-los sem a renda do segurado', 'Para quem tem financiamento imobiliário', 'Para investidores com carteira acima de R$ 100.000'],
          correct: 1,
          explanation: 'O seguro de vida substitui a renda do segurado para quem depende dela. Se você não tem dependentes (filhos, cônjuge sem renda) ou tem patrimônio que os sustentaria, o seguro de vida tem menor prioridade. Jovens solteiros raramente precisam.',
        },
        {
          q: 'Por que o "seguro prestamista" embutido em contratos de crédito frequentemente não é vantajoso para o consumidor?',
          options: ['Porque não cobre doenças graves', 'Porque protege primariamente o credor (banco/financeira) — garante o pagamento da dívida em caso de morte/invalidez, mas não necessariamente beneficia a família do devedor', 'Porque só funciona acima de R$ 50.000 de dívida', 'Porque é ilegal em alguns estados'],
          correct: 1,
          explanation: 'O seguro prestamista quita a dívida em caso de sinistro — mas o beneficiário é o banco, não sua família. Em caso de morte, sua família perde a dívida mas não recebe capital para viver. Um seguro de vida próprio oferece capital para sua família usar como quiser.',
        },
      ],
      tags: ['seguros', 'seguro de vida', 'plano de saúde', 'proteção patrimonial'],
    },
    {
      id: 't5l4',
      title: 'Planejamento para imprevistos: antecipando o inevitável',
      duration: '5 min',
      xp: 60,
      icon: '🗺️',
      intro: 'Imprevistos são, por definição, inesperados. Mas as categorias de imprevisto são previsíveis: saúde, emprego, carro, eletrodomésticos, família. Quem planeja para essas categorias nunca é verdadeiramente pego de surpresa.',
      points: [
        '**A armadilha semântica.** "Imprevisto" não significa "sem previsão". Carros quebram. Eletrodomésticos param. Médicos são necessários. Empregos são perdidos. A pergunta não é "se vai acontecer" mas "quando, quanto vai custar e como vou pagar".',
        '**Fundos específicos além da reserva.** A reserva de emergência cobre sobrevivência básica por 3-6 meses. Mas criar sub-reservas específicas reduz o impacto psicológico: Fundo Carro (R$ 200/mês para manutenção/troca). Fundo Casa (R$ 150/mês para reparos). Fundo Saúde (R$ 100/mês para franquias, dentista, ótica).',
        '**A fórmula do custo anual esperado.** Estimar o custo médio de cada categoria de imprevisto × probabilidade anual. Carro: manutenção R$ 2.000/ano → R$ 167/mês. Casa: R$ 1.500/ano (média) → R$ 125/mês. Quando o "imprevisto" acontece, você já tem o dinheiro.',
        '**Saúde financeira da família extensa.** Em muitas famílias brasileiras, os filhos adultos com renda são o "seguro" dos pais. Isso é lindo em termos de solidariedade, mas requer planejamento. Quanto pode ser necessário? Em qual prazo? Existem alternativas (plano de saúde dos pais, pensão, INSS)?',
        '**Planejamento de transição de carreira.** Demissão, pedido de demissão, doença, maternidade/paternidade. Cada um tem custos e prazos diferentes. Saber quanto você precisa para uma transição confortável de 6 meses muda como você se prepara (e dá coragem para mudar quando necessário).',
      ],
      example: 'Lucas tem carro financiado, casa própria, filho de 3 anos. Imprevistos previsíveis/ano: manutenção carro R$ 1.800, saúde R$ 2.400, reparos casa R$ 1.200, escola/pediatra R$ 800. Total: R$ 6.200/ano = R$ 517/mês. Com R$ 517/mês separado em conta específica, nenhum desses "imprevistos" é realmente uma emergência — são custos previstos e provisionados.',
      quiz: [
        {
          q: 'Qual é a diferença entre reserva de emergência e fundos específicos para imprevistos?',
          options: ['Não há diferença — são a mesma coisa com nomes diferentes', 'A reserva de emergência cobre sobrevivência básica em crises maiores (perda de renda). Fundos específicos cobrem custos previsíveis em categorias conhecidas (carro, casa, saúde) sem afetar a reserva', 'Fundos específicos rendem mais que a reserva', 'A reserva de emergência é para valores acima de R$ 10.000'],
          correct: 1,
          explanation: 'Usar a reserva de emergência para consertar o carro é um erro conceitual. O carro vai quebrar — é previsível. Usar a reserva para isso pode deixá-la insuficiente para emergências reais (desemprego, doença grave). Fundos específicos preservam a integridade da reserva.',
        },
        {
          q: 'Como a "fórmula do custo anual esperado" ajuda no planejamento?',
          options: ['Define quanto você deve guardar para aposentadoria', 'Transforma custos "imprevistos" em provisões mensais previsíveis — dividindo o custo médio anual por 12, você sabe exatamente quanto separar por mês para cada categoria', 'Calcula o IR anual sobre investimentos', 'Determina o tamanho ideal da reserva de emergência'],
          correct: 1,
          explanation: 'Se manutenção de carro custa em média R$ 2.000/ano, separar R$ 167/mês transforma a revisão de R$ 2.000 de "emergência estressante" para "custo provisionado esperado". A psicologia muda. O planejamento muda. O estresse desaparece.',
        },
        {
          q: 'Por que planejar explicitamente para transições de carreira é importante?',
          options: ['Para não pagar FGTS ao empregador', 'Porque saber que você tem 6 meses de reserva para uma transição confortável muda a equação de risco — dá coragem para mudar quando necessário, sem desespero financeiro', 'Porque o seguro-desemprego cobre todos os cenários', 'Para ter documentação para o sindicato'],
          correct: 1,
          explanation: 'Muitas pessoas ficam em situações profissionais ruins por medo financeiro. Ter um "fundo de liberdade" — recursos suficientes para uma transição de 6 meses — muda fundamentalmente o poder de escolha e negociação.',
        },
      ],
      tags: ['planejamento', 'imprevistos', 'fundo de emergência', 'transição'],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exportação
// ─────────────────────────────────────────────────────────────────────────────

export const TRAILS: Trail[] = [trail1, trail2, trail3, trail4, trail5];

export const ALL_LESSONS: Lesson[] = TRAILS.flatMap((t) => t.lessons);

export const TOTAL_XP = TRAILS.reduce((sum, t) => sum + t.totalXp, 0);

/** Encontra trilha e lição por ID de lição */
export function findLesson(lessonId: string): { trail: Trail; lesson: Lesson } | null {
  for (const trail of TRAILS) {
    const lesson = trail.lessons.find((l) => l.id === lessonId);
    if (lesson) return { trail, lesson };
  }
  return null;
}

// Glossário financeiro
export interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'sibanki' | 'investimentos' | 'crédito' | 'geral';
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Ld (Dias de Liberdade)', definition: 'Patrimônio Líquido ÷ Burn Rate Diário. Mede quantos dias você consegue manter seu padrão de vida sem nova renda.', category: 'sibanki' },
  { term: 'Sg (Spread Gap)', definition: 'Taxa média de investimentos menos taxa média de dívidas. Positivo = você ganha dos juros. Negativo = as dívidas te custam mais do que seus ativos rendem.', category: 'sibanki' },
  { term: 'Sv (Sovereignty Score)', definition: 'Score 0-100 por transação. Mede se o gasto aumenta (≥80) ou diminui (≤39) sua soberania financeira, considerando categoria, forma de pagamento e contexto.', category: 'sibanki' },
  { term: 'Burn Rate', definition: 'Taxa de consumo — quanto você gasta por dia/mês em média. Calculado com base nos últimos 90 dias de despesas.', category: 'sibanki' },
  { term: 'CDI', definition: 'Certificado de Depósito Interbancário. Taxa de referência para investimentos de renda fixa. Muito próxima da Selic. CDB de 100% CDI rende o mesmo que a taxa CDI.', category: 'investimentos' },
  { term: 'Selic', definition: 'Taxa básica de juros da economia brasileira. Definida pelo Copom (Banco Central). Influencia todas as taxas de crédito e investimentos.', category: 'investimentos' },
  { term: 'IPCA', definition: 'Índice de Preços ao Consumidor Amplo. A inflação oficial do Brasil. Tesouro IPCA+ garante rendimento real acima da inflação.', category: 'investimentos' },
  { term: 'FGC', definition: 'Fundo Garantidor de Créditos. Garante até R$ 250.000 por CPF por instituição financeira em CDBs, LCIs e contas correntes em caso de falência do banco.', category: 'investimentos' },
  { term: 'CET (Custo Efetivo Total)', definition: 'Taxa que inclui juros + IOF + seguros + tarifas de uma operação de crédito. É o número correto para comparar propostas de crédito, não a taxa nominal.', category: 'crédito' },
  { term: 'P/L (Preço/Lucro)', definition: 'Quantas vezes o preço de uma ação representa seu lucro anual. P/L de 10 = você paga 10 anos de lucro para ser sócio. Usado para avaliar se uma ação está cara ou barata.', category: 'investimentos' },
  { term: 'DY (Dividend Yield)', definition: 'Rendimento anual em dividendos dividido pelo preço atual. DY de 8% = R$ 80/ano para cada R$ 1.000 investidos. Métrica central para investidores de renda.', category: 'investimentos' },
  { term: 'P/VP (Preço/Valor Patrimonial)', definition: 'Compara o preço de mercado com o patrimônio contábil por ação. P/VP < 1 pode indicar ação negociada com desconto sobre o valor dos ativos.', category: 'investimentos' },
  { term: 'ETF', definition: 'Exchange Traded Fund. Fundo que replica um índice (como o Ibovespa) e é negociado na bolsa como uma ação. BOVA11, IVVB11, SMAL11 são exemplos.', category: 'investimentos' },
  { term: 'FII', definition: 'Fundo de Investimento Imobiliário. Você investe em imóveis (lajes, galpões, shoppings) sem comprá-los. Distribui proventos mensais isentos de IR para PF.', category: 'investimentos' },
  { term: 'Graham (Preço Justo)', definition: 'Fórmula: √(22,5 × LPA × VPA). Calcula o preço teórico justo de uma ação baseado em lucro e patrimônio. Abaixo do Graham = potencial desconto.', category: 'investimentos' },
  { term: 'Bazin (Teto)', definition: 'Preço máximo a pagar por uma ação baseado no dividendo: DY Anual ÷ 0,06. Abaixo do teto = dividendo oferece pelo menos 6% de rendimento.', category: 'investimentos' },
  { term: 'FIRE', definition: 'Financial Independence, Retire Early. Framework de independência financeira. Alvo: 25x seus gastos anuais investidos (regra dos 4%).', category: 'geral' },
  { term: 'Portabilidade de crédito', definition: 'Direito regulamentado pelo Banco Central de transferir uma dívida para outra instituição com taxa menor, sem custo para o devedor.', category: 'crédito' },
  { term: 'Rotativo do cartão', definition: 'Taxa cobrada quando você não paga a fatura integralmente. Média de 15-25% ao mês — a taxa mais alta do sistema financeiro. Deve ser evitada a qualquer custo.', category: 'crédito' },
  { term: 'Tesouro Direto', definition: 'Plataforma do governo federal para venda de títulos públicos diretamente ao investidor. Tipos: Selic (liquidez), IPCA+ (proteção inflação), Prefixado (taxa garantida).', category: 'investimentos' },
];
