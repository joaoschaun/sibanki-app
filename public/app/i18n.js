/**
 * Sibanki - Multi-idioma (i18n)
 * pt-BR (padrão) e English para valorizar o produto como internacional.
 */
(function(){
  var STORAGE_KEY = 'sibanki_lang';

  var LANGS = {
    'pt-BR': {
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
      config_titulo: 'Configurações',
      config_subtitulo: 'Personalize seu app, gerencie plano, integrações e preferências do sistema.',
      config_idioma: 'Idioma',
      config_idioma_pt: 'Português (Brasil)',
      config_idioma_en: 'English',
      config_salvo: 'Configurações salvas!',
      nova_conta: 'Nova conta',
      saldo_atual: 'Saldo atual',
      saldo_previsto: 'Saldo previsto',
      app_titulo: 'Sibanki - Controle Financeiro Inteligente com IA',
      primeiro_passo: 'Seus Primeiros Passos',
      config_completa: 'Configuração completa! Seu Sibanki está pronto.',
      editar_dashboard: 'Editar Dashboard',
      salvar_layout: 'Salvar Layout',
      resetar: 'Resetar',
      adicionar_widget: 'Adicionar Widget',
      fechar_lista: 'Fechar lista',
      notificacoes: 'Notificações',
      marcar_lidas: 'Marcar lidas',
      limpar: 'Limpar',
      transferir: 'Transferir',
      ajustar_saldo: 'Ajustar Saldo',
      grafico_evolucao: 'Gráfico de evolução',
      conta: 'Conta',
      contas: 'Contas',
      cartoes: 'Cartões',
      investimentos: 'Investimentos',
      registrar_investimento: 'Registrar Investimento',
      total_investido: 'Total Investido',
      valor_atual: 'Valor Atual',
      retorno: 'Retorno',
      ativos: 'Ativos',
      minha_carteira: 'Minha Carteira',
      perfil: 'Perfil',
      relatorios: 'Relatórios',
      conquistas: 'Conquistas'
    },
    'en': {
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
      config_titulo: 'Settings',
      config_subtitulo: 'Customize your app, manage plan, integrations and system preferences.',
      config_idioma: 'Language',
      config_idioma_pt: 'Português (Brasil)',
      config_idioma_en: 'English',
      config_salvo: 'Settings saved!',
      nova_conta: 'New account',
      saldo_atual: 'Current balance',
      saldo_previsto: 'Expected balance',
      app_titulo: 'Sibanki - Smart Finance with AI',
      primeiro_passo: 'Your First Steps',
      config_completa: 'All set! Your Sibanki is ready.',
      editar_dashboard: 'Edit Dashboard',
      salvar_layout: 'Save Layout',
      resetar: 'Reset',
      adicionar_widget: 'Add Widget',
      fechar_lista: 'Close list',
      notificacoes: 'Notifications',
      marcar_lidas: 'Mark as read',
      limpar: 'Clear',
      transferir: 'Transfer',
      ajustar_saldo: 'Adjust Balance',
      grafico_evolucao: 'Evolution chart',
      conta: 'Account',
      contas: 'Accounts',
      cartoes: 'Cards',
      investimentos: 'Investments',
      registrar_investimento: 'Register Investment',
      total_investido: 'Total Invested',
      valor_atual: 'Current Value',
      retorno: 'Return',
      ativos: 'Assets',
      minha_carteira: 'My Portfolio',
      perfil: 'Profile',
      relatorios: 'Reports',
      conquistas: 'Achievements'
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
  };

  document.documentElement.setAttribute('lang', window.currentLang === 'en' ? 'en' : 'pt-BR');
})();
