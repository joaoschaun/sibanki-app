# Concierge MVP — "Diagnóstico Sibanki" (playbook)

> Objetivo: validar a suposição mais arriscada do produto **sem construir o motor
> automatizado**. Em 2 semanas, descobrir se uma recomendação concreta de valor
> oculto/otimização gera **ação** e move os **Dias de Liberdade (Ld)**.

## A pergunta única

> Quando eu mostro a uma pessoa real um ganho concreto que é dela, **ela age** — e isso
> move o Ld dela?

## Critério de sucesso (cravar ANTES de rodar)

- ✅ **≥3 de 5 agem** em até 14 dias **E ≥3 de 5 dizem que querem isso recorrente** → tese se sustenta → partir para automatizar.
- ⚠️ Amam o insight **mas não agem** → o problema **não é valor, é fricção da última milha**. O próximo trabalho passa a ser *reduzir o atrito do fazer* (não mais detecção). Esse aprendizado sozinho já vale o teste.

## 1. Os 5 usuários (escolher por diversidade de situação)

Evitar 5 amigos que serão educados. Buscar quem fala a verdade. Forçar variedade:

1. Dinheiro **parado** em conta que não rende (caso mais limpo)
2. **Caixa apertado / dívida cara** (rotativo, cheque especial)
3. **Vários bancos/cartões** (bagunça pra organizar)
4. e 5. "Normais" (testar se acha valor mesmo em quem se acha organizado)

## 2. Dados a puxar (por pessoa)

Não precisa do Open Finance em produção — conexão de teste do Pluggy, ou print/leitura
assistida. O concierge **abaixa a barra técnica de propósito**.

- [ ] Contas + saldos → onde tem dinheiro dormindo sem render
- [ ] Conta "principal" (onde o dinheiro fica parado)
- [ ] Cartões + bandeira/tier → benefício não usado (sala VIP, seguro de compra)
- [ ] CPF → **Valores a Receber** no BCB (`valoresAReceberApi` já existe)
- [ ] Recorrências/assinaturas → desperdício esquecido (assinatura zumbi)
- [ ] Dívida/rotativo → crédito caro que dá pra portar

> **Privacidade (LGPD):** dados financeiros individuais são sensíveis. Tratar com cuidado,
> não compartilhar, e usar só para entregar valor à própria pessoa.

## 3. Como achar o "1 achado" (a regra)

Para cada pessoa, **UMA** recomendação — a de maior `(impacto em Ld × baixa fricção × punch emocional)`. **Não despejar 5 achados.** Um só, afiado.

> **Sacada do denominador:** cortar desperdício recorrente move o Ld **mais** que realocar
> ativo, porque mexe no *burn rate* (denominador do Ld). Às vezes o achado mais "chato"
> (assinatura zumbi de R$ 50/mês) vale mais dias que mover R$ 18 mil.

Fórmula do Ld (espelhar a do `sovereigntyEngine.ts`):
`Ld = patrimônio líquido ÷ burn rate diário (média de despesas dos últimos 90 dias)`.
Para caixa parado, o rendimento passivo entra como **redução do consumo líquido diário**.

## 4. Template do Diagnóstico (na voz Sibanki)

```
SIBANKI · DIAGNÓSTICO — {nome} · {data}

"Vasculhei o que é seu. {frase de abertura — o achado em 1 linha humana}."

🔎 O ACHADO
{ex: R$ 18.000 parados na sua conta corrente, rendendo R$ 0.}

📈 SUA LIBERDADE
Hoje: {X} dias  →  Depois do ajuste: {Y} dias   (+{N} dias de liberdade)

✅ O QUE FAZER
1. {passo concreto e pequeno}
2. {passo concreto e pequeno}
3. {o ganho recorrente, ex: rende ~R$ 157/mês que hoje você perde}

— Ranqueado pelo seu rendimento real, não por comissão. Te mostro a conta sempre.
(Semana que vem eu olho seus {próximo vertical}.)
```

## 5. Tabela de acompanhamento

Ver `docs/concierge-tracking.csv` (importar no Google Sheets / Excel). Colunas:

| Campo | O que revela |
|---|---|
| Agiu em 14 dias? (S/N) | A suposição arriscada — última milha |
| Δ Ld real (dias) | Valor material ou cosmético? |
| Onde travou | O que automatizar/facilitar depois |
| Reação (1–5) | Tem o "uau"? Contou pra alguém? |
| Quer recorrente? (S/N) | Existe loop de hábito |

## 6. Timebox

- **Semana 1:** recrutar + conectar + analisar + entregar os 5 diagnósticos.
- **Semana 2:** observar ação + entrevistar (por que agiu / por que não).

## Por que isso antes do motor

Construir o motor de otimização antes desse teste é apostar meses numa suposição não
validada. Os diagnósticos feitos na mão viram o **dataset de exemplo** que ensina a
máquina depois — e o raciocínio que o Consultor de IA vai herdar.
