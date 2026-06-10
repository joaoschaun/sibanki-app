# FUNIL DE ATIVAÇÃO — instrumentação e consulta (Ação #3 da Análise 360)

## Eventos (coleção `platform_events` + espelho `users/{uid}/platform_events`)

| Evento | Quando dispara | Onde no código |
|---|---|---|
| `activation_signup_completed` | Usuário conclui o RegistrationWizard | `RegistrationWizard.handleSave` |
| `activation_of_connected` | `openFinanceStatus` vira `ativo` (1ª vez por uid) | `AppContext` |
| `activation_first_entry` | Primeiro lançamento visível no contexto (1ª vez por uid) | `AppContext` |
| `activation_ld_computed` | Primeiro Ld real calculado (0 < days < 99999) | `IntelligenceContext` |

Todos com dedup por uid via localStorage (trocar de device pode re-disparar —
aceitável; dedupe final por uid na consulta). Allowlist server-side em
`functions/index.js` (`PLATFORM_EVENT_ALLOWLIST`).

## O funil D0 → D7

```
cadastro (signup_completed)
  → conexão OF (of_connected)        [meta: ≥ 40%]
  → primeiro lançamento (first_entry) [meta: ≥ 70%]
  → Ld real calculado (ld_computed)   [meta: ≥ 60%]  ← momento "uau"
  → retorno D7 (login 7 dias depois)  [meta: ≥ 25%]
```

Retorno D7: não há evento próprio — derive de `triggerSibcoinEvent login_streak`
(coleção sibcoin) ou do `lastLoginAt`, comparando com `cadastroCompletoEm`.

## Consulta rápida (Node + Admin SDK)

```js
// scripts/funnel-report.mjs (esqueleto)
const since = new Date(Date.now() - 30 * 864e5);
const evs = await db.collection('platform_events')
  .where('ts', '>=', since).get();
const byUser = {};
evs.forEach((d) => {
  const { uid, name } = d.data();
  (byUser[uid] ??= new Set()).add(name);
});
const total = Object.keys(byUser).length;
const count = (n) => Object.values(byUser).filter((s) => s.has(n)).length;
console.table({
  usuarios_com_evento: total,
  signup: count('activation_signup_completed'),
  of: count('activation_of_connected'),
  first_entry: count('activation_first_entry'),
  ld: count('activation_ld_computed'),
});
```

## Pendências
- Deploy de `functions:trackPlatformEvent` (allowlist nova) antes do front.
- Índice composto em `platform_events (ts)` se a consulta reclamar.
- Quando houver volume: avaliar Amplitude/PostHog em vez de Firestore puro.
