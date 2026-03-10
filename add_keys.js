const fs = require('fs');

// ========== NOVAS CHAVES PARA i18n.js ==========
const newPT = {
  // Erros
  email_invalido: 'E-mail inválido.',
  usuario_nao_encontrado: 'Usuário não encontrado.',
  sem_conexao: 'Sem conexão com a internet.',
  ativo_nao_encontrado: 'Ativo não encontrado.',
  dados_ativo_invalidos: 'Dados do ativo inválidos.',
  erro_exibir_analise: 'Erro ao exibir análise.',
  lancamento_nao_encontrado: 'Lançamento não encontrado.',
  cartao_nao_encontrado: 'Cartão não encontrado.',
  meta_nao_encontrada: 'Meta não encontrada.',
  resposta_invalida_api: 'Resposta inválida da API.',
  confirmar_apagar_tudo: 'Tem certeza? Todos os lançamentos, metas, contas, investimentos e categorias serão apagados. Sua conta de login continua. Esta ação não pode ser desfeita.',
  confirmar_apagar_tudo2: 'Última confirmação: realmente apagar TUDO e recomeçar do zero?',
  confirmar_excluir_cartao: 'Excluir este cartão e todas as suas faturas?',
  confirmar_desvincular_familia: 'CONFIRMAR: Desvincular a família?',
  nao_possivel_remover_conta: 'Não é possível remover a última conta. Adicione outra antes.',
  // Dashboard títulos
  orcamento_mes: 'Orçamento do Mês',
  ultimos_lancamentos: 'Últimos Lançamentos',
  lancamento_rapido: 'Lançamento Rápido',
  total_lancamentos: 'Total de Lançamentos',
  dashboard_configuravel: 'Dashboard Configurável',
  variacao_mes: 'Variação do mês:',
  dentro_orcamento: 'Dentro do orçamento',
  acima_orcamento: 'Acima do orçamento',
  orcamento_estourado: 'Orçamento ESTOURADO!',
  nenhum_cartao: 'Nenhum cartão',
  nenhum_orcamento: 'Nenhum orçamento definido',
  sem_historico: 'Sem histórico',
  nenhum_recorrente: 'Nenhum lançamento recorrente',
  score_credito: 'Score de crédito',
  nao_disponivel: 'Não disponível',
  // Notificações
  atencao: 'Atenção',
  parabens: 'Parabéns!',
  parabens_saldo_positivo: '✅ Parabéns! Saldo positivo este mês. Continue assim!',
  atencao_despesas_altas: '⚠️ Atenção! Despesas superaram receitas. Revise seus gastos.',
  parabens_economizou: 'Parabéns! Você economizou!',
  gastou_mais_mes_anterior: 'Você gastou mais que o mês anterior',
  mesmo_nivel_mes: 'Mesmo nível do mês anterior',
  sem_dados_mes_anterior: 'Sem dados do mês anterior',
  continue_assim: 'este mês. Continue assim!',
  meta_atingida: 'Parabéns! Você atingiu a meta',
  revisando_gastos: 'Atenção! Revise seus gastos.',
  atencao_necessaria: 'Atenção necessária',
  excelente_financas: 'Excelente! Finanças saudáveis',
  situacao_critica: 'Situação crítica',
  algumas_areas_atencao: 'Algumas áreas precisam de atenção.',
  continue_no_caminho: 'Continue assim! Você está no caminho certo.',
  foque_recomendacoes: 'Foque nas recomendações urgentes abaixo.',
  revise_recomendacoes: 'Revise as recomendações abaixo para melhorar.',
  saude_financeira_desc: 'Sua saúde financeira considera gastos, metas e orçamento.',
  numeros_organizando: 'Seus números estão sendo organizados. Use o Consultor IA para dúvidas ou planejamento.',
  despesas_superam_receitas: 'Suas despesas superam as receitas. Revise gastos não essenciais para inverter isso.',
  // Botões
  concluir_edicao: 'Concluir Edição',
  entendido: 'ENTENDIDO, VAMOS LÁ! 🚀',
  missao_completa: 'Missão Completa!',
  // Conquistas
  conquista_centenario: 'Centenário',
  conquista_economico: 'Econômico',
  conquista_trofeu: 'Troféu',
  xp_proximo_nivel: 'XP | Próximo nível:',
  anos_nivel: 'anos | Nível',
  // Contas/Família
  nao_foi_carregar_familia: 'Não foi possível carregar os dados da família.',
  faca_login_consultor: '⚠️ Faça login para usar o consultor IA.',
  limite_consultor: 'Limite de uso do consultor por hoje atingido. Tente em alguns minutos ou amanhã.',
  // Primeiros passos
  adicionar_primeira_conta: 'Adicionar sua primeira conta bancária',
  lancar_primeiro_gasto: 'Lançar seu primeiro gasto',
  configurar_orcamento_mensal: 'Configurar um orçamento mensal',
  // Onboarding perguntas
  onb_situacao_atual: 'Conta pra gente: qual sua situação financeira atual?',
  onb_tenho_dividas: 'Tenho dívidas para quitar',
  onb_nao_consigo_guardar: 'Não tenho dívidas mas não consigo guardar',
  onb_economizo_pouco: 'Consigo economizar um pouco todo mês',
  onb_economizo_invisto: 'Economizo bem e já invisto',
  onb_preocupacao: 'O que mais te preocupa quando o assunto é dinheiro?',
  onb_sei_onde_gasto: 'Sei onde gasto mas não consigo diminuir',
  onb_esqueco_pagar: 'Esqueço de pagar contas no prazo',
  onb_comecar_investir: 'Começar a investir',
  onb_organizar_familia: 'Organizar as finanças da família',
  onb_sair_dividas: 'Sair das dívidas',
  onb_organizar_eliminar: 'Organizar e eliminar dívidas',
  onb_seis_meses: 'Ter 6 meses de segurança',
  onb_guardar_imovel: 'Guardar para o imóvel próprio',
  onb_objetivo: 'Último passo. Me conta qual é o seu principal objetivo — pode escolher mais de um.',
  // Saldo
  saldo_competencia: 'ℹ️ Saldo das contas inclui pendentes/agendados (modo competência).',
  saldo_caixa: '✅ Saldo das contas = apenas lançamentos pagos (modo caixa).',
  // Investimentos
  carteira_fisica: 'Carteira física',
  // Score
  saude_critica: 'Saúde Crítica',
};

