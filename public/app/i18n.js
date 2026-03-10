/**
 * Sibanki - Multi-idioma (i18n) v2
 * pt-BR (padrão) e English
 */
(function(){
  var STORAGE_KEY = 'sibanki_lang';

  var LANGS = {
    'pt-BR': {
      // MENU
      menu_dashboard: 'Dashboard',
      menu_contas: 'Contas',
      menu_cartoes: 'Cartões',
      menu_lancamentos: 'Lançamentos',
      menu_orcamento: 'Orçamento',
      menu_metas: 'Metas',
      menu_calendario: 'Calendário',
      menu_investimentos: 'Investimentos',
      menu_consultor_ia: 'Consultor IA',
      menu_educacao: 'Educação',
      menu_familia: 'Família',
      menu_comunidade: 'Comunidade',
      menu_relatorios: 'Relatórios',
      menu_conquistas: 'Conquistas',
      menu_configuracoes: 'Configurações',
      menu_sair: 'Sair',
      sep_planejamento: 'Planejamento',
      sep_crescimento: 'Crescimento',
      sep_social: 'Social',
      sep_sistema: 'Sistema',
      upgrade_pro: 'Upgrade para Pro',
      // CONFIG
      config_titulo: 'Configurações',
      config_subtitulo: 'Personalize seu app, gerencie plano, integrações e preferências do sistema.',
      config_idioma: 'Idioma',
      config_idioma_pt: 'Português (Brasil)',
      config_idioma_en: 'English',
      config_salvo: 'Configurações salvas!',
      app_titulo: 'Sibanki - Controle Financeiro Inteligente com IA',
      // DASHBOARD
      primeiro_passo: 'Seus Primeiros Passos',
      config_completa: 'Configuração completa! Seu Sibanki está pronto.',
      editar_dashboard: 'Editar Dashboard',
      salvar_layout: 'Salvar Layout',
      resetar: 'Resetar',
      adicionar_widget: 'Adicionar Widget',
      fechar_lista: 'Fechar lista',
      bom_dia: 'Bom dia',
      boa_tarde: 'Boa tarde',
      boa_noite: 'Boa noite',
      saldo_atual: 'Saldo atual',
      saldo_previsto: 'Saldo previsto',
      receitas_mes: 'Receitas do mês',
      despesas_mes: 'Despesas do mês',
      economia_mes: 'Economia do mês',
      score_financeiro: 'Score Financeiro',
      evolucao_patrimonio: 'Evolução do Patrimônio',
      grafico_evolucao: 'Gráfico de evolução',
      // NOTIFICAÇÕES
      notificacoes: 'Notificações',
      marcar_lidas: 'Marcar lidas',
      limpar: 'Limpar',
      sem_notificacoes: 'Nenhuma notificação',
      // CONTAS
      nova_conta: 'Nova conta',
      conta: 'Conta',
      contas: 'Contas',
      tipo_conta: 'Tipo de conta',
      banco: 'Banco',
      saldo_inicial: 'Saldo inicial',
      transferir: 'Transferir',
      ajustar_saldo: 'Ajustar Saldo',
      de_conta: 'De (Origem)',
      para_conta: 'Para (Destino)',
      sem_contas: 'Nenhuma conta cadastrada.',
      adicionar_conta: 'Adicionar Conta',
      editar_conta: 'Editar Conta',
      excluir_conta: 'Excluir Conta',
      // LANÇAMENTOS
      lancamentos: 'Lançamentos',
      novo_lancamento: 'Novo Lançamento',
      receita: 'Receita',
      despesa: 'Despesa',
      valor: 'Valor',
      descricao: 'Descrição',
      categoria: 'Categoria',
      data: 'Data',
      status: 'Status',
      pago: 'Pago',
      pendente: 'Pendente',
      agendado: 'Agendado',
      forma_pgto: 'Forma de Pagamento',
      tags: 'Tags',
      salvar: 'Salvar',
      cancelar: 'Cancelar',
      editar: 'Editar',
      excluir: 'Excluir',
      buscar: 'Buscar...',
      todos: 'Todos',
      filtros: 'Filtros',
      limpar_filtros: 'Limpar filtros',
      nenhum_lancamento: 'Nenhum lançamento.',
      mais_opcoes: 'Mais opções',
      fixos: 'Fixos',
      // CARTÕES
      cartoes: 'Cartões',
      novo_cartao: 'Novo Cartão',
      limite: 'Limite',
      fatura_atual: 'Fatura atual',
      vencimento: 'Vencimento',
      fechamento: 'Fechamento',
      lancar_fatura: 'Lançar na Fatura',
      importar: 'Importar',
      fatura: 'Fatura',
      parcelas: 'Parcelas',
      sem_cartoes: 'Nenhum cartão cadastrado.',
      // INVESTIMENTOS
      investimentos: 'Investimentos',
      registrar_investimento: 'Registrar Investimento',
      total_investido: 'Total Investido',
      valor_atual: 'Valor Atual',
      retorno: 'Retorno',
      ativos: 'Ativos',
      minha_carteira: 'Minha Carteira',
      rentabilidade: 'Rentabilidade',
      patrimonio: 'Patrimônio',
      atualizar_cotacoes: 'Atualizar Cotações',
      sem_investimentos: 'Nenhum investimento cadastrado.',
      // METAS
      metas: 'Metas',
      nova_meta: 'Nova Meta',
      meta_valor: 'Valor da meta',
      meta_prazo: 'Prazo',
      meta_progresso: 'Progresso',
      sem_metas: 'Nenhuma meta cadastrada.',
      concluida: 'Concluída',
      em_andamento: 'Em andamento',
      // ORÇAMENTO
      orcamento: 'Orçamento',
      limite_categoria: 'Limite por categoria',
      gasto_atual: 'Gasto atual',
      disponivel: 'Disponível',
      sem_orcamento: 'Nenhum orçamento definido.',
      // CALENDÁRIO
      calendario: 'Calendário',
      hoje: 'Hoje',
      mes_anterior: 'Mês anterior',
      proximo_mes: 'Próximo mês',
      a_pagar: 'A pagar',
      a_receber: 'A receber',
      // CONSULTOR IA
      consultor_ia: 'Consultor IA',
      perguntar_ia: 'Pergunte qualquer coisa sobre suas finanças...',
      analisar: 'Analisar',
      ia_digitando: 'Siba está digitando...',
      // EDUCAÇÃO
      educacao: 'Educação',
      trilhas: 'Trilhas',
      calculadoras: 'Calculadoras',
      diagnostico: 'Diagnóstico',
      // FAMÍLIA
      familia: 'Família',
      convidar_membro: 'Convidar membro',
      membros: 'Membros',
      sem_familia: 'Nenhum membro da família vinculado.',
      // COMUNIDADE
      comunidade: 'Comunidade',
      publicar: 'Publicar',
      curtir: 'Curtir',
      comentar: 'Comentar',
      // RELATÓRIOS
      relatorios: 'Relatórios',
      gerar_pdf: 'Gerar PDF',
      periodo: 'Período',
      // CONQUISTAS
      conquistas: 'Conquistas',
      xp_atual: 'XP atual',
      nivel: 'Nível',
      // PERFIL
      perfil: 'Perfil',
      nome: 'Nome',
      email: 'E-mail',
      salvar_perfil: 'Salvar perfil',
      foto_perfil: 'Foto de perfil',
      // GERAL
      carregando: 'Carregando...',
      erro: 'Erro',
      sucesso: 'Sucesso!',
      confirmar: 'Confirmar',
      sim: 'Sim',
      nao: 'Não',
      fechar: 'Fechar',
      voltar: 'Voltar',
      continuar: 'Continuar',
      ver_mais: 'Ver mais',
      nenhum_resultado: 'Nenhum resultado encontrado.',
      mes: 'Mês',
      ano: 'Ano',
      janeiro: 'Janeiro', fevereiro: 'Fevereiro', marco: 'Março',
      abril: 'Abril', maio: 'Maio', junho: 'Junho',
      julho: 'Julho', agosto: 'Agosto', setembro: 'Setembro',
      outubro: 'Outubro', novembro: 'Novembro', dezembro: 'Dezembro',
    },
    'en': {
      // MENU
      menu_dashboard: 'Dashboard',
      menu_contas: 'Accounts',
      menu_cartoes: 'Cards',
      menu_lancamentos: 'Transactions',
      menu_orcamento: 'Budget',
      menu_metas: 'Goals',
      menu_calendario: 'Calendar',
      menu_investimentos: 'Investments',
      menu_consultor_ia: 'AI Consultant',
      menu_educacao: 'Education',
      menu_familia: 'Family',
      menu_comunidade: 'Community',
      menu_relatorios: 'Reports',
      menu_conquistas: 'Achievements',
      menu_configuracoes: 'Settings',
      menu_sair: 'Log out',
      sep_planejamento: 'Planning',
      sep_crescimento: 'Growth',
      sep_social: 'Social',
      sep_sistema: 'System',
      upgrade_pro: 'Upgrade to Pro',
      // CONFIG
      config_titulo: 'Settings',
      config_subtitulo: 'Customize your app, manage plan, integrations and system preferences.',
      config_idioma: 'Language',
      config_idioma_pt: 'Português (Brasil)',
      config_idioma_en: 'English',
      config_salvo: 'Settings saved!',
      app_titulo: 'Sibanki - Smart Finance with AI',
      // DASHBOARD
      primeiro_passo: 'Your First Steps',
      config_completa: 'All set! Your Sibanki is ready.',
      editar_dashboard: 'Edit Dashboard',
      salvar_layout: 'Save Layout',
      resetar: 'Reset',
      adicionar_widget: 'Add Widget',
      fechar_lista: 'Close list',
      bom_dia: 'Good morning',
      boa_tarde: 'Good afternoon',
      boa_noite: 'Good evening',
      saldo_atual: 'Current balance',
      saldo_previsto: 'Expected balance',
      receitas_mes: 'Monthly income',
      despesas_mes: 'Monthly expenses',
      economia_mes: 'Monthly savings',
      score_financeiro: 'Financial Score',
      evolucao_patrimonio: 'Net Worth Evolution',
      grafico_evolucao: 'Evolution chart',
      // NOTIFICAÇÕES
      notificacoes: 'Notifications',
      marcar_lidas: 'Mark as read',
      limpar: 'Clear',
      sem_notificacoes: 'No notifications',
      // CONTAS
      nova_conta: 'New account',
      conta: 'Account',
      contas: 'Accounts',
      tipo_conta: 'Account type',
      banco: 'Bank',
      saldo_inicial: 'Initial balance',
      transferir: 'Transfer',
      ajustar_saldo: 'Adjust Balance',
      de_conta: 'From (Origin)',
      para_conta: 'To (Destination)',
      sem_contas: 'No accounts registered.',
      adicionar_conta: 'Add Account',
      editar_conta: 'Edit Account',
      excluir_conta: 'Delete Account',
      // LANÇAMENTOS
      lancamentos: 'Transactions',
      novo_lancamento: 'New Transaction',
      receita: 'Income',
      despesa: 'Expense',
      valor: 'Amount',
      descricao: 'Description',
      categoria: 'Category',
      data: 'Date',
      status: 'Status',
      pago: 'Paid',
      pendente: 'Pending',
      agendado: 'Scheduled',
      forma_pgto: 'Payment method',
      tags: 'Tags',
      salvar: 'Save',
      cancelar: 'Cancel',
      editar: 'Edit',
      excluir: 'Delete',
      buscar: 'Search...',
      todos: 'All',
      filtros: 'Filters',
      limpar_filtros: 'Clear filters',
      nenhum_lancamento: 'No transactions found.',
      mais_opcoes: 'More options',
      fixos: 'Recurring',
      // CARTÕES
      cartoes: 'Cards',
      novo_cartao: 'New Card',
      limite: 'Limit',
      fatura_atual: 'Current bill',
      vencimento: 'Due date',
      fechamento: 'Closing date',
      lancar_fatura: 'Add to Bill',
      importar: 'Import',
      fatura: 'Bill',
      parcelas: 'Installments',
      sem_cartoes: 'No cards registered.',
      // INVESTIMENTOS
      investimentos: 'Investments',
      registrar_investimento: 'Register Investment',
      total_investido: 'Total Invested',
      valor_atual: 'Current Value',
      retorno: 'Return',
      ativos: 'Assets',
      minha_carteira: 'My Portfolio',
      rentabilidade: 'Performance',
      patrimonio: 'Net Worth',
      atualizar_cotacoes: 'Update Quotes',
      sem_investimentos: 'No investments registered.',
      // METAS
      metas: 'Goals',
      nova_meta: 'New Goal',
      meta_valor: 'Goal amount',
      meta_prazo: 'Deadline',
      meta_progresso: 'Progress',
      sem_metas: 'No goals registered.',
      concluida: 'Completed',
      em_andamento: 'In progress',
      // ORÇAMENTO
      orcamento: 'Budget',
      limite_categoria: 'Category limit',
      gasto_atual: 'Current spending',
      disponivel: 'Available',
      sem_orcamento: 'No budget defined.',
      // CALENDÁRIO
      calendario: 'Calendar',
      hoje: 'Today',
      mes_anterior: 'Previous month',
      proximo_mes: 'Next month',
      a_pagar: 'To pay',
      a_receber: 'To receive',
      // CONSULTOR IA
      consultor_ia: 'AI Consultant',
      perguntar_ia: 'Ask anything about your finances...',
      analisar: 'Analyze',
      ia_digitando: 'Siba is typing...',
      // EDUCAÇÃO
      educacao: 'Education',
      trilhas: 'Learning paths',
      calculadoras: 'Calculators',
      diagnostico: 'Diagnosis',
      // FAMÍLIA
      familia: 'Family',
      convidar_membro: 'Invite member',
      membros: 'Members',
      sem_familia: 'No family members linked.',
      // COMUNIDADE
      comunidade: 'Community',
      publicar: 'Post',
      curtir: 'Like',
      comentar: 'Comment',
      // RELATÓRIOS
      relatorios: 'Reports',
      gerar_pdf: 'Generate PDF',
      periodo: 'Period',
      // CONQUISTAS
      conquistas: 'Achievements',
      xp_atual: 'Current XP',
      nivel: 'Level',
      // PERFIL
      perfil: 'Profile',
      nome: 'Name',
      email: 'E-mail',
      salvar_perfil: 'Save profile',
      foto_perfil: 'Profile photo',
      // GERAL
      carregando: 'Loading...',
      erro: 'Error',
      sucesso: 'Success!',
      confirmar: 'Confirm',
      sim: 'Yes',
      nao: 'No',
      fechar: 'Close',
      voltar: 'Back',
      continuar: 'Continue',
      ver_mais: 'See more',
      nenhum_resultado: 'No results found.',
      mes: 'Month',
      ano: 'Year',
      janeiro: 'January', fevereiro: 'February', marco: 'March',
      abril: 'April', maio: 'May', junho: 'June',
      julho: 'July', agosto: 'August', setembro: 'September',
      outubro: 'October', novembro: 'November', dezembro: 'December',
    }
  };

  window.currentLang = localStorage.getItem(STORAGE_KEY) || 'pt-BR';
  if (window.currentLang !== 'pt-BR' && window.currentLang !== 'en') window.currentLang = 'pt-BR';

  window.t = function(key) {
    var lang = LANGS[window.currentLang];
    return (lang && lang[key]) || LANGS['pt-BR'][key] || key;
  };

  window.setLang = function(lang) {
    if (!LANGS[lang]) return;
    window.currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-BR');
    document.title = (LANGS[lang] && LANGS[lang].app_titulo) || document.title;
    if (typeof window.applyI18n === 'function') window.applyI18n();
    if (typeof window.refreshLucide === 'function') window.refreshLucide();
    if (typeof window.updateLangBtnFlag === 'function') window.updateLangBtnFlag();
    var sel = document.getElementById('langSelect'); if (sel) sel.value = lang;
    // Re-render dynamic sections that use t()
    if (typeof window.renderAll === 'function') window.renderAll();
    if (typeof window.renderAccs === 'function') window.renderAccs();
    if (typeof window.renderCards === 'function') window.renderCards();
    if (typeof window.renderDash === 'function') window.renderDash();
  };

  window.applyI18n = function() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var text = window.t(key);
      if (text) {
        if (el.getAttribute('data-i18n-placeholder') === '1') el.placeholder = text;
        else el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var text = window.t(key);
      if (text) el.title = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key && key !== '1') el.placeholder = window.t(key) || el.placeholder;
    });
  };

  document.documentElement.setAttribute('lang', window.currentLang === 'en' ? 'en' : 'pt-BR');
})();
