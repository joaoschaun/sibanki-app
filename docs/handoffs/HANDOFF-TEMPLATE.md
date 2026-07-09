# HANDOFF-NNNN — [Título Curto do Handoff]

> Breve contextualização de 1-2 linhas sobre a tarefa.

---

## 0. Leia antes (auto-referências — obrigatório)

- `AGENTS.md` — contrato de engenharia (precedência sobre tudo).
- `CLAUDE.md` — status do produto + mapa de versões.
- `docs/INVENTARIO-COMPLETO-SISTEMA.md` — inventário detalhado de módulos.

---

## 1. Objetivo

[Descreva em uma frase o objetivo de negócio/técnico deste handoff]

---

## 2. Escopo

**Dentro:**
- [Item de escopo 1]
- [Item de escopo 2]

**Fora (NÃO tocar):**
- [Explicitar o que não deve ser tocado de jeito nenhum]

---

## 3. Arquivos-alvo (só estes)

- `caminho/do/arquivo1.ts`
- `caminho/do/arquivo2.tsx`

> **Atenção:** Tocar qualquer arquivo fora desta lista resultará em reprovação imediata da execução.

---

## 4. Passos

### 4.1 [Etapa 1]
- [Passo detalhado]

### 4.2 [Etapa 2]
- [Passo detalhado]

---

## 5. Critério de aceite (ligado a checagem)

- [ ] Todos os arquivos do §3 existem e as modificações propostas foram feitas; **nenhum** arquivo fora do §3 foi alterado.
- [ ] `npm run gate` roda com sucesso sem retornar erros (typecheck, testes unitários, smoke tests de React passam).
- [ ] [Comportamento específico testável]

---

## 6. Gate de risco

- **Toca dinheiro, regra Firestore ou config de deploy?** [Sim/Não]
- **Se SIM:** Exige aprovação manual explícita do João antes do merge em `main`.
- **Se NÃO:** Apenas o gate mecânico e a revisão de diff convencional são necessários.

---

## 7. Instrução de bloqueio

Se qualquer passo ou especificação neste documento parecer ambígua, houver conflito com o `AGENTS.md` ou se deparar com uma situação inesperada no código, **PARE imediatamente e pergunte**. Nunca improvise nem faça suposições.
