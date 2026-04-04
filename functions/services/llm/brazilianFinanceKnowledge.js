/**
 * Sibanki — Brazilian Finance Knowledge Base (RAG)
 *
 * Base de conhecimento estruturada para o sistema de Retrieval-Augmented Generation.
 * Cada chunk é um fragmento de conhecimento financeiro brasileiro, otimizado para
 * ser recuperado por palavras-chave e injetado no prompt do Consultor IA.
 *
 * ESTRUTURA:
 *   { id, keywords[], category, content }
 *
 * USO:
 *   const { retrieveRelevantChunks } = require('./brazilianFinanceKnowledge');
 *   const chunks = retrieveRelevantChunks(userQuestion, 3);
 *   // Injete em buildConsultantPrompt(context, question, chunks)
 */

const KNOWLEDGE_BASE = [

  // ─── CRÉDITO E DÍVIDAS ─────────────────────────────────────────────────────

  {
    id: 'rotativo-cartao',
    keywords: ['rotativo', 'cartão', 'fatura', 'mínimo', 'juros cartão', 'crédito rotativo'],
    category: 'credito',
    content: `ROTATIVO DO CARTÃO DE CRÉDITO — O Pior Produto Financeiro do Brasil
Taxa média: 14% a.m. = 337% a.a. (resolução CMN 4.549/2017 limitou a 100% da dívida, mas ainda é devastador).
Regra absoluta: NUNCA pague o mínimo. Pague SEMPRE o total.
Se não tem o valor total: crédito pessoal a 3-4% a.m. é infinitamente melhor que o rotativo.
Cálculo da dívida em 12 meses: R$ 1.000 no rotativo = R$ 4.370 (14% a.m. composto).
Prioridade máxima: quitar rotativo antes de qualquer investimento, inclusive poupança.`,
  },

  {
    id: 'cheque-especial',
    keywords: ['cheque especial', 'limite conta', 'banco', 'taxa conta'],
    category: 'credito',
    content: `CHEQUE ESPECIAL — A Armadilha Silenciosa
Taxa máxima legal (desde 2020): 8% a.m. = 151% a.a.
Muitos bancos cobram menos, mas qualquer uso deve ser emergencial e brevíssimo.
Estratégia: se o limite existe na conta, configure alertas para saldo baixo e NUNCA use por mais de 3 dias.
Custo de 30 dias no cheque especial: R$ 1.000 × 8% = R$ 80 — o mesmo que um seguro de vida mensal.`,
  },

  {
    id: 'portabilidade-credito',
    keywords: ['portabilidade', 'transferir dívida', 'refinanciar', 'dívida mais barata', 'taxa menor'],
    category: 'credito',
    content: `PORTABILIDADE DE CRÉDITO — Direito do Consumidor
Todo brasileiro pode transferir qualquer dívida para outro banco que ofereça taxa menor.
Lei: Resolução CMN 4.292/2013.
Funciona para: financiamentos, empréstimos pessoais, crédito consignado.
Como fazer: solicite ao banco novo (não ao banco atual) — eles processam a portabilidade.
Economia típica: trocar 5% a.m. por 2% a.m. em R$ 20.000 economiza R$ 600/mês.
Dica: bancos digitais (C6, Inter, Nubank) frequentemente oferecem taxas 30-50% menores que bancos tradicionais.`,
  },

  {
    id: 'credito-consignado',
    keywords: ['consignado', 'desconto em folha', 'aposentado', 'INSS', 'servidor público', 'empréstimo barato'],
    category: 'credito',
    content: `CRÉDITO CONSIGNADO — O Mais Barato do Mercado
Taxa: 1.5–2.5% a.m. (INSS: teto legal de 1.8% a.m. desde 2023).
Quem pode usar: aposentados INSS, servidores públicos, CLT com convênio.
Vantagem: desconto automático em folha reduz o risco para o banco → taxa menor.
Armadilha: facilidade de crédito incentiva superendividamento. Use apenas para quitar dívidas mais caras.
Regra de uso inteligente: use consignado para quitar rotativo (troca 14% a.m. por 1.8% a.m. = economia de 87%).`,
  },

  // ─── INVESTIMENTOS ─────────────────────────────────────────────────────────

  {
    id: 'poupanca-vs-cdb',
    keywords: ['poupança', 'CDB', 'rendimento', 'onde investir', 'guardar dinheiro', 'banco'],
    category: 'investimentos',
    content: `POUPANÇA vs. CDB LIQUIDEZ DIÁRIA — Não tem debate
Poupança: 70% do CDI quando Selic > 8.5% a.a. (regra de 2012). Atualmente ~8.5% a.a. bruto.
CDB liquidez diária (100% CDI): ~12% a.a. bruto, mesmo FGC, mesma liquidez, IR apenas sobre o rendimento.
Cálculo real: R$ 10.000 em 1 ano → Poupança: +R$ 850 | CDB 100% CDI: +R$ 1.020 após 15% IR = +R$ 867.
A diferença parece pequena, mas em R$ 100.000 ao longo de 10 anos, são R$ 20.000+ a mais no CDB.
Onde encontrar CDB liquidez diária: Nubank, PicPay, Inter, Rico, XP, BTG — todos com FGC.`,
  },

  {
    id: 'lci-lca',
    keywords: ['LCI', 'LCA', 'isento IR', 'investimento imobiliário', 'agronegócio', 'CRI', 'CRA'],
    category: 'investimentos',
    content: `LCI e LCA — Isenção de IR é o Diferencial
LCI (Letra de Crédito Imobiliário) e LCA (do Agronegócio): isentos de IR para pessoa física.
Equivalência com CDB: LCI a 90% CDI = CDB a ~105% CDI (considerando 15% de IR no CDB de longo prazo).
Prazo mínimo: 90 dias para LCI, 90 dias para LCA (desde 2023, prazo mínimo aumentou para 12 meses em alguns casos).
Risco: FGC cobre até R$ 250.000 por CPF por instituição (mesmo limite do CDB).
CRI e CRA: isenção de IR, mas sem FGC — risco maior, retornos maiores (110-130% CDI).
Estratégia: para reserva de emergência, prefira CDB liquidez diária. Para prazo > 1 ano, avalie LCI/LCA.`,
  },

  {
    id: 'tesouro-direto',
    keywords: ['tesouro', 'tesouro direto', 'tesouro selic', 'tesouro IPCA', 'título público', 'governo'],
    category: 'investimentos',
    content: `TESOURO DIRETO — O Investimento Mais Seguro do Brasil
Tesouro Selic (pós-fixado): acompanha a taxa Selic, liquidez D+1, ideal para reserva de emergência. Risco: mínimo.
Tesouro IPCA+ (híbrido): IPCA + juro real (~5-7% a.a.). Ideal para objetivos de 5+ anos. Risco de marcação a mercado se vender antes do vencimento.
Tesouro Prefixado: taxa fixada no momento da compra. Risco: se a Selic subir, o título perde valor antes do vencimento.
IR: tabela regressiva (22.5% a 15%, dependendo do prazo).
Taxa de custódia B3: 0.2% a.a. (isento até R$ 10.000 no Tesouro Selic).
Dica: nunca venda Tesouro IPCA+ antes do vencimento sem analisar o preço de mercado — pode ter perda.`,
  },

  {
    id: 'fundos-come-cotas',
    keywords: ['fundo', 'fundos de investimento', 'come cotas', 'taxa administração', 'fundo DI', 'multimercado'],
    category: 'investimentos',
    content: `FUNDOS DE INVESTIMENTO — Atenção ao Come-Cotas
Come-cotas: tributação semestral automática (maio e novembro) de 15% sobre rendimentos nos fundos de longo prazo, 20% nos de curto prazo.
Efeito: o come-cotas compulsório reduz o poder dos juros compostos ao longo do tempo.
Comparação: CDB de 1 ano sem come-cotas vs. fundo equivalente — o CDB tipicamente ganha pelo timing do IR.
Quando fundo vale a pena: fundos multimercado de gestores top (Verde, SPX, Kinea) podem superar CDB, mas com mais risco.
Fundos DI de banco tradicional: taxa de administração de 1-3% a.a. destrói o retorno. FUJA.
Regra: taxa de administração > 0.5% a.a. em fundo de renda fixa já é cara. Use ETF (IMAB11, IRFM11) como alternativa.`,
  },

  {
    id: 'fiis-investimento',
    keywords: ['FII', 'fundo imobiliário', 'aluguel', 'renda passiva', 'dividendos imóvel'],
    category: 'investimentos',
    content: `FUNDOS IMOBILIÁRIOS (FIIs) — Renda Passiva com Risco de Mercado
Dividendos: distribuição mínima de 95% do lucro semestral. Isentos de IR para PF (quando listados em bolsa).
Dividend yield médio histórico: 6-10% a.a. bruto sobre o preço da cota.
Risco: vacância (imóveis desocupados), inadimplência de locatários, flutuação do preço das cotas.
Tipos: Papel (CRI/CRA), Tijolo (imóveis físicos), Híbridos — cada um tem perfil de risco diferente.
Só invista em FIIs se: reserva de emergência está completa, horizonte > 3 anos, tolera flutuação de 20-30% no preço.
Estratégia: FIIs como complemento de renda passiva, não como reserva de emergência.`,
  },

  // ─── PLANEJAMENTO E ORÇAMENTO ──────────────────────────────────────────────

  {
    id: 'reserva-emergencia',
    keywords: ['reserva', 'emergência', 'guardar', 'segurança', 'fundo emergência', 'imprevisto'],
    category: 'planejamento',
    content: `RESERVA DE EMERGÊNCIA — O Alicerce de Tudo
Quanto guardar por perfil:
  • CLT (emprego estável): 3-4 meses de gastos
  • MEI/PJ/Freelancer: 6-8 meses (renda variável = mais risco)
  • Autônomo sem contrato: 8-12 meses
  • Com dependentes: adicione 2 meses ao base
Onde guardar: CDB liquidez diária ou Tesouro Selic — jamais poupança ou investimento de risco.
Por que é prioritária: sem reserva, qualquer imprevisto vira dívida cara (rotativo, empréstimo urgente).
Cálculo: gastos mensais × meses ideais = meta da reserva.
Após atingir: ENTÃO invista em ações, FIIs, cripto — nunca antes.`,
  },

  {
    id: 'regra-50-30-20',
    keywords: ['orçamento', 'gastar', 'dividir salário', 'como organizar', 'categorias gastos'],
    category: 'planejamento',
    content: `REGRA 50-30-20 ADAPTADA PARA O BRASIL
50% — Necessidades (aluguel, alimentação, transporte, saúde, educação básica)
30% — Desejos (lazer, restaurantes, assinaturas, roupas não essenciais)
20% — Prioridades financeiras (quitar dívidas caras, reserva, investimentos)

Adaptação brasileira:
  • Se mora em cidade grande (SP/RJ): habitação pode comer 35-40% da renda — reduza "desejos" proporcionalmente
  • Se tem dívidas caras: zere os "desejos" e coloque tudo em quitar dívidas primeiro
  • Se a renda é baixa: qualquer poupança, por menor que seja, já é vitória — comece com 5%

Ferramenta: o orçamento do Sibanki permite definir limites por categoria e monitora em tempo real.`,
  },

  {
    id: 'melhor-dia-compra-cartao',
    keywords: ['melhor dia', 'compra cartão', 'fechamento fatura', 'prazo cartão', 'vencimento'],
    category: 'planejamento',
    content: `ESTRATÉGIA DO MELHOR DIA DE COMPRA NO CARTÃO
Conceito: comprar logo APÓS o fechamento da fatura garante o maior prazo sem juros.
Como funciona: se a fatura fecha dia 10 e vence dia 5 do mês seguinte:
  → Compra no dia 11: prazo de ~25 dias até o vencimento
  → Compra no dia 9 (antes do fechamento): prazo de apenas ~1 dia
  → Para máximo prazo: compre sempre APÓS a data de fechamento

Estratégia avançada:
1. Concentre TODOS os gastos do mês no cartão (que você já pagaria de qualquer forma)
2. Mantenha o dinheiro em CDB liquidez diária durante o período
3. No dia do vencimento: pague o total e embolse os ~40 dias de rendimento
4. Rende ~0.4-0.6% do valor gasto "de graça" (o banco financia você)

Regra de ouro: só funciona se você SEMPRE pagar o total. Um único mínimo destrói toda a estratégia.`,
  },

  // ─── IMÓVEIS E FINANCIAMENTO ───────────────────────────────────────────────

  {
    id: 'financiamento-vs-aluguel',
    keywords: ['comprar', 'alugar', 'financiamento', 'imóvel', 'casa própria', 'aluguel'],
    category: 'imoveis',
    content: `COMPRAR vs. ALUGAR — A Conta Real
Custo de financiar um imóvel de R$ 500.000 (80% financiado, 30 anos, 10.5% a.a.):
  → Parcela inicial: ~R$ 3.800/mês
  → Total pago em 30 anos: ~R$ 1.360.000 (pagou mais que o dobro)
  → Custo do dinheiro: R$ 860.000 em juros

Contra-argumento válido: imóvel como proteção contra inflação e segurança na velhice.
Quando comprar faz mais sentido: se a parcela for ≤ 50% do aluguel equivalente (raro no Brasil atual).
Quando alugar faz mais sentido: se a relação preço/aluguel do imóvel for > 300 (ex: imóvel de R$ 500k alugado por < R$ 1.600).

Fórmula de decisão: (Preço do imóvel ÷ Aluguel anual) = P/A
  → P/A < 20: comprar pode ser vantajoso
  → P/A 20-30: zona cinzenta — analise caso a caso
  → P/A > 30: alugar e investir a diferença tende a gerar mais riqueza`,
  },

  {
    id: 'consorcio-analise',
    keywords: ['consórcio', 'lance', 'carta de crédito', 'administradora', 'contemplação'],
    category: 'imoveis',
    content: `CONSÓRCIO — A Verdade por Trás do "Sem Juros"
Não tem juros, mas tem taxa de administração (típica: 15-25% do bem, cobrada ao longo das parcelas).
Custo real de um consórcio de R$ 100.000 por 120 meses com taxa de 20%:
  → Taxa: R$ 20.000 rateada em 120 meses = R$ 167/mês de taxa pura
  → Taxa anual efetiva: ~2% a.a. — barata comparada a financiamento (10% a.a.) mas CARA vs. investir
  
Armadilha principal: você paga por anos sem ter o bem. A contemplação média varia de 2 a 10+ anos.
Quando consórcio pode valer: imóvel (não tem pressa), quer se forçar a poupar, não tem disciplina para investir.
Quando NÃO vale: carro (bem que deprecia), pressa, ou se você tem disciplina para investir — em 5 anos investindo o mesmo valor do consórcio, provavelmente compra o bem à vista com sobra.

Dica: pesquise a taxa de administração TOTAL (não a mensal) e divida pelo prazo para comparar com CDI.`,
  },

  // ─── IMPOSTOS E TRIBUTAÇÃO ─────────────────────────────────────────────────

  {
    id: 'ir-investimentos',
    keywords: ['imposto de renda', 'IR', 'declarar', 'tributação', 'DARF', 'ganho capital'],
    category: 'tributacao',
    content: `IMPOSTO DE RENDA EM INVESTIMENTOS
Tabela Regressiva (renda fixa, fundos não isentos):
  • Até 180 dias: 22.5%
  • 181 a 360 dias: 20%
  • 361 a 720 dias: 17.5%
  • Acima de 720 dias: 15%
  
Isentos de IR (PF): LCI, LCA, CRI, CRA, Debêntures incentivadas, dividendos de ações/FIIs, poupança.

Ações: 15% sobre ganho de capital em operações normais. Isento se total de vendas no mês ≤ R$ 20.000.
FIIs: 20% sobre ganho de capital na venda de cotas. Dividendos: isentos.
Cripto: 15% (ganhos até R$ 5M), escalonando até 22.5%. Isento se vendas mensais ≤ R$ 35.000.

DARF: deve ser pago até o último dia útil do mês seguinte ao fato gerador.
Importante: prejuízo em ações pode ser compensado com lucros futuros (mesmo tipo de operação).`,
  },

  // ─── PREVIDÊNCIA E APOSENTADORIA ───────────────────────────────────────────

  {
    id: 'pgbl-vgbl',
    keywords: ['previdência', 'PGBL', 'VGBL', 'aposentadoria', 'plano previdência', 'IR previdência'],
    category: 'previdencia',
    content: `PREVIDÊNCIA PRIVADA — PGBL vs. VGBL
PGBL (Plano Gerador de Benefício Livre):
  → Deduz até 12% da renda bruta tributável no IR (declaração completa)
  → IR incide sobre TUDO (principal + rendimento) no resgate
  → Para quem faz declaração completa e tem IR a pagar

VGBL (Vida Gerador de Benefício Livre):
  → Sem dedução no IR
  → IR incide APENAS sobre os rendimentos no resgate
  → Para quem faz declaração simplificada ou já usou o limite do PGBL

Tabela de tributação na saída (escolha na contratação):
  • Regressiva: 35% (< 2 anos) → 10% (> 10 anos) — melhor para quem vai deixar ≥ 10 anos
  • Progressiva: tabela normal do IR — melhor para rendas baixas na aposentadoria

Armadilha: taxas de administração acima de 1% a.a. destroem o benefício fiscal ao longo do tempo.
Alternativa superior para horizonte > 20 anos: Tesouro IPCA+ ou ETF de ações com reinvestimento.`,
  },

];

