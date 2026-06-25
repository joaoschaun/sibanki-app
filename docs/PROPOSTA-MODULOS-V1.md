# Proposta de Módulos da v1 (lançamento de teste) — Sibanki/CECI

> Decisão de produto (22/06/2026, revisada). Objetivo: na v1 de teste (sem Open
> Finance, manual-first, foco no motor + voz CECI), deixar o **núcleo financeiro**
> ligado e **parquear** o periférico. Tudo é reversível **over-the-air** via
> `config/modules` no admin — sem rebuild nem reenvio à loja.
>
> **Revisão:** após auditar o código, Crédito, Investimentos e Família entram
> **ligados** (estão construídos e funcionam manual-first). Só Família tem ressalva
> de plano/placement (ver abaixo).

---

## Princípio

O teste mede **o motor de captura** (manual/foto/voz) + **a CECI**. A v1 gira em
torno do laço **lançar → ver → perguntar à CECI**. Módulos que dependem de
integrações imaturas (Loja/Lomadee) ou que dispersam o foco entram **depois**,
acendendo um a um conforme ficam prontos.

> `assistente`, `painel`, `perfil` e `configuracoes` são **essenciais** — sempre
> ligados, ignoram override. Não entram no JSON.

---

## v1 — LIGADOS (núcleo financeiro)

| Módulo | key | Estado verificado no código |
|---|---|---|
| Lançamentos | `lancamentos` | **É o motor.** Coração do teste. |
| Contas | `contas` | Saldos = base do patrimônio e do Ld. |
| Crédito | `credito` | `Cards.tsx`/`CreditHub.tsx` com 7 `try/catch` — tratamento de erro presente. Core de finanças. **Smoke-test no mobile na Camada A.** |
| Investimentos | `investimentos` | `Growth.tsx` degrada com elegância (EmptyState + catch); investimento é **adicionado manualmente** → funciona sem Open Finance. Diferencial. |
| Orçamento | `orcamento` | Reforça o valor do lançamento (gasto vs teto). |
| Metas | `metas` | Objetivo dá sentido ao acompanhamento. |
| Recorrentes | `recorrentes` | Multiplica o valor da entrada manual. |
| Família | `familia` | **Construído e funcional** (convite a parceiro). Ressalva: é **premium** e **precisa de 2 pessoas** → ver nota. |

*(+ essenciais: Assistente/CECI, Painel, Perfil, Configurações.)*

### Nota sobre Família
- Módulo **ligado/acessível**, mas **não deve ser aba de destaque** no bottom nav
  da v1: testador solo no free toca e bate em **upsell**. O 4º slot do bottom nav
  fica melhor com o **botão central CECI/lançar** (Camada B).
- Decidir o **plano no teste**: flag `familia_compartilhado` hoje é `plans:['familia']`.
  Para testers experimentarem, liberar temporariamente (fase de construção).

## v1 — PARQUEADOS (acender depois, over-the-air)

| Módulo | key | Motivo |
|---|---|---|
| Loja | `loja` | Catálogo Lomadee instável (pendência operacional). **Não pronto.** |
| Credi Amigo | `credi_amigo` | Empréstimo P2P — fora da tese do teste. |
| Consórcio | `consorcio` | Fora da tese do teste. |
| Relatórios | `relatorios` | PDF é pro; secundário no teste. |
| Calendário | `calendario` | Nice-to-have. |
| Educação | `educacao` | Conteúdo; não mede o motor. |
| Ferramentas | `ferramentas` | Calculadoras avulsas. |
| FIRE | `fire` | Nicho. |
| Meu CPF | `meu_cpf` | Depende de integração externa; off-thesis. |
| SibCoin | `sibcoin` | Gamificação — acender depois para retenção. |
| Filiados | `filiados` | Indicações — fase de crescimento, não de teste. |

---

## JSON para colar em `config/modules` (admin → Módulos)

Staging fica com tudo ligado; prod recebe a v1.

```json
{
  "prod": {
    "lancamentos": true,
    "contas": true,
    "credito": true,
    "investimentos": true,
    "orcamento": true,
    "metas": true,
    "recorrentes": true,
    "familia": true,

    "loja": false,
    "credi_amigo": false,
    "consorcio": false,
    "relatorios": false,
    "calendario": false,
    "educacao": false,
    "ferramentas": false,
    "fire": false,
    "meu_cpf": false,
    "sibcoin": false,
    "filiados": false
  },
  "staging": {
    "lancamentos": true, "contas": true, "credito": true, "investimentos": true,
    "orcamento": true, "metas": true, "recorrentes": true, "familia": true,
    "loja": true, "credi_amigo": true, "consorcio": true, "relatorios": true,
    "calendario": true, "educacao": true, "ferramentas": true, "fire": true,
    "meu_cpf": true, "sibcoin": true, "filiados": true
  }
}
```

---

## Efeitos colaterais previstos

- **ModuleGuard** já redireciona acesso direto a rota parqueada — sem links quebrados.
- Reversível na hora: acender um módulo = `false`→`true` no admin; o app nativo
  instalado obedece sem update na loja.
- **Bottom nav:** Família fica acessível pelo Menu/rota, mas o 4º slot do bottom nav
  vai para o **botão CECI/lançar** na Camada B (melhor para testador solo).

## Pendência

Confirmar o **plano dos testers** (para Família e demais features Pro funcionarem
no teste) — é toggle de admin, não código.
