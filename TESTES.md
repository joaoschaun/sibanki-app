# Testes E2E - Sibanki / Virtus Financeiro

Testes automatizados com Playwright para detectar erros e validar o fluxo do app.

## Comandos rápidos

| Comando | Descrição | Tempo aprox. |
|---------|-----------|---------------|
| `npm run test:smoke` | Smoke test rápido (login + checagem de erros) | ~30s |
| `npm run test:fluxo` | Fluxo completo (login → despesa → meta → IA) | ~60s |
| `npm run test:erros` | Diagnóstico: captura erros do console após login | ~20s |
| `npm run test` | Roda todos os testes | ~2min |
| `npm run test:ui` | Interface visual para debugar testes | - |
| `npm run report` | Abre relatório HTML dos últimos testes | - |

## Credenciais

Use variáveis de ambiente para credenciais reais:

```bash
# PowerShell
$env:TEST_EMAIL="seu@email.com"; $env:TEST_SENHA="sua_senha"; npm run test:smoke

# CMD / Bash
set TEST_EMAIL=seu@email.com && set TEST_SENHA=sua_senha && npm run test:smoke
```

Padrão (se não definir): `teste@gmail.com` / `123456`

## O que os testes verificam

### Smoke
- Página carrega sem erros críticos de JS (`renderAll`, `addE`, `addMeta`, `addInv` indefinidos)
- Login funciona e app carrega
- Funções globais existem após login

### Fluxo completo
- Login → Dashboard → Screenshot
- Criar despesa R$ 50 em Alimentação
- Criar meta R$ 10.000
- Análise da IA aparece
- Falha se houver erros críticos no console

### Check erros
- Faz login e lista todos os erros e warnings do console
- Útil para diagnóstico (ex: permission-denied, erros de rede)

## Instalação

```bash
npm install
npx playwright install chromium
```

## Dicas

- **Antes do deploy:** rode `npm run test:smoke` para validar rapidamente
- **Após mudanças:** `npm run test:fluxo` para fluxo completo
- **Debug:** `npm run test:ui` abre interface para rodar testes passo a passo
- **Relatório:** após `npm run test`, use `npm run report` para ver detalhes
