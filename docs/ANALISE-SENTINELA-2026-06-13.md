# Análise do Sentinela — 13/06/2026 (Claude Cowork)

> Escopo: Sentinela Geo (geofencing financeiro), Sentinela Weekly (resumo WhatsApp),
> Sugestão Tática de Cartão e o SentinelGuardModal. Lentes: design/UX, lógica e comercial.

## Veredito em uma frase

**O Sentinela é a feature mais diferenciada do Sibanki — e está 100% invisível para o
usuário.** O backend é maduro e criativo; o front simplesmente não o chama.

---

## 🚨 Achado principal: motor completo, zero ignição

| Peça | Estado |
|---|---|
| `sentinelaGeoCheck` (callable) | ✅ Deployada, auth ok, validação de coords |
| `sentinelaGeoService` (Overpass/OSM → cenário → mensagem) | ✅ 10 cenários, copy excelente |
| `cardSuggestionService` (qual cartão usar no local) | ✅ Integrado ao alerta |
| `sentinelaWeekly` (pubsub seg 11h UTC → WhatsApp) | ✅ Agendada; só usuários com `whatsappPhone` |
| `useSentinelaGeo` (hook front) | ⚠️ **ZERO consumidores** — código morto na UI |
| `SentinelGuardModal` | ⚠️ **ZERO usos** — componente órfão |
| Widget "Sentinela GPS" no Painel | ❌ Removido/perdido no refactor das sub-abas (#8) |
| `InsightDoDia` | ≠ Sentinela — é o insight Gemini (docs no CLAUDE.md confundem os dois) |

Consequência: nenhum usuário web jamais recebeu um alerta do Sentinela Geo. O Weekly
só alcança quem vinculou WhatsApp (fluxo de vinculação também pouco visível).

## Lógica — qualidade do que existe

**Pontos fortes:**
- Pipeline correto: GPS → Overpass (raio 100m) → cenário → mensagem com dados reais
  (Ld, Spread Gap, orçamento da categoria) → sugestão de cartão (prazo de fatura + benefício).
- Hardening da auditoria aplicado: timeout 12s na Overpass (SEN-1), validação de
  coordenadas (SEN-2), debounce de 5 min no hook.
- Copy dos 10 cenários é ouro puro de produto: concessionária ("carro financiado é
  passivo disfarçado de ativo"), banco ("ouça, anote, decida em casa — nunca no balcão"),
  farmácia (Farmácia Popular). Ninguém no mercado BR tem isso.
- Weekly: Ld portado da engine do front (SEW-2) — sem divergência de métrica.

**Fragilidades:**
1. **Overpass pública** (overpass-api.de): sem SLA, rate limit comunitário. Em escala
   vira gargalo/falha. Mitigação: cache de cenário por geohash (~150m) em Firestore
   (TTL 30d) — locais não mudam; reduz 90%+ das chamadas.
2. **Detecção por regex no blob de tags** funciona, mas `name` genérico pode gerar
   falso positivo (ex.: rua "Banco do Brasil" → cenário bank). Aceitável no MVP.
3. **Privacidade/LGPD**: coordenadas são enviadas ao backend e logadas (placeName em
   logEvent). Não há consentimento específico para rastreio de localização nem menção
   na Política de Privacidade (já publicada!). **Bloqueador antes de ligar**: opt-in
   explícito + cláusula na política + não persistir lat/lng bruto.
4. Hook chama `getCurrentPosition` sob demanda — ok; mas sem UI, o fluxo de permissão
   do navegador nunca foi exercitado em produção.
5. `phone` vem do CLIENTE no callable — usuário autenticado pode mandar mensagem para
   qualquer número. Baixo risco real (mensagem inofensiva), mas o certo é ler
   `users/{uid}.whatsappPhone` no servidor e ignorar o input.

## Design/UX — o que falta para existir

O Sentinela precisa de TRÊS superfícies, em ordem de esforço:

1. **Card no Painel (Visão Geral)**: "🛡 Sentinela" com botão "Verificar onde estou" →
   chama o hook → exibe o alerta do cenário inline (mesma mensagem do WhatsApp,
   renderizada como cartão do Arquiteto). Reusa tudo que existe. ~1 sessão.
2. **Opt-in no Perfil/Configurações**: toggle "Sentinela de localização" com explicação
   de privacidade (LGPD) + vínculo WhatsApp para alertas fora do app.
3. **PWA em segundo plano** (visão completa): geofencing real exige app instalado +
   permissões; web só consegue checagem ao abrir. Roadmap: trigger ao abrir o app
   (1×/sessão, com opt-in) já entrega 80% do valor.

O `SentinelGuardModal` (recebe um SovereigntyScoreResult) parece ter sido pensado como
interceptador de lançamento de baixo Sv ("tem certeza? isso custa X dias") — conceito
forte: religar no fluxo do EntryForm quando score < 40.

## Comercial

- **É argumento de venda único**: "seu app te protege NA loja, antes do erro" — nenhum
  Nubank/Mobills/Organizze faz. A landing já vende ("Sentinela Geo" no mockup do hero!)
  — hoje é promessa não cumprida.
- **Pro nato**: checagem manual gratuita (1×/dia?) vs automática + WhatsApp no Pro.
- Sugestão tática de cartão cria hábito diário (abrir antes de comprar) = retenção.

## Plano recomendado (ordem)

| # | Ação | Esforço |
|---|---|---|
| 1 | Servidor ignora `phone` do cliente; lê do doc do usuário | S |
| 2 | Opt-in + cláusula de localização na Política de Privacidade | S |
| 3 | Card Sentinela no Painel com "Verificar onde estou" (hook existente) | M |
| 4 | Cache de cenário por geohash no Firestore | S/M |
| 5 | Religar SentinelGuardModal no EntryForm (Sv < 40) | M |
| 6 | Trigger automático 1×/sessão (opt-in) + gating Pro | M |

Resultado esperado: a feature mais "uau" do produto sai do porão e vira o destaque
da demo — com privacidade em dia.
