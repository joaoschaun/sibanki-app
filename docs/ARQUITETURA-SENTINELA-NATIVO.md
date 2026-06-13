# Sentinela Nativo — Arquitetura do Guardião em Background

> 13/06/2026 (Claude Cowork). Visão do João: GPS rodando em background no app nativo;
> o Sentinela cruza a situação financeira do cliente com o comportamento de localização
> e intervém ANTES do erro — ex.: cliente sob pressão financeira saindo numa quarta à
> noite rumo a bar/restaurante → alerta do Arquiteto.
>
> Complementa `docs/ANALISE-SENTINELA-2026-06-13.md` (motor de cenários já pronto).

## 1. Princípio de produto: Guardião, não vigilante

A mesma feature pode ser mágica ou assustadora — a diferença é QUEM pediu.

- **Modo Guardião é ATIVADO pelo usuário**, com regras que ELE escolhe:
  - "Me segura: alerta se eu for a bares/restaurantes em dia de semana"
  - "Modo economia até dia 10: alerta em qualquer gatilho de gasto"
  - "Protege meu orçamento de Alimentação quando passar de 80%"
- O app nunca "descobre e denuncia"; ele **cumpre um pedido de autocontrole** que o
  próprio usuário fez. Isso resolve simultaneamente:
  - **Ética/percepção**: empoderamento, não paternalismo.
  - **LGPD**: base legal = consentimento específico e revogável, finalidade explícita
    (art. 7º I e 11). Localização contínua + perfil financeiro = tratamento de alto
    risco → exige RIPD (Relatório de Impacto), opt-in granular e fácil desligar.
- Copy de ativação (exemplo): *"Eu, João, peço ao Sentinela que me proteja de mim
  mesmo nestas situações. Posso desativar quando quiser."*

## 2. Stack nativa recomendada: Capacitor sobre o React atual

| Opção | Veredito |
|---|---|
| **Capacitor (Ionic)** | ✅ **Recomendada.** Embrulha o SPA React existente sem reescrever; plugins nativos para geofencing/push; mesma base de código web+iOS+Android; time atual mantém. |
| React Native/Expo | Reescrever toda a UI (meses). Só se um dia o app precisar de 60fps nativo. |
| PWA puro | ❌ Sem GPS em background (web não permite; Geofencing API morreu). |

- **Plugin de background**: `@transistorsoft/capacitor-background-geolocation` —
  padrão da indústria (licença ~US$ 399 one-time por app; vale cada centavo: lida com
  Doze mode, headless Android, motion-detection p/ bateria).
- Push: FCM já existe no projeto (PWA) → reaproveita no nativo.
- Build/loja: Capacitor gera projetos Xcode/Android Studio; CI depois.

## 3. Arquitetura: inteligência NO DISPOSITIVO (privacy by design)

Regra de ouro: **a localização contínua não sai do telefone.**

```
┌─ Servidor (Firebase) ────────────────────────────────┐
│ • Snapshot financeiro (Ld, healthLevel, orçamentos)  │──┐ sync 1×/dia
│ • Regras do Guardião escolhidas pelo usuário         │  │ (download)
│ • Geofences de interesse (POIs por geohash, cache)   │  │
└──────────────────────────────────────────────────────┘  ▼
┌─ Dispositivo (Capacitor) ────────────────────────────────────────────┐
│ 1. Plugin geofencing acorda o app ao ENTRAR num POI (não streaming)  │
│ 2. Motor local avalia: cenário × regra × snapshot × dia/horário     │
│ 3. Disparo = NOTIFICAÇÃO LOCAL (mensagem do Arquiteto já pronta)    │
│ 4. Telemetria mínima p/ servidor: {cenario, regra, acatou?} —       │
│    SEM lat/lng, SEM nome do local                                    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Geofences locais**: ao invés de mandar cada posição ao servidor, o app baixa POIs
  da região do usuário (Overpass → cache Firestore por geohash, já recomendado na
  análise) e registra geofences no SO (iOS: ~20 regiões; Android: 100). Atualiza o
  conjunto quando o usuário muda de área (geofence "guarda-chuva" de ~2km).
- **Motor de regras local** (TS compartilhado com a web):
  `risco = f(healthLevel, orçamento da categoria, dia da semana, hora, cenário)`
  - Ex. regra do João: `healthLevel ∈ {pressao, critico} && cenario ∈ {food_venue,bar}
    && dia ∈ seg–qui && hora ≥ 19h → alerta "guardião"`.
  - Mensagens: reusar `buildGeoAlert` + novos templates noturnos ("São 21h de quarta.
    Seu Ld está em 23 dias. O Arquiteto segura a porta: jantar em casa hoje vale
    +0,4 dia de liberdade.").
- **Cooldowns**: máx. 1 alerta/3h e 3/dia; nunca repetir mesmo POI no dia. Alerta
  irritante = desinstalação.

## 4. Realidades do background (sem ilusão)

- **iOS**: background location exige justificativa na revisão da App Store (temos:
  feature central, opt-in, UI clara). Banner azul/indicador de localização aparece.
  Geofencing nativo (região monitoring) é confiável e leve.
- **Android**: permissão "Permitir o tempo todo" (tela própria do SO, 2 passos);
  foreground service com notificação persistente discreta OU geofencing API do Play
  Services (melhor bateria, menos garantias). Plugin Transistorsoft abstrai os dois.
- **Bateria**: geofencing por região ≈ consumo desprezível; tracking contínuo ≈ 5-8%/dia.
  Por isso a arquitetura é por GEOFENCE, não por stream.
- **Headless**: alertas devem funcionar com app morto → handlers headless do plugin.

## 5. Fases de entrega

| Fase | Entrega | Pré-requisitos | Esforço |
|---|---|---|---|
| **F0 — agora (web)** | Card "Verificar onde estou" no Painel + fix `phone` server-side + opt-in/Política | nada | 1 sessão |
| **F1 — casca nativa** | Capacitor envelopando o app atual; push nativo; lojas (TestFlight/Internal) | contas Apple US$99/ano + Play US$25 | 1-2 semanas |
| **F2 — geofencing** | Plugin Transistorsoft + POIs por geohash + notificação local com cenário | licença plugin; cache Overpass | 2-3 semanas |
| **F3 — Modo Guardião** | Regras configuráveis pelo usuário + motor local + templates noturnos + cooldowns | F2; RIPD/LGPD assinado | 2 semanas |
| **F4 — aprendizado** | Padrões pessoais (ex.: recorrência de bar às quartas) calculados NO dispositivo | F3 + telemetria de acato | contínuo |

## 6. Comercial

- **Modo Guardião = a cara do plano Pro.** "O app que te segura na porta do bar quando
  você pediu" é demo de 30 segundos que vende sozinha — imprensa adora.
- Gratuito: checagem manual (F0). Pro: Guardião 24/7 + WhatsApp + regras ilimitadas.
- App nas lojas também resolve distribuição/credibilidade (hoje só PWA).

## 7. Decisões que ficam com o João

1. Orçamento: licença Transistorsoft (~US$399) + Apple Developer (US$99/ano) + Play (US$25).
2. RIPD/LGPD: redigir com revisão jurídica antes do F3 (F0–F2 não rastreiam em background).
3. Nome público da feature: "Sentinela" (vigia) vs "Guardião" (aliado) — recomendo
   **Modo Guardião** para o background; "Sentinela" fica para a checagem pontual.