const newEN = {
  // Errors
  email_invalido: 'Invalid e-mail.',
  usuario_nao_encontrado: 'User not found.',
  sem_conexao: 'No internet connection.',
  ativo_nao_encontrado: 'Asset not found.',
  dados_ativo_invalidos: 'Invalid asset data.',
  erro_exibir_analise: 'Error displaying analysis.',
  lancamento_nao_encontrado: 'Transaction not found.',
  cartao_nao_encontrado: 'Card not found.',
  meta_nao_encontrada: 'Goal not found.',
  resposta_invalida_api: 'Invalid API response.',
  confirmar_apagar_tudo: 'Are you sure? All transactions, goals, accounts, investments and categories will be deleted. Your login account remains. This action cannot be undone.',
  confirmar_apagar_tudo2: 'Final confirmation: really delete EVERYTHING and start from scratch?',
  confirmar_excluir_cartao: 'Delete this card and all its bills?',
  confirmar_desvincular_familia: 'CONFIRM: Unlink family?',
  nao_possivel_remover_conta: 'Cannot remove the last account. Add another one first.',
  // Dashboard titles
  orcamento_mes: 'Monthly Budget',
  ultimos_lancamentos: 'Latest Transactions',
  lancamento_rapido: 'Quick Entry',
  total_lancamentos: 'Total Transactions',
  dashboard_configuravel: 'Customizable Dashboard',
  variacao_mes: 'Monthly change:',
  dentro_orcamento: 'Within budget',
  acima_orcamento: 'Over budget',
  orcamento_estourado: 'Budget EXCEEDED!',
  nenhum_cartao: 'No cards',
  nenhum_orcamento: 'No budget defined',
  sem_historico: 'No history',
  nenhum_recorrente: 'No recurring transactions',
  score_credito: 'Credit score',
  nao_disponivel: 'Not available',
  // Notifications
  atencao: 'Warning',
  parabens: 'Congratulations!',
  parabens_saldo_positivo: '✅ Great job! Positive balance this month. Keep it up!',
  atencao_despesas_altas: '⚠️ Warning! Expenses exceeded income. Review your spending.',
  parabens_economizou: 'Congratulations! You saved money!',
  gastou_mais_mes_anterior: 'You spent more than last month',
  mesmo_nivel_mes: 'Same level as last month',
  sem_dados_mes_anterior: 'No data from last month',
  continue_assim: 'this month. Keep it up!',
  meta_atingida: 'Congratulations! You reached the goal',
  revisando_gastos: 'Warning! Review your spending.',
  atencao_necessaria: 'Attention needed',
  excelente_financas: 'Excellent! Healthy finances',
  situacao_critica: 'Critical situation',
  algumas_areas_atencao: 'Some areas need attention.',
  continue_no_caminho: 'Keep it up! You are on the right track.',
  foque_recomendacoes: 'Focus on the urgent recommendations below.',
  revise_recomendacoes: 'Review the recommendations below to improve.',
  saude_financeira_desc: 'Your financial health considers spending, goals and budget.',
  numeros_organizando: 'Your numbers are being organized. Use the AI Consultant for questions or planning.',
  despesas_superam_receitas: 'Your expenses exceed income. Review non-essential spending to change this.',
  // Buttons
  concluir_edicao: 'Finish Editing',
  entendido: "GOT IT, LET'S GO! 🚀",
  missao_completa: 'Mission Complete!',
  // Achievements
  conquista_centenario: 'Centurion',
  conquista_economico: 'Saver',
  conquista_trofeu: 'Trophy',
  xp_proximo_nivel: 'XP | Next level:',
  anos_nivel: 'years | Level',
  // Accounts/Family
  nao_foi_carregar_familia: 'Could not load family data.',
  faca_login_consultor: '⚠️ Please log in to use the AI consultant.',
  limite_consultor: "Today's consultant usage limit reached. Try again in a few minutes or tomorrow.",
  // First steps
  adicionar_primeira_conta: 'Add your first bank account',
  lancar_primeiro_gasto: 'Log your first expense',
  configurar_orcamento_mensal: 'Set up a monthly budget',
  // Onboarding questions
  onb_situacao_atual: 'Tell us: what is your current financial situation?',
  onb_tenho_dividas: 'I have debts to pay off',
  onb_nao_consigo_guardar: "I have no debts but can't save money",
  onb_economizo_pouco: 'I manage to save a little each month',
  onb_economizo_invisto: 'I save well and already invest',
  onb_preocupacao: 'What worries you most about money?',
  onb_sei_onde_gasto: "I know where I spend but can't reduce it",
  onb_esqueco_pagar: 'I forget to pay bills on time',
  onb_comecar_investir: 'Start investing',
  onb_organizar_familia: "Organize the family's finances",
  onb_sair_dividas: 'Get out of debt',
  onb_organizar_eliminar: 'Organize and eliminate debts',
  onb_seis_meses: 'Have 6 months of financial security',
  onb_guardar_imovel: 'Save for a home down payment',
  onb_objetivo: 'Last step. Tell me your main goal — you can choose more than one.',
  // Balance
  saldo_competencia: 'ℹ️ Account balance includes pending/scheduled entries (accrual mode).',
  saldo_caixa: '✅ Account balance = paid entries only (cash mode).',
  // Investments
  carteira_fisica: 'Physical wallet',
  // Score
  saude_critica: 'Critical Health',
};

// Ler o i18n.js atual
let i18n = fs.readFileSync('public/app/i18n.js', 'utf8');

// Inserir as novas chaves PT antes do fechamento do bloco pt-BR
const ptInsert = Object.entries(newPT).map(([k,v]) => `      ${k}: ${JSON.stringify(v)},`).join('\n');
i18n = i18n.replace("      carteira_fisica: 'Carteira física',\n      // Score\n      saude_critica: 'Saúde Crítica',\n    },", 
  `${ptInsert}\n    },`);

// Inserir as novas chaves EN antes do fechamento do bloco en
const enInsert = Object.entries(newEN).map(([k,v]) => `      ${k}: ${JSON.stringify(v)},`).join('\n');
i18n = i18n.replace("      carteira_fisica: 'Physical wallet',\n      // Score\n      saude_critica: 'Critical Health',\n    }\n  };",
  `${enInsert}\n    }\n  };`);

fs.writeFileSync('public/app/i18n.js', i18n);
console.log('i18n.js atualizado com', Object.keys(newPT).length, 'novas chaves');

// Contar chaves totais
const totalPT = (i18n.match(/^\s{6}\w+:/mg)||[]).length;
console.log('Total de chaves no dicionário:', Math.round(totalPT/2));
