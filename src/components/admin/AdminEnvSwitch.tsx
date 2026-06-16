import { AlertTriangle } from 'lucide-react';
import { persistAdminEnv, type AdminEnv } from '../../utils/adminEnv';

interface AdminEnvSwitchProps {
  env: AdminEnv;
  onChange: (env: AdminEnv) => void;
  /** Texto curto do que o switch afeta (ex.: "Módulos", "Feature Flags"). */
  scopeLabel?: string;
}

/**
 * Switch Staging | Produção para escopar a config que o admin edita.
 * Staging e prod compartilham o mesmo Firebase project — a config é escopada
 * por ambiente (config/*[env]) para não afetar prod ao testar no staging.
 */
export function AdminEnvSwitch({ env, onChange, scopeLabel }: AdminEnvSwitchProps) {
  const pick = (next: AdminEnv) => {
    persistAdminEnv(next);
    onChange(next);
  };
  const btn = (active: boolean, danger?: boolean) =>
    `px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.15em] uppercase transition-colors border ${
      active
        ? danger
          ? 'bg-red-600 border-red-600 text-white'
          : 'bg-blue-600 border-blue-600 text-white'
        : 'bg-transparent border-si-border text-si-3 hover:text-si-1 hover:bg-si-over-1'
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Editando</span>
        <button type="button" onClick={() => pick('staging')} className={btn(env === 'staging')}>
          Staging
        </button>
        <button type="button" onClick={() => pick('prod')} className={btn(env === 'prod', true)}>
          Produção
        </button>
      </div>
      {env === 'prod' && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Editando <b>PRODUÇÃO</b>{scopeLabel ? ` — ${scopeLabel} afeta` : ' — afeta'} usuários reais.
          </span>
        </div>
      )}
    </div>
  );
}
