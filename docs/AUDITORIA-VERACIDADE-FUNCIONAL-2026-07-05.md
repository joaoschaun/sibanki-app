# Auditoria de Veracidade Funcional — Sibanki (05/07/2026)

> Pergunta que guia esta auditoria: **"o que o app diz que faz, ele faz de
> verdade?"** Cada promessa da interface foi rastreada até o código-fonte.
> Escala: ✅ REAL E CORRETO · 🟡 REAL COM RESSALVA · 🔴 BUG / FACHADA.

---

## Resumo executivo

**Veredicto geral: o Sibanki não é fachada.** Os motores centrais são código
real, determinístico e testável — inclusive com histórico de auto-auditoria
(os comentários `SOV-1` a `SOV-7` no engine mostram correções anteriores de
honestidade, como não esconder saldo negativo do cheque especial). O motor de
perfil que classifica o estágio do usuário (`healthLevel`, `journeyStage`) é
totalmente real.

**Um problema real encontrado:** um bug de memoização faz o Spread Gap (Sg)
rodar quase sempre com o **CDI de fallback**, não com o CDI ao vivo que o
sistema busca — ou seja, a promessa "spread com CDI ao vivo" está tecnicamente
ligada mas anulada na prática.

---

## 1. Dias de Liberdade (Ld) — ✅ REAL E CORRETO

`sovereigntyEngine.ts → calculateDaysOfFreedom` (linhas 112–312).

- Fórmula bate com a documentação: `Ld = Liquidez / Burn diário`.
- Liquidez = contas (respeita `incluirNaSoma`, **subtrai saldo negativo** —
  honesto) + investimentos líquidos ponderados (RF ×1.0, RV ×0.7).
- Burn rate = média das despesas dos últimos 3 meses, exclui transferências,
  pendentes e agendados. Divide pelos meses distintos reais (não infla).
- Renda passiva = juros de RF líquida (compostos a partir de `taxaAnual`) +
  proventos declarados. Exclui RV para não contar em dobro.
- **Honestidade de dados (`SOV-3`):** força confiança `baixa` se há < 2 meses
  ou < 30 lançamentos — o número se assume provisório em vez de enganar.

🟡 **Ressalva menor:** o rendimento presumido dos investimentos usa `1% a.m.`
default quando o usuário não cadastrou a taxa. Não distorce o Ld (afeta só a
renda passiva), mas idealmente puxaria do CDI ao vivo.

---

## 2. Spread Gap (Sg) — 🔴 BUG DE WIRING + 🟡 proxies sem sinal de confiança

`sovereigntyEngine.ts → calculateSpreadGap` (linhas 323–435). **A matemática é
correta**: rendimento médio ponderado dos investimentos menos custo médio
ponderado das dívidas (obrigações + faturas de cartão abertas), com dedução de
vazamento mensal. A dedup cartão↔obrigação foi endurecida (`SOV-5`).

🔴 **Bug real (prioridade):** em `IntelligenceContext.tsx` (linhas 122–132), o
`useMemo` do Sg tem deps `[investments, creditObligations, cards]` — **falta
`cdiMonthly`**. O CDI ao vivo é buscado de forma assíncrona por
`useMarketRates` (Cloud Function + cache 24h), mas como não está nas
dependências, o Sg **não recalcula quando o CDI real chega** e fica com o
fallback `0,0107` (~12,8% a.a.) capturado no primeiro render. Resultado: a
precisão "CDI ao vivo" quase nunca acontece de fato.
**Correção:** adicionar `cdiMonthly` às deps do memo (1 linha), e idealmente
passar `currentCdiMonthly`/`investmentYieldMonthly` também ao `freedom`.

🟡 **Ressalva:** quando o usuário não cadastra taxas reais, o Sg usa proxies —
rotativo de cartão `14% a.m.` e CDB `90% do CDI`. São razoáveis e documentados,
mas **o Sg não tem indicador de confiança** como o Ld tem. A interface pode
apresentar como número exato algo que é estimado. Recomendação: espelhar o
`dataConfidence` do Ld no Sg.

---

## 3. Sovereignty Score (Sv) — ✅ REAL (heurística consistente) · 1 item a confirmar

`sovereigntyEngine.ts → calculateSovereigntyScore` (linhas 451–523).

- Modelo real e coerente: penalidade por impacto na liquidez (faixas), multiplicador
  de categoria (essencial 0.3, investimento 0, desejo 1.4), penalidade de
  orçamento estourado e de reincidência. `score = 100 − penalidades`.
