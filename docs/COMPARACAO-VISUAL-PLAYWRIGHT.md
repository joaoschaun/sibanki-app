# Comparação visual Legado vs React (Playwright)

Sempre que você **atualizar um módulo** no app React, use o Playwright para comparar visualmente com o legado e garantir que a experiência está alinhada.

## URLs (React vs Legado)

| App    | URL |
|--------|-----|
| **Legado** | https://virtus-financeiro-cd7bd.web.app/app/ |
| **React**  | https://staging-13a0b.web.app |

O React fica em `/` no staging. O Legado está em `/app/` na produção.

## O que foi configurado

- **`tests/compare-modulos-legado.spec.js`** – faz login no app legado (`/app/`), navega por cada módulo e salva um screenshot em `screenshots/compare/legado/`.
- **`tests/compare-modulos-react.spec.js`** – faz login no app React (raiz), navega por cada módulo e salva um screenshot em `screenshots/compare/react/`.

Assim você pode abrir as duas pastas lado a lado e comparar **Dashboard**, **Contas**, **Cartões**, **Lançamentos**, etc.

## Como rodar

### 1. Credenciais de teste

Use um usuário de teste (e-mail/senha) que exista tanto no legado quanto no React (mesmo Firebase):

```bash
# Windows (PowerShell)
$env:TEST_EMAIL="seu-teste@email.com"; $env:TEST_SENHA="suasenha"

# Linux/macOS
export TEST_EMAIL=seu-teste@email.com
export TEST_SENHA=suasenha
```

### 2. Legado e React (padrão)

Por padrão os dois testes usam:

- **Legado:** `https://virtus-financeiro-cd7bd.web.app/app`
- **React:** `https://staging-13a0b.web.app`

Não é preciso subir nada localmente; basta ter deploy em staging e as credenciais acima.

Para legado em outra URL (ex.: local):  
`$env:LEGACY_BASE_URL="http://localhost:3000/app"`

Para React local:  
`$env:REACT_BASE_URL="http://localhost:5173"`

### 3. Comandos

```bash
# Comparação completa (legado + React no staging)
npm run test:compare

# Só capturar screenshots do React (staging)
npm run test:compare:react

# Só capturar screenshots do Legado (staging /app/)
npm run test:compare:legado
```

**Exemplo (PowerShell):**

```powershell
$env:TEST_EMAIL="teste@email.com"
$env:TEST_SENHA="sua_senha"
npm run test:compare
```

Depois abra a pasta `screenshots/compare/`: dentro de `legado/` e `react/` estarão os PNGs nomeados por módulo (ex.: `01-Dashboard.png`, `02-Contas.png`). Compare os mesmos números/nomes entre as duas pastas.

## Fluxo recomendado ao atualizar um módulo

1. Implementar ou ajustar o módulo no React.
2. Rodar `npm run test:compare` (ou pelo menos `npm run test:compare:react` se não for comparar com o legado agora).
3. Abrir `screenshots/compare/legado` e `screenshots/compare/react` e comparar o módulo alterado.
4. Ajustar layout/Texto/UX no React até ficar satisfeito em relação ao legado (ou à intenção desejada).

## Mapeamento módulo legado → React

| Legado (id / aba) | React (rota)        | Arquivo screenshot      |
|-------------------|---------------------|-------------------------|
| dash              | /                   | 01-Dashboard.png        |
| lanc              | /lancamentos        | 02-Lancamentos.png      |
| contas            | /contas             | 03-Contas.png           |
| cartões           | /cartoes            | 04-Cartoes.png          |
| invest            | /crescimento        | 05-Crescimento.png      |
| metas             | /planejamento       | 06-Planejamento.png     |
| orçamento         | /orcamento          | 07-Orcamento.png        |
| ia                | /consultor-ia       | 08-Consultor-IA.png     |
| dicas             | /educacao           | 09-Educacao.png         |
| comunidade        | /social             | 10-Social.png           |
| perfil            | /perfil             | 11-Perfil.png           |
| config            | /configuracoes      | 12-Configuracoes.png    |

O React tem ainda **Recorrentes** (`/recorrentes`), que no legado pode estar em outra aba; no compare-react ele aparece como 05-Recorrentes (e o restante dos números desloca).
