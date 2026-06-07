# Catálogo de Ideias do Sistema Legado (Sibanki)

Durante a auditoria e análise do código-fonte do sistema legado (`public/app/`), diversas funcionalidades e fluxos apresentaram grande valor para a continuidade do Sibanki (novo ecossistema React). Abaixo estão listadas as principais ideias recomendadas para integração:

## 1. Onboarding Dinâmico e Personalizado (Wizard)
- **Diagnóstico Inicial:** O onboarding antigo não apenas coletava o nome, mas também a **dor financeira** (ex: "Não sei para onde meu dinheiro vai"), a **situação atual** (Endividado, Poupador, Investidor) e o **objetivo principal** (Redução de gastos, Começar a investir, Organizar família).
- **Personalização IA:** O sistema usava esses dados (`perfilOnboarding`) para que a inteligência artificial ("Siba") priorizasse conselhos no dashboard com base no objetivo real do usuário.
- **Renda e Perfil Profissional:** Coletava se o usuário era CLT, MEI ou Empresário para moldar os alertas.

## 2. Gamificação e Conquistas (Engajamento)
- **Score e Badges:** Havia um sistema visual rico de conquistas (`achievements`, `badges`) e acompanhamento do "Score Sibanki", gamificando a saúde financeira.
- **Progressão de Nível:** Níveis que destravavam conforme o usuário melhorava os hábitos financeiros.

## 3. Módulo "Família" Compartilhado
- **Dashboard Familiar:** Funcionalidade estruturada de convidar dependentes por e-mail, permitindo a visualização e colaboração financeira de todos sob o mesmo "teto" ou assinatura familiar.

## 4. Módulo de Comunidade e Social
- **Feed Interativo:** O módulo "Social" permitia o compartilhamento de posts e dicas. Havia interação real (curtir, comentar e favoritar/bookmarks) sobre educação financeira entre a comunidade Sibanki.

## 5. Hub Educacional e Trilhas ("Dicas")
- **Trilhas de Aprendizado:** Um módulo dedicado apenas para "Educação", onde o usuário progredia em trilhas de leitura ou atividades para ganhar badges, promovendo a evolução ativa do perfil investidor.

## 6. Módulo Robusto de Relatórios
- **Visões Específicas:** Relatórios divididos em 6 abas profundas (Resumo, Patrimônio, Categorias, Comparativo, Cartões e Metas).
- **Exportação Universal:** Exportação nativa de carteira e histórico via **CSV** e **PDF**.

## 7. Integrações Multi-canal
- **Telegram / WhatsApp:** Conexão explícita na aba de configurações para que a IA e os alertas automáticos fossem disparados nativamente nesses mensageiros, além de relatórios semanais via E-mail.

## 8. Calendário Interativo
- **Visão em Grade Mensal:** Visualização financeira diretamente num calendário em grade, com os dias de lançamentos fixos e vencimentos destacados de forma bem visual.

## 9. Preferências de Personalização Rápidas
- **Tags de Categorias Customizadas:** Criação ágil de categorias atreladas à ícones/emojis no menu de configurações iniciais.
