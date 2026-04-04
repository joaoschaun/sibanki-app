/**
 * Inventário dos recursos de dados Pluggy (Open Finance / conectores) e onde o Sibanki armazena.
 *
 * ── Soluções do produto (parceiros) ≠ Open Finance ────────────────────────────
 * Páginas como /solucoes/credito, /solucoes/seguro são conteúdo comercial e fluxos de parceiros.
 * Não confundir com a ingestão abaixo, que são dados brutos devolvidos pela API Pluggy após consentimento.
 *
 * Este arquivo é a fonte da verdade para “o que o OF oferece” vs “o que já tratamos no backend”.
 */
const OPEN_FINANCE_RESOURCES = [
  {
    id: 'accounts',
    pluggyMethod: 'GET /accounts (itemId)',
    description: 'Contas bancárias e cartão (visão conta)',
    sibankiStorage: 'accounts, accountBalances, accountMeta; labels para lançamentos',
    implementation: 'synced',
  },
  {
    id: 'transactions',
    pluggyMethod: 'fetchAllTransactions(accountId)',
    description: 'Movimentações (extrato)',
    sibankiStorage: 'users.entries (+ entriesOverflow se limite)',
    implementation: 'synced',
  },
  {
    id: 'investments',
    pluggyMethod: 'fetchInvestments(itemId)',
    description: 'Posições de investimento',
    sibankiStorage: 'investments',
    implementation: 'synced',
  },
  {
    id: 'investment_transactions',
    pluggyMethod: 'fetchInvestmentTransactions / fetchAllInvestmentTransactions',
    description: 'Movimentações de carteira de investimento',
    sibankiStorage: 'não persistido ainda (planejado ou subcoleção)',
    implementation: 'planned',
  },
  {
    id: 'loans',
    pluggyMethod: 'fetchLoans(itemId)',
    description: 'Contratos de crédito (empréstimos)',
    sibankiStorage: 'creditAccounts, creditObligations (parcelas/balloons/próxima)',
    implementation: 'synced',
  },
  {
    id: 'credit_card_bills',
    pluggyMethod: 'fetchCreditCardBills(accountId)',
    description: 'Faturas de cartão de crédito (não é boleto DDA de concessionária)',
    sibankiStorage: 'openFinanceCreditBills',
    implementation: 'synced',
  },
  {
    id: 'identity',
    pluggyMethod: 'fetchIdentityByItemId(itemId)',
    description: 'Dados cadastrais / identificação quando o banco expõe',
    sibankiStorage: 'openFinanceIdentityByItem (documentos mascarados)',
    implementation: 'synced',
  },
  {
    id: 'consents',
    pluggyMethod: 'fetchConsents(itemId)',
    description: 'Registros de consentimento Open Finance',
    sibankiStorage: 'openFinanceConsentsByItem (resumo)',
    implementation: 'synced',
  },
  {
    id: 'account_statements',
    pluggyMethod: 'fetchAccountStatements(accountId)',
    description: 'Extratos mensais agregados (PDF/agregado)',
    sibankiStorage: 'não persistido (volume); avaliar subcoleção',
    implementation: 'planned',
  },
  {
    id: 'categories',
    pluggyMethod: 'fetchCategories / categorias na transação',
    description: 'Taxonomia de categorias Pluggy',
    sibankiStorage: 'mapeamento em mapPluggyCategoryToApp; categories[] união',
    implementation: 'partial',
  },
  {
    id: 'dda_utility_bills',
    pluggyMethod: '—',
    description: 'Boletos DDA (água, luz, IPTU) — produto bancário específico, nem sempre Pluggy',
    sibankiStorage: 'ddaBoletos / Meus Boletos (integração futura)',
    implementation: 'not_connector',
  },
  {
    id: 'insurance_policies',
    pluggyMethod: 'APIs de seguros BR (quando existirem no conector)',
    description: 'Apólices / seguros',
    sibankiStorage: 'não modelado; Soluções ≠ dados OF brutos',
    implementation: 'planned_external',
  },
];

module.exports = {
  OPEN_FINANCE_RESOURCES,
};
