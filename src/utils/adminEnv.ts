/**
 * adminEnv.ts — ambiente que o ADMIN está editando (Staging | Produção).
 *
 * Não confundir com getAppEnv() (environment.ts), que detecta o ambiente do
 * APP pelo hostname para LER a config. Aqui é a escolha explícita do admin
 * sobre QUAL fatia de config (config/modules[env], config/featureFlags[env])
 * está editando. Persistido em localStorage.
 */
export type AdminEnv = 'staging' | 'prod';

const KEY = 'admin_env';

export function getAdminEnv(): AdminEnv {
  try {
    return localStorage.getItem(KEY) === 'prod' ? 'prod' : 'staging';
  } catch {
    return 'staging';
  }
}

export function persistAdminEnv(env: AdminEnv): void {
  try {
    localStorage.setItem(KEY, env);
  } catch {
    /* localStorage indisponível */
  }
}
