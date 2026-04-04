/**
 * Sibanki — Conselho de Agentes Financeiros
 *
 * Sistema multi-agente onde 4 especialistas analisam a situação financeira
 * do usuário em paralelo e um orquestrador sintetiza a decisão final.
 *
 * Agentes:
 *   1. Guardião   — segurança, risco, dívidas, emergências
 *   2. Estrategista — investimentos, crescimento patrimonial, oportunidades
 *   3. Comportamental — hábitos, impulso, padrões de gasto
 *   4. Familiar   — família, metas conjuntas, educação financeira
 *
 * Fluxo:
 *   contexto → [4 agentes em paralelo] → [orquestrador] → decisão final
 */
const { callLLM } = require("../llm/llmService");
const { logEvent, logError, timer } = require("../../logger");

const AGENT_PROMPTS = {
  guardiao: `Você é o AGENTE GUARDIÃO do Sibanki. Sua especialidade é PROTEÇÃO FINANCEIRA.

FOCO: segurança, riscos, dívidas, reserva de emergência, seguros, fraudes.

ANÁLISE OBRIGATÓRIA:
1. A reserva de emergência é suficiente? (meta: 3-6 meses)
2. Há dívidas com juros altos (rotativo, cheque especial)?
3. A pressão de crédito é preocupante?
4. Há seguros essenciais faltando?
5. O patrimônio está protegido contra imprevistos?

RESPONDA APENAS em JSON válido:
{
  "agente": "guardiao",
  "nivel_alerta": "verde|amarelo|vermelho",
  "diagnostico": "Frase curta do diagnóstico (máx 80 chars)",
  "riscos": ["risco 1", "risco 2"],
  "acoes": ["ação prioritária 1", "ação 2"],
  "prioridade": 1-10
}`,

  estrategista: `Você é o AGENTE ESTRATEGISTA do Sibanki. Sua especialidade é CRESCIMENTO PATRIMONIAL.

FOCO: investimentos, alocação, rentabilidade, oportunidades, FIRE, renda passiva.

ANÁLISE OBRIGATÓRIA:
1. Os investimentos estão alinhados com o perfil de risco?
2. A diversificação é adequada?
3. Há oportunidade de otimizar rendimento (poupança → CDB, etc.)?
4. Qual o progresso em direção à independência financeira?
5. A taxa de poupança é saudável (meta: ≥20%)?

RESPONDA APENAS em JSON válido:
{
  "agente": "estrategista",
  "oportunidade": "alta|media|baixa",
  "diagnostico": "Frase curta (máx 80 chars)",
  "sugestoes": ["sugestão 1", "sugestão 2"],
  "meta_fire": "X anos para independência ou 'dados insuficientes'",
  "prioridade": 1-10
}`,

  comportamental: `Você é o AGENTE COMPORTAMENTAL do Sibanki. Sua especialidade é PSICOLOGIA FINANCEIRA.

FOCO: padrões de gasto, impulsos, categorias problemáticas, hábitos, consistência.

ANÁLISE OBRIGATÓRIA:
1. Quais categorias cresceram mais nos últimos meses?
2. Há padrão de gastos por impulso (mesma categoria, mesmo dia da semana)?
3. O usuário registra lançamentos com consistência?
4. Há gastos "invisíveis" (assinaturas, pequenos valores recorrentes)?
5. O orçamento está sendo respeitado?

RESPONDA APENAS em JSON válido:
{
  "agente": "comportamental",
  "saude_habitos": "forte|moderada|fraca",
  "diagnostico": "Frase curta (máx 80 chars)",
  "padroes_detectados": ["padrão 1", "padrão 2"],
  "gatilhos": ["gatilho de impulso 1"],
  "dica_comportamental": "Uma dica prática",
  "prioridade": 1-10
}`,

  familiar: `Você é o AGENTE FAMILIAR do Sibanki. Sua especialidade é FINANÇAS EM FAMÍLIA.

FOCO: metas familiares, educação financeira dos filhos, planejamento conjunto, proteção familiar.

ANÁLISE OBRIGATÓRIA:
1. Há metas familiares definidas? Estão progredindo?
2. Se houver filhos, estão aprendendo sobre dinheiro?
3. O planejamento é individual ou compartilhado?
4. Há proteção adequada para a família (seguro, previdência)?
5. As despesas familiares estão equilibradas?

RESPONDA APENAS em JSON válido:
{
  "agente": "familiar",
  "situacao_familiar": "organizada|parcial|desorganizada|individual",
  "diagnostico": "Frase curta (máx 80 chars)",
  "sugestoes_familia": ["sugestão 1"],
  "prioridade": 1-10
}`,
};

