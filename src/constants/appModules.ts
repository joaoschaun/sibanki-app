/**
 * appModules.ts — Fonte ÚNICA de verdade dos módulos de navegação do Sibanki.
 *
 * Usado por:
 *  - `useModuleFlags()`           → estado de ligado/desligado (Firestore config/modules)
 *  - `Sidebar` / `BottomNavigation` → esconder módulos desligados
 *  - `ModuleGuard` (App.tsx)      → redirecionar acesso direto a módulo desligado
 *  - Admin (public/admin)         → seção "Módulos" gera os toggles a partir das mesmas keys
 *
 * Para ligar/desligar um módulo, o admin grava `config/modules` no Firestore:
 *   { [key]: boolean }
 * Módulos marcados como `essential` NÃO podem ser desligados (evita lockout do app).
 */

export type ModuleGroup = 'core' | 'mais' | 'bottom';

export interface AppModule {
  /** Identificador estável (chave em config/modules). Nunca renomear. */
  key: string;
  label: string;
  /** Rota primária (prefixo) usada para casar a navegação atual. */
  path: string;
  group: ModuleGroup;
  /** Ligado por padrão quando não há override em config/modules. */
  default: boolean;
  /** Essencial: sempre visível, sem toggle no admin (evita travar o app). */
  essential?: boolean;
}

/**
 * Ordem reflete a navegação real do Sidebar (core → mais → rodapé).
 * Mantém alinhamento 1:1 com os arrays do Sidebar.
 */
export const APP_MODULES: AppModule[] = [
  // ── Core ────────────────────────────────────────────────────────────────
  { key: 'assistente',   label: 'Assistente',    path: '/consultor-ia', group: 'core', default: true, essential: true },
  { key: 'painel',       label: 'Painel',        path: '/dashboard',    group: 'core', default: true, essential: true },
  { key: 'lancamentos',  label: 'Lançamentos',   path: '/lancamentos',  group: 'core', default: true },
  { key: 'contas',       label: 'Contas',        path: '/contas',       group: 'core', default: true },
  { key: 'credito',      label: 'Crédito',       path: '/credito',      group: 'core', default: true },
  { key: 'investimentos',label: 'Investimentos', path: '/crescimento',  group: 'core', default: true },

  // ── Mais ────────────────────────────────────────────────────────────────
  { key: 'orcamento',    label: 'Orçamento',     path: '/orcamento',       group: 'mais', default: true },
  { key: 'metas',        label: 'Metas',         path: '/planejamento',    group: 'mais', default: true },
  { key: 'recorrentes',  label: 'Recorrentes',   path: '/recorrentes',     group: 'mais', default: true },
  { key: 'loja',         label: 'Loja',          path: '/loja',            group: 'mais', default: true },
  { key: 'familia',      label: 'Família',       path: '/casal',           group: 'mais', default: true },
  { key: 'credi_amigo',  label: 'Credi Amigo',   path: '/credi-amigo',     group: 'mais', default: true },
  { key: 'consorcio',    label: 'Consórcio',     path: '/consorcio-amigo', group: 'mais', default: true },
  { key: 'relatorios',   label: 'Relatórios',    path: '/relatorios',      group: 'mais', default: true },
  { key: 'calendario',   label: 'Calendário',    path: '/calendario',      group: 'mais', default: true },
  { key: 'educacao',     label: 'Educação',      path: '/educacao',        group: 'mais', default: true },
  { key: 'ferramentas',  label: 'Ferramentas',   path: '/ferramentas',     group: 'mais', default: true },
  { key: 'fire',         label: 'FIRE',          path: '/fire',            group: 'mais', default: true },
  { key: 'meu_cpf',      label: 'Meu CPF',       path: '/meu-cpf',         group: 'mais', default: true },
  { key: 'sibcoin',      label: 'SibCoin',       path: '/sibcoin',         group: 'mais', default: true },
  { key: 'filiados',     label: 'Filiados',      path: '/filiados',        group: 'mais', default: true },

  // ── Rodapé ──────────────────────────────────────────────────────────────
  { key: 'perfil',       label: 'Perfil',        path: '/perfil',        group: 'bottom', default: true, essential: true },
  { key: 'configuracoes',label: 'Configurações', path: '/configuracoes', group: 'bottom', default: true, essential: true },
];

export const MODULE_BY_KEY: Record<string, AppModule> = Object.fromEntries(
  APP_MODULES.map((m) => [m.key, m]),
);

/** Módulos que o admin pode ligar/desligar (exclui essenciais). */
export const TOGGLEABLE_MODULES: AppModule[] = APP_MODULES.filter((m) => !m.essential);

/** Mapa de defaults — base quando config/modules não traz a chave. */
export function defaultModuleFlags(): Record<string, boolean> {
  return Object.fromEntries(APP_MODULES.map((m) => [m.key, m.default]));
}

/**
 * Resolve qual módulo corresponde a um pathname (prefixo mais longo).
 * Usado pelo ModuleGuard para decidir redirect ao acessar rota desligada.
 */
export function matchModuleByPath(pathname: string): AppModule | null {
  let best: AppModule | null = null;
  for (const m of APP_MODULES) {
    if (pathname === m.path || pathname.startsWith(m.path + '/')) {
      if (!best || m.path.length > best.path.length) best = m;
    }
  }
  return best;
}
