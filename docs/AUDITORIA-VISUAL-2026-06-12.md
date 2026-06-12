# Auditoria Visual do App — 12/06/2026 (Claude Cowork)

> Método: login com conta de teste via Playwright, screenshots de 16 rotas em desktop (1440px)
> e principais em mobile (iPhone 13). Evidências em `screenshots/audit*-*.png`.
> Critério: o mesmo padrão da landing (www.sibanki.com.br) e do design system Pierre.

## Veredito geral

O app tem **fundação boa** (dark consistente, tipografia Inter, dados bem estruturados) mas
sofre de **três doenças sistêmicas**: onboarding em guerra consigo mesmo, cores fora do design
system em todos os CTAs, e navegação que muda de forma sozinha. Nenhuma é difícil de curar.
O nível visual hoje: **6/10**. A landing está 9/10 — o delta é o "déficit visual" percebido.

---

## 1. CRÍTICO — Onboarding em guerra (3 camadas simultâneas)

Evidência: `audit-d-consultor.png`, `audit4-dashboard.png`

- Na primeira sessão, **três fluxos disparam ao mesmo tempo, empilhados**:
  1. `RegistrationWizard` (modal "Identidade — Etapa 1 de 6")
  2. `OnboardingTour` ("Bem-vindo ao Sibanki! — 1 de **15**")
  3. `SpotlightTour` ("Menu principal — 1/6")
- O "Depois" do wizard **não persiste** — o modal reaparece a cada navegação de rota.
- Tour de 15 passos é 3× o aceitável (3–5 passos é o teto da indústria).
- Todos usam **botões azuis** que não existem no design system.

**Correção proposta:**
- Um único fluxo: wizard (1ª entrada apenas, "Depois" persistido em Firestore).
- Matar `OnboardingTour` e `SpotlightTour`. Substituir por **empty states ricos** — a tela
  vazia de cada módulo ensina o módulo (ver §5).

## 2. ALTO — Cores fora do design system (o app não parece o produto da landing)

Evidência: `audit4-lancamentos.png`, `audit4-credito.png`, `audit4-crescimento.png`

- Botões primários **azuis** (`Novo lançamento`, `PDF`, `Importar`, `Continuar`, pill `Hoje`,
  aba `Lançar`): o Pierre manda botões neutros; o primário canônico é **branco com texto preto**
  (como landing e login novo).
- Aba ativa **roxa** no Hub de Crédito (`Visão Geral`) — roxo não existe na paleta.
- Chips de sugestão do chat em azul/roxo.
- Banner **"Missão" âmbar full-width** no topo de Lançamentos/Crescimento compete com o
  conteúdo principal em toda página.

**Correção proposta:** varredura global de CTAs → neutro/branco; cor reservada a **dados
semânticos** (verde positivo, rosa negativo, âmbar alerta); missões SibCoin viram chip
discreto no header da página (ícone moeda + "+50 SC"), não banner.

## 3. ALTO — Sidebar: modos "simples/completo" (o problema apontado pelo João)

Evidência: `audit4-consultor.png` (8 itens) vs `audit4-loja.png` (14 itens auto-expandido)

- Dois modos (simples/completo) com **auto-expansão quando a rota ativa está oculta** →
  o menu muda de forma sozinho conforme você navega. Desorienta e parece bug.
- Três conceitos de "tem mais coisa": `MENU COMPLETO`, `MAIS ⌄`, e categorias que aparecem
  e somem (SOCIAL só existe no modo completo).
- Header duplica a marca: logo `sibanki` na sidebar + texto `SIBANKI` no header.
- Toggle `Painel | Assistente` no header **compete com a sidebar** (Assistente está nos dois
  lugares; dois sistemas de navegação para a mesma coisa).

**Correção proposta (Sidebar 2.0 — um modo só):**
```
[logo sibanki]
─ Assistente
─ Painel
─ Lançamentos
─ Contas
─ Crédito
─ Investimentos
▸ Mais  (colapsável, fechado por padrão, estado persistido;
         NUNCA auto-expande — rota oculta ativa = badge no "Mais")
   Orçamento · Metas · Recorrentes · Calendário · Loja ·
   SibCoin · Social · Família · Educação · Ferramentas · Soluções
─────────
Perfil · Configurações
```
- Header: remover texto `SIBANKI` e o toggle `Painel|Assistente`. Fica: título da página
  (breadcrumb) à esquerda; tema/notificações/avatar à direita.
- FAB "Falar com o Assistente": reduzir para botão circular com ícone (o atual botão-pílula
  branco grande compete com CTAs da página).

## 4. ALTO — Chat do consultor: layout 2015

Evidência: `audit4-consultor.png`

- Boas-vindas = card de texto com bullets ("Você pode: • Lançar • Tirar dúvidas…").
- Vazio enorme no meio; composer pequeno no rodapé do card; chips coloridos.
- Header da página (`Consultor IA` + ícone azul + pills `Online`/`Consultas hoje: 0`)
  consome ~140px antes do conteúdo.

**Correção proposta (Chat 2.0, padrão ChatGPT/Claude):**
- Estado vazio: saudação grande centrada com dado real ("Boa noite, João. Seu Ld está em
  127 dias.") + **4 cards de sugestão 2×2 neutros** + **composer central grande**; ao enviar,
  composer ancora no rodapé.
- Mensagens da IA **sem bolha** (texto direto, avatar banquinho 24px), usuário em bolha
  branca à direita — exatamente como o mockup da landing (que já está aprovado).
- Briefing do dia = primeiro cartão de sistema rico (Ld, alertas, ações), não parágrafo.
- Pills de status saem do header → indicador discreto no composer.

## 5. MÉDIO — Densidade, polish e empty states

- Sem `max-width` de conteúdo: linhas de 1200px+ no Hub de Crédito (ideal ~1080px).
- Empty states genéricos ("Nenhum lançamento para o período") com botão azul — cada um
  deveria vender o módulo: ilustração leve + 1 frase de valor + ação primária + ação com IA
  ("Lançar por voz com o Assistente").
- Capitalização de dados: "nu bank" → "Nubank" (normalizar via `bankData`).
- Espaçamentos de card variam entre páginas (20/24/28px) — padronizar tokens.
- Mobile: login novo está excelente; bottom navigation (em curso pelo Antigravity) vai
  resolver o alcance de polegar — manter coerência com a Sidebar 2.0.

---

## Plano de execução sugerido

| Sprint | Entrega | Impacto |
|---|---|---|
| S1 | Matar tours duplicados + persistir "Depois" do wizard; varredura de cor dos CTAs; Sidebar 2.0 | Remove 80% do "déficit visual" percebido |
| S2 | Chat 2.0 (estado vazio + mensagens sem bolha + briefing-cartão); header simplificado | Coração do produto no nível da landing |
| S3 | Empty states ricos por módulo; max-width; tokens de espaçamento; normalização de dados | Polish final |

> Observação: trabalho de billing (Asaas) e BottomNavigation do Antigravity estão em curso
> na árvore — coordenar S1 para não colidir com `Sidebar.tsx`/`App.tsx` até o commit deles.