// ─── RETRIEVER ────────────────────────────────────────────────────────────────

/**
 * Recupera os chunks mais relevantes para a pergunta do usuário.
 * Usa correspondência simples de palavras-chave (sem embedding).
 * Para produção com volume alto, considere migrar para Vertex AI Matching Engine.
 *
 * @param {string} query - Pergunta ou texto do usuário
 * @param {number} topK - Número máximo de chunks a retornar (padrão: 3)
 * @returns {string[]} Conteúdo dos chunks mais relevantes
 */
function retrieveRelevantChunks(query, topK = 3) {
  if (!query) return [];

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);

  const scored = KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;
    for (const kw of chunk.keywords) {
      if (queryLower.includes(kw.toLowerCase())) {
        score += 3; // match exato de keyword
      }
    }
    for (const word of queryWords) {
      if (chunk.content.toLowerCase().includes(word)) {
        score += 1; // match parcial no conteúdo
      }
    }
    return { chunk, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk.content);
}

/**
 * Recupera chunks por categoria específica.
 * Útil para módulos como Growth (investimentos) ou CreditHub (crédito).
 *
 * @param {string} category - 'credito' | 'investimentos' | 'planejamento' | 'imoveis' | 'tributacao' | 'previdencia'
 * @returns {string[]}
 */
function retrieveByCategory(category) {
  return KNOWLEDGE_BASE
    .filter((c) => c.category === category)
    .map((c) => c.content);
}

module.exports = {
  retrieveRelevantChunks,
  retrieveByCategory,
  KNOWLEDGE_BASE,
};
