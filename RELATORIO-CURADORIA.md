# Relatório de Curadoria do Sistema Legado — Sibanki

**Última execução:** _preencher após rodar `npm run test:curadoria`_  
**Ambiente:** _sibanki.com.br/app ou local_  
**Metodologia:** Auditoria E2E via Playwright (`tests/curadoria.spec.js`)

---

## 1. Resumo Executivo

| Item | Status | Observação |
|------|--------|------------|
| Login | ⬜ | _Ok / Falhou / Timeout_ |
| Módulos acessíveis | ⬜ / 17 | _Ex: 17/17 ou 15/17_ |
| Erros críticos no console | ⬜ | _0 ou lista_ |
| Screenshots | `screenshots/curadoria/` | _01-Dashboard.png ... 17-Perfil.png_ |
| Relatório JSON | `screenshots/curadoria/curadoria-report.json` | |

---

## 2. Módulos Auditados

| # | Módulo | Status | Tempo (ms) |
|---|--------|--------|------------|
| 1 | Dashboard | ⬜ | |
| 2 | Contas | ⬜ | |
| 3 | Cartões | ⬜ | |
| 4 | Lançamentos | ⬜ | |
| 5 | Metas | ⬜ | |
| 6 | Orçamento | ⬜ | |
| 7 | Calendário | ⬜ | |
| 8 | Investimentos | ⬜ | |
| 9 | Consultor IA | ⬜ | |
| 10 | Educação | ⬜ | |
| 11 | Família | ⬜ | |
| 12 | Social (Comunidade) | ⬜ | |
| 13 | Relatórios | ⬜ | |
| 14 | Conquistas | ⬜ | |
| 15 | Configurações | ⬜ | |
| 16 | Perfil | ⬜ | |

---

## 3. Erros do Console

_Listar erros relevantes (copiar de `curadoria-report.json` → `uniqErros`):_

- 
- 

### 3.1 CSP (Content Security Policy)

_Ex.: Cloudflare Insights bloqueado:_

```
script-src ... (bloqueou https://static.cloudflareinsights.com/...)
```

---

## 4. Recomendações

1. _Ex.: Aumentar timeout do login para 30s em produção (cold start)_
2. _Ex.: Incluir cloudflareinsights.com na CSP se necessário_
3. _Ex.: Validar credenciais de teste em produção_

---

## 5. Como Rodar

```bash
# Produção
$env:TEST_EMAIL="seu@email.com"
$env:TEST_SENHA="suasenha"
npm run test:curadoria

# Local (legado rodando)
$env:LEGACY_BASE_URL="http://localhost:3000/app"
npm run test:curadoria
```

Ver `docs/AUDITORIA-CURADORIA-LEGADO.md` para checklist completo e critérios.
