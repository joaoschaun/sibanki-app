# Decisão de Empacotamento × Recursos de Voz — Sibanki/CECI

> Documento de decisão (22/06/2026). Objetivo: escolher o caminho de empacotamento
> nativo antes de investir, cruzando esforço com quais recursos de voz cada opção
> libera. Contexto: app hoje é PWA (React/Vite em Firebase Hosting), lançamento
> manual-first, meta de Play Store + experiência de voz "CECI, comprei 50 reais".

---

## As 3 opções em uma frase

- **TWA / Bubblewrap** — embrulha a PWA atual num app Android. Rápido e barato, mas é "a PWA dentro de uma casca". **Não dá acesso a recursos de sistema** (voz hands-free, App Actions, wake word).
- **Capacitor** — mantém seu código React, mas roda dentro de um container nativo com **ponte para APIs nativas e plugins**. Desbloqueia voz, atalhos do assistente, foreground service. **É o ponto ideal** para o seu caso.
- **Nativo puro (Kotlin/Swift)** — reescrita da camada de app. Máximo controle e performance, mas joga fora o reuso do React. Só se justifica muito mais à frente.

---

## Matriz 1 — Empacotamento × Recursos de Voz

| Recurso de voz | TWA/Bubblewrap | Capacitor | Nativo puro |
|---|:---:|:---:|:---:|
| STT dentro do app (abrir → falar → lançar) | ✅ (Web Speech, limitado) | ✅ (plugin nativo, robusto) | ✅ |
| Atalho de 1 toque (widget / tile / notificação) | ❌ | ✅ | ✅ |
| **App Actions (Android) / Siri Shortcuts (iOS)** — "Ok Google, lançar no Sibanki" hands-free | ❌ | ✅ | ✅ |
| **Wake word própria "CECI"** (foreground service, on-device) | ❌ | ✅ (via plugin Porcupine) | ✅ |
| Mic sempre-ligado, tela apagada, app morto (estilo Alexa de mesa) | ❌ | ⚠️ Não confiável* | ⚠️ Não confiável* |
| Push / OCR / câmera nativos | parcial | ✅ | ✅ |

\* *Nenhuma opção de app de loja entrega "Alexa 24h" de forma confiável — é privilégio do SO. O caminho honesto de hands-free é via App Actions/Siri Shortcuts.*

**Leitura:** a experiência "CECI" que você descreveu exige, no mínimo, **Capacitor**. TWA não serve para esse objetivo.

---

## Matriz 2 — Esforço, custo e manutenção

| Critério | TWA/Bubblewrap | Capacitor | Nativo puro |
|---|:---:|:---:|:---:|
| Reuso do código React atual | 100% | ~95% | ~0% |
| Esforço inicial | Baixo (dias) | Médio (1–3 semanas) | Alto (meses) |
| Curva de aprendizado | Mínima | Moderada (plugins/Android Studio) | Alta |
| Acesso a APIs nativas | Nenhum | Completo (via plugins) | Completo |
| iOS no mesmo código | ✅ | ✅ | ❌ (refaz) |
| Risco na revisão da Play Store | Baixo | Baixo–Médio (mic em background exige cuidado) | Médio |
| Manutenção a longo prazo | Trivial | Boa (um codebase web) | Pesada (2 codebases) |
| Pré-requisitos | `assetlinks.json` + keystore | + Android Studio/Xcode, plugins | Time nativo |

---

## Recomendação — caminho faseado

**Fase 0 — agora (manual-first):** já dá pra publicar com **TWA/Bubblewrap** só para validar o motor e começar a trazer usuários, SE você aceitar lançar sem voz hands-free no dia 1 (STT dentro do app já funciona). Vantagem: na Play Store em dias.

> Risco: se você publicar como TWA e depois migrar para Capacitor, é **outro binário/app** — melhor evitar trocar de pacote depois do lançamento. Por isso, se a voz "CECI" é central na proposta, **pule a Fase 0 e vá direto de Capacitor.**

**Fase 1 — Capacitor (recomendado como base real):**
1. Embrulhar o app React atual em Capacitor (reuso ~95%).
2. Plugin de STT nativo → ligar ao `entryCaptureOrchestrator` que já existe.
3. **App Actions (Android) + Siri Shortcuts (iOS)** → "CECI/Ok Google, lançar gasto" hands-free, usando o motor de voz do próprio celular (sem manter mic ligado).
4. Atalho de 1 toque (widget + ação na notificação) → 80% da sensação "CECI" com baixo esforço.

**Fase 2 — premium opcional:** wake word própria "CECI" via foreground service (Porcupine, on-device). Tratar como feature premium, **não** no lançamento — pesa bateria e atrai escrutínio da loja.

**Nativo puro:** só reavaliar se/quando performance ou um recurso muito específico de SO virar gargalo. Hoje não se justifica.

---

## Veredito

| Se seu objetivo é… | Escolha |
|---|---|
| Só validar o motor manual o mais rápido possível | TWA (Fase 0) |
| Lançar com a experiência de voz "CECI" como diferencial | **Capacitor (Fase 1)** — recomendado |
| Performance/SO de ponta no longo prazo | Nativo (futuro) |

**Decisão sugerida:** ir de **Capacitor**. É o único caminho que reusa quase todo o React, roda iOS+Android no mesmo código, e libera App Actions/Siri Shortcuts — o jeito real e aprovável de fazer "CECI, comprei 50 reais" hands-free. TWA economiza dias agora, mas custa uma re-migração depois e não entrega a voz que é o coração da sua ideia.

---

## Próximos passos concretos (se for Capacitor)

1. `npm i @capacitor/core @capacitor/cli` + `npx cap init` (aponta para o `dist/` do Vite).
2. Adicionar plataforma Android, abrir no Android Studio, gerar keystore + `assetlinks.json`.
3. Escolher plugin de STT (ex.: `@capacitor-community/speech-recognition`) e ligar ao orquestrador existente.
4. Registrar App Actions (`shortcuts.xml` / `actions.xml`) para o intent de lançamento.
5. Publicar versão interna (closed testing) na Play Console antes do aberto.
