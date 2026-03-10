# Análise do documento "Testes Sibanki" — correções na versão staging

Documento gerado a partir da avaliação do testador (versão antiga) e verificação na versão atual (staging).

---

## Resumo das correções aplicadas

### 1. Login — mensagem de erro
**Problema:** Efeito de mensagem tremendo; preferência por modal/balão em português.

**Status no staging:** As mensagens já estavam em português (ex.: "Usuário não encontrado", "Senha incorreta").  
**Correção:** Ajuste visual do erro de login (padding, borda, animação mais suave).

---

### 2. Combo bancos — visibilidade dos nomes
**Problema:** Nomes dos bancos só apareciam ao passar o cursor.

**Correção:** Aumento do `font-size` de `.6rem` para `.75rem`, cor mais forte (`rgba(255,255,255,.95)`) e `font-weight: 500` para melhor leitura.

---

### 3. Meta — botão "Como atingir" não funcionava
**Problema:** Ao clicar em "Como atingir?", nada acontecia.

**Causa:** O modal de calculadoras (`finCalcOv`) estava dentro da aba Dicas. Quando o usuário estava em Metas, a aba Dicas ficava oculta (`display:none`), e o modal também.

**Correção:** O modal foi movido para fora das abas, como filho direto de `#app`, garantindo que funcione em qualquer tela (Metas, Dicas, etc.).

---

### 4. Gamificação — botões "Salvar dica" e "Nova dica"
**Problema:** Botões perderam o padrão visual.

**Causa:** O estilo `.calc-btn` estava definido apenas dentro de `.fin-calc-body`; os botões de dicas ficam em `.fin-insight-actions` e `.edu-dica-card`.

**Correção:** Aplicado o mesmo estilo (gradiente, borda, hover) para `.fin-insight-actions` e `.edu-dica-card`.

---

## Itens não corrigidos (requerem análise mais profunda)

### 5. Lançamento rápido por IA / áudio
**Problema:** Lançamento por IA difícil de identificar; lançava em conta errada ou não lançava; áudio transcrito mas não lançado.

**Observação:** O testador sugeriu remover o recurso. A complexidade é alta (IA + fluxo de lançamento). Recomenda-se revisar o fluxo completo e os testes antes de decidir remover ou manter.

---

### 6. Investimentos — valores incorretos
**Problema:** VGIA11: R$ 100 investido → R$ 1.000; KORE11: R$ 100 investido, R$ 75 atual → R$ 9.000 (patrimônio total).

**Sugestão:** Possível confusão entre valor por investimento e patrimônio total; ou problema na API BRAPI (cotação). Verificar:
- Se o valor exibido é por ativo ou total da carteira;
- Se a API retorna cotação correta para FIIs.

---

### 7. Consultor IA — investimentos e análise B3
**Problema:** Consultoria de investimentos não traz o valor lançado; análise B3 não parece funcionar.

**Observação:** Depende de backend/IA e integração com BRAPI. Verificar se os dados do usuário são enviados corretamente ao prompt e se a API está retornando dados.

---

## Itens já ok ou sem alteração

- **Login:** Google funciona; mensagens em português.
- **Configurações iniciais:** Passos bem avaliados.
- **Tour:** Completo, sem erros gramaticais.
- **Layout:** Layout e criação de contas bem avaliados.
- **Comunidade:** Comentários funcionando.
- **Dashboard:** Leitura fácil.
- **Lançamentos:** Funcionando; recorrentes chamados de fixos.
- **Cartões:** Funcionando bem.
- **Orçamento:** Funcionando.
- **Simulador de aportes:** Funcionando.
- **Configurações:** Plano gratuito — sugestão de trial de 2 meses para usuários com 50+ lançamentos.

---

## Arquivos modificados

- `public/app/index.html` — ajustes de CSS e posicionamento do modal de calculadoras.
