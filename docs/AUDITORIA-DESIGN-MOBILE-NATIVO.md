# Auditoria de Design Mobile → Nativo (Capacitor) — Sibanki

> Análise técnica do design atual sob a lente de **analista de design de app** e
> **analista de produto** (22/06/2026). Base: leitura do código (`index.css`,
> `index.html`, `App.tsx`, layout `Header`/`Sidebar`/`BottomNavigation`, FAB).
> Objetivo: dizer com honestidade o que fazer com o design antes de empacotar
> em Capacitor para a Play Store.

---

## Diagnóstico em uma frase

**Você não tem um problema de design — tem um problema de *nativização* e de *foco*.**
O design system (Pierre Finance) é maduro e coerente; o que falta são os ajustes
que separam "PWA embrulhada" de "app nativo de verdade", mais uma decisão de
produto sobre o que destacar na v1. Um overhaul completo do DS seria caro,
arriscado e contra a tese de "lançar pra validar o motor".

---

## O que já está BOM (não mexer)

| Item | Evidência |
|---|---|
| Sistema de tokens semântico (dark/light, superfícies, bordas, escala de texto, cores de categoria, paleta de feedback com regra formal) | `src/index.css` (326 linhas, bem estruturado) |
| Meta tags mobile já corretas: `viewport-fit=cover`, `theme-color`, PWA iOS, splash screens por device | `index.html` (linhas 5–9 + apple-touch-startup-image) |
| **Arquitetura mobile real já existe**: bottom nav (`lg:hidden`), sidebar como drawer no mobile + inline no desktop, header, FAB | `App.tsx` (210–331), `BottomNavigation.tsx` |
| Bottom nav **já respeita safe area inferior** | `BottomNavigation.tsx:49` → `pb-[env(safe-area-inset-bottom,0px)]` |
| Conteúdo já tem `pb-20` no mobile pra não ficar sob o bottom nav, e `max-w-[1180px]` pra telas largas | `App.tsx:250–251` |
| Linguagem visual coerente e adulta (preto puro, monocromático, ALL CAPS) | `index.css` |

**Conclusão:** a fundação dispensa redesenho. Isso é um ativo, não um passivo.

---

## Lacunas de NATIVIZAÇÃO (o que faz parecer "web embrulhada")

Severidade: 🔴 bloqueia lançamento nativo crível · 🟡 alto impacto de "feel" · 🟢 polimento

### 🔴 1. Área segura SUPERIOR não tratada
O `Header` é `h-14` sem `env(safe-area-inset-top)` nem padding de topo
(`Header.tsx:83`). Num shell Capacitor edge-to-edge com status bar translúcida
(que o `black-translucent` já pressupõe), o conteúdo do header **colide com o
relógio/notch**. É o sinal nº 1 de app não-nativo. *Hoje só o bottom nav trata
safe area; o topo está descoberto.*

### 🔴 2. FAB ignora safe area e o bottom nav
O botão flutuante do Assistente é `fixed bottom-6 right-6` (24px fixo) —
`App.tsx:117`. No mobile ele **sobrepõe o bottom nav** (56px + inset inferior).
Precisa subir pra acima da nav e somar `env(safe-area-inset-bottom)`.

### 🔴 3. Sem primitivos de "toque nativo"
O `index.css` não tem `-webkit-tap-highlight-color` (Android WebView pinta um
flash cinza/azul ao tocar), nem `overscroll-behavior`, nem controle de
`user-select`. Sem haptics em lugar nenhum. São poucas linhas, mas é o que mais
muda a percepção de "app de verdade".

### 🟡 4. UI dependente de hover em escala
**571 ocorrências de `hover:`** no `src`. Em touch, hover é morto ou "gruda".
O menu do avatar (`Header.tsx`) revela/realça por hover; falta estado
`:active`/pressionado em quase tudo. Garantir que **nada seja acessível só por
hover** e adicionar feedback de toque.

