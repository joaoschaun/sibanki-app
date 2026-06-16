/**
 * environment.ts — detecta o ambiente do app pelo hostname.
 *
 * Staging e produção compartilham o MESMO Firebase project, então a config
 * (config/modules, config/featureFlags) é escopada por ambiente: o documento
 * guarda `{ prod: {...}, staging: {...} }` e o app lê a fatia do seu ambiente.
 * Assim dá pra ligar/desligar módulos no staging sem afetar produção.
 */

export type AppEnv = 'prod' | 'staging';

export function getAppEnv(): AppEnv {
  if (typeof window === 'undefined') return 'prod';
  const h = window.location.hostname;
  // Staging e dev local usam a config de staging; o resto (incl. domínio
  // próprio sibanki.com.br e *.web.app de produção) usa produção.
  if (
    h.includes('staging-13a0b') ||
    h === 'localhost' ||
    h === '127.0.0.1'
  ) {
    return 'staging';
  }
  return 'prod';
}