const ORCHESTRATOR_PROMPT = `Você é o ORQUESTRADOR do Conselho de Agentes Financeiros do Sibanki.

Você recebeu análises de 4 agentes especializados. Sua missão é:
1. Sintetizar as recomendações em um PLANO DE AÇÃO UNIFICADO
2. Resolver conflitos entre agentes (ex: Estrategista quer investir mas Guardião alerta sobre reserva)
3. Priorizar ações por urgência e impacto
4. Dar uma nota geral de saúde financeira

REGRAS:
- O Guardião tem VETO sobre sugestões de risco se a reserva for insuficiente
- O Comportamental pode invalidar sugestões que dependam de disciplina se os hábitos forem fracos
- O Familiar tem prioridade se houver dependentes em risco
- Máximo 5 ações no plano final

RESPONDA APENAS em JSON válido:
{
  "saude_geral": 0-100,
  "resumo": "Resumo executivo em 1-2 frases (máx 150 chars)",
  "consenso": ["ponto de consenso entre agentes"],
  "conflitos": ["conflito resolvido: X vs Y → decisão"],
  "plano_acao": [
    {"ordem": 1, "acao": "Descrição da ação", "agente_responsavel": "guardiao|estrategista|comportamental|familiar", "urgencia": "imediata|esta_semana|este_mes", "impacto": "alto|medio|baixo"},
    {"ordem": 2, "acao": "...", "agente_responsavel": "...", "urgencia": "...", "impacto": "..."}
  ],
  "frase_motivacional": "Uma frase estoica ou motivacional para o usuário"
}`;

function parseAgentResponse(text) {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```\w*\n?/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function runCouncil(financialContext) {
  const t = timer("agentCouncil");

  const agentNames = Object.keys(AGENT_PROMPTS);
  const agentResults = await Promise.all(
    agentNames.map(async (name) => {
      const prompt = `${AGENT_PROMPTS[name]}\n\n---\nCONTEXTO FINANCEIRO DO USUÁRIO:\n${financialContext.substring(0, 3000)}\n---\nResponda APENAS o JSON.`;
      try {
        const result = await callLLM(prompt, { task: "fast", maxTokens: 400, cache: false });
        const parsed = parseAgentResponse(result?.text);
        if (parsed) {
          parsed._provider = result.provider;
          return parsed;
        }
        return { agente: name, diagnostico: "Sem dados suficientes", prioridade: 1, _provider: result?.provider || "none" };
      } catch (err) {
        logError("agentCouncil", `Agent ${name} failed`, err);
        return { agente: name, diagnostico: "Erro na análise", prioridade: 0, _error: true };
      }
    })
  );

  const agentsMap = {};
  agentNames.forEach((name, i) => { agentsMap[name] = agentResults[i]; });

  const orchestratorInput = `${ORCHESTRATOR_PROMPT}\n\n---\nANÁLISES DOS AGENTES:\n${JSON.stringify(agentResults, null, 2)}\n\nCONTEXTO FINANCEIRO:\n${financialContext.substring(0, 1500)}\n---\nSintetize o plano. Responda APENAS o JSON.`;

  let synthesis;
  try {
    const result = await callLLM(orchestratorInput, { task: "smart", maxTokens: 600, cache: false });
    synthesis = parseAgentResponse(result?.text);
    if (synthesis) synthesis._provider = result.provider;
  } catch (err) {
    logError("agentCouncil", "Orchestrator failed", err);
  }

  if (!synthesis) {
    synthesis = {
      saude_geral: 50,
      resumo: "Análise parcial — alguns agentes não responderam.",
      plano_acao: agentResults
        .filter((a) => a.prioridade > 3)
        .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0))
        .slice(0, 3)
        .map((a, i) => ({
          ordem: i + 1,
          acao: a.diagnostico || "Revisar situação",
          agente_responsavel: a.agente,
          urgencia: a.prioridade >= 8 ? "imediata" : "esta_semana",
          impacto: a.prioridade >= 7 ? "alto" : "medio",
        })),
      frase_motivacional: "A disciplina é a ponte entre metas e conquistas.",
    };
  }

  const elapsed = t.end();
  logEvent("agents", "council_completed", { elapsed, agents: agentNames.length });

  return {
    agentes: agentsMap,
    sintese: synthesis,
    executadoEm: new Date().toISOString(),
    duracaoMs: elapsed,
  };
}

module.exports = { runCouncil };