### 🟡 5. Alvos de toque inconsistentes
Apenas ~19 alvos com 44px+ explícitos em todo o app. Itens de menu são `py-2.5`
(~40px) e vários botões de ícone provavelmente ficam < 44px (mínimo Apple/Google
é 44–48px). Precisa de uma passada nas linhas de lista, chips e ícones das telas
do core.

### 🟡 6. Teclado nativo não tratado
`main` é o container de scroll (`overflow-y-auto`). Com teclado nativo, inputs
embaixo (composer do chat, formulários) ficam cobertos. Precisa do plugin
`Keyboard` do Capacitor + modo de resize.

### 🟢 7. Status bar / splash nativos
Hoje é splash de PWA. Capacitor pede config dos plugins `StatusBar` e
`SplashScreen` (estilo, overlay, cor `#0a0a0a`) pra não dar "flash branco".

### 🟢 8. Transição de telas instantânea
Troca de rota é swap imediato do React Router; usuário nativo espera movimento
(push/pop). Existe `PageTransition.tsx` — vale confirmar uso e padronizar.

### 🟢 9. Legibilidade do texto mínimo
Labels em `text-[9px]`/`text-[10px]` ALL CAPS são elegantes, mas no telefone
alguns ficam no piso da legibilidade. Passada rápida nos menores.

---

## Lente de PRODUTO (mais importante que o cosmético)

### A. O gesto mais importante da sua tese não está em destaque
Sua aposta na v1 é **entrada rápida (manual/voz/CECI)**. Hoje "Assistente" é
só mais uma aba do bottom nav. O ato de **lançar** (e o de **falar com a CECI**)
deveria ser **um toque do polegar de qualquer tela** — tipicamente um botão
central "+"/microfone em destaque no bottom nav. Isso é decisão de produto, não
enfeite: alinha a interface ao motivo do lançamento.

### B. Risco real não é feiura — é sobrecarga
São **40+ rotas** e um leque enorme de módulos (crédito, loja, consórcio,
cripto, FIRE, filhos, casal…). Para um lançamento de teste, isso dispersa o
usuário do que você quer medir: o motor. Você **já tem `useModuleFlags`** — dá
pra **parquear módulos não-essenciais atrás do "Menu"** na v1 e deixar o core
limpo (Lançar · Ver · CECI · Família). Menos é mais aqui.

---

## Recomendação — o que fazer (e o que NÃO fazer)

**NÃO fazer:** overhaul do design system, nem redesign visual das 40 telas. O DS
é bom; o custo/risco não se paga e atrasaria o lançamento.

**Fazer, em 3 camadas:**

### Camada A — Nativização (obrigatória, ~3–5 dias)
Desbloqueia um lançamento nativo crível. É CSS/layout + config de plugins:
1. Safe area superior no `Header` (e em modais/drawers full-screen).
2. FAB acima do bottom nav + safe area inferior.
3. `index.css`: reset de tap-highlight, `overscroll-behavior`, `user-select`,
   estados `:active`/pressionado, haptics utilitário.
4. Passada de touch-targets (44px+) nas telas do core.
5. Plugins Capacitor: `StatusBar`, `SplashScreen`, `Keyboard`.

### Camada B — Foco de produto (alto ROI, ~3–5 dias)
6. Botão central de **lançar/CECI** no bottom nav (1 toque pra entrada por voz).
7. Parquear módulos não-core atrás do Menu via `useModuleFlags` (v1 enxuta).
8. Legibilidade dos labels mínimos.

### Camada C — Pós-tração (adiar)
9. Restyle visual das telas usando os primitivos já criados (`Button`, `Card`…).
10. Motion/transições de página.
11. Migração completa das telas pro design system novo.

---

## Veredito

Comece a migração Capacitor **agora** com a **Camada A** rodando em paralelo — são
ajustes pequenos e localizados, sem tocar na identidade visual. Faça a **Camada B**
antes de abrir o teste (é o que conecta a interface à sua tese de voz/entrada
rápida). Deixe a **Camada C** explicitamente para depois de ter tração. Assim você
entra na loja com cara de app nativo e com o diferencial de voz em destaque —
**sem** pagar o custo de um redesign que você não precisa.