- `daysLost = valor / burn diário` e `opportunityCost10y = valor × (1,008)^120`
  (juros compostos reais ~10% a.a.) — cálculos legítimos.

🟡 **A confirmar (próximo passo):** o Sv depende de `isEssential`,
`impulseStreakCount` e `budgetRemaining` serem **alimentados pelo chamador**. Se
o caller passar valores default, a penalidade comportamental ("Oráculo") fica
inerte e o Sv vira mais raso do que anuncia. Falta rastrear o caller (Sentinela /
Transactions) para confirmar que esses sinais são reais.

---

## 4. Motor de Perfil / estágios do usuário — ✅ REAL E DETERMINÍSTICO

`utils/financialProfile.ts` (240 linhas). **Esta é a peça-chave para o dashboard
adaptável.** Tudo calculado por regras claras a partir de dados reais:

- `healthLevel` (saudável/atenção/pressão/crítico) — regras sobre saldo, taxa de
  poupança, orçamentos estourados, utilização de cartão e Open Finance.
- `journeyStage` (5 estágios) — progressão real: `< 5 lançamentos →
  primeiros-passos`; crítico/pressão → `pressionado`; sem metas/OF →
  `organizando-base`; sem investimentos → `estabilizando`; senão →
  `pronto-para-crescer`.
- `nextBestActions` e `topSignals` — listas priorizadas por regras reais.

**Implicação estratégica:** o "cérebro" que decide o estágio do usuário já
existe, é honesto e roda a cada render. O dashboard hoje só o **exibe como selo**
em vez de **se remodelar** em cima dele. O dashboard adaptável é, portanto,
sobretudo trabalho de renderização — não de reengenharia do motor.

---

## 5. Projeção de Fluxo (15 dias) — ✅ REAL

`pages/Accounts.tsx` (linhas 165–219). Projeção determinística real: soma
recorrências que caem nos próximos 15 dias + faturas de cartão vencendo na
janela + obrigações, e faz `saldo projetado = caixa líquido − compromissos`. É
uma previsão baseada em regras (não estatística/ML), e o rótulo diz exatamente
isso ("disponibilidades líquidas menos obrigações e recorrências"). Honesto.

---

## 6. Sugestão de Cartão (Sentinela) — ✅ REAL

`functions/services/sentinel/cardSuggestionService.js`. Mapeia o cenário
geolocalizado → intenções (electronics/retail/dining/travel/automotive) →
pontua cada cartão do usuário por `cashback×8 + benefícios×2` e considera dias
até o fechamento da fatura. Lógica real lendo `users/{uid}.cards`.

🟡 **Ressalva:** depende de o usuário ter cadastrado os benefícios do cartão
(`cashbackPct`, seguros, etc.). Sem isso, a sugestão fica genérica — o motor é
real, mas a qualidade depende do preenchimento.

---

## 7. Placar de veracidade

| Promessa | Status | Observação |
|---|---|---|
| Ld — Dias de Liberdade | ✅ | Real e com sinal de confiança honesto |
| Sg — Spread Gap (matemática) | ✅ | Fórmula correta |
| Sg — "CDI ao vivo" | 🔴 | Bug de memo: usa fallback na prática |
| Sg — confiança dos dados | 🟡 | Sem indicador (Ld tem, Sg não) |
| Sv — Sovereignty Score | ✅/🟡 | Real; confirmar inputs comportamentais |
| healthLevel / journeyStage | ✅ | Determinístico e honesto |
| nextBestActions / topSignals | ✅ | Regras reais |
| Projeção 15 dias | ✅ | Determinística, rótulo honesto |
| Sugestão de cartão | ✅ | Real; depende de dados do cartão |
| Graham / Bazin / Solidez | ✅ | Fórmulas corretas |
| Perfil de investidor | ✅ | Scoring determinístico |

---

## 8. Próximos passos (priorizados)

1. **Corrigir o bug do Sg** (1 linha): adicionar `cdiMonthly` às deps do memo em
   `IntelligenceContext.tsx` e passar as taxas ao `freedom`. É a diferença entre
   "diz que usa CDI ao vivo" e "usa de verdade".
2. **Dar ao Sg um indicador de confiança** espelhando o `dataConfidence` do Ld,
   sinalizando quando taxas são proxy (rotativo 14%, CDB 90% CDI).
3. **Confirmar os inputs comportamentais do Sv** (rastrear o caller do Sentinela).
4. **Base para o dashboard adaptável:** como o motor de perfil é real e honesto,
   seguir para o desenho do blueprint (matriz `journeyStage × healthLevel` →
   widgets), com a regra de nunca ocultar risco crítico.
