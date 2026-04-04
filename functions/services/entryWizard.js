/**
 * Sibanki — Entry Wizard (engine de lançamento guiado)
 *
 * Usado tanto pelo FAB (frontend) quanto pelo WhatsApp (backend).
 * Garante que nenhum lançamento seja salvo incompleto.
 *
 * Campos obrigatórios:
 *   type        receita | despesa     (auto-inferido do texto)
 *   value       número positivo       (obrigatório na msg inicial)
 *   desc        string               (obrigatório na msg inicial)
 *   category    categorias conhecidas (auto-detectado ou perguntado)
 *   account     conta do usuário      (usa única conta se tiver só 1)
 *   formaPgto   forma de pagamento    (perguntado para despesas)
 */

const DEFAULT_CATS = [
  "Moradia","Transporte","Alimentação","Saúde","Bem-estar","Educação",
  "Lazer","Cartões","Empréstimo","Assinaturas","Imprevisto","Salário",
  "Freela","Investimentos","Transferencia","Outros"
];

const FORMAS_PGTO = ["Dinheiro","Pix","Débito","Crédito","Boleto","Transferência"];

// ── Detecção de categoria a partir da descrição ──────────────────────────────
const CAT_RULES = [
  { cats: ["Alimentação"], rx: /mercado|supermercado|ifood|delivery|restaurante|lanche|almoço|almoco|jantar|cafe|café|refeição|refeicao|padaria|pizza|hamburguer|mcdonalds|burger|sushi|comida|açaí|acai|feira|hortifruti/i },
  { cats: ["Transporte"],  rx: /uber|99pop|cabify|taxi|táxi|combustível|combustivel|gasolina|etanol|ônibus|onibus|metro|metrô|passagem|estacionamento|pedágio|pedagio|condução|conducao/i },
  { cats: ["Moradia"],     rx: /aluguel|condomínio|condominio|luz|energia|água|agua|gás|gas|internet|net|vivo|claro|oi|tim|iptu|financiamento|prestação|prestacao imóvel|imovel/i },
  { cats: ["Saúde"],       rx: /farmácia|farmacia|drogaria|remédio|remedio|médico|medico|consulta|exame|hospital|plano de saúde|plano saude|dentista|odonto|psicólogo|psicologo/i },
  { cats: ["Bem-estar"],   rx: /academia|gym|pilates|yoga|corrida|natação|natacao|personal|spa|salão|salao|beleza|manicure/i },
  { cats: ["Educação"],    rx: /escola|faculdade|curso|mensalidade|livro|apostila|matrícula|matricula|aula|treinamento|certificação|certificacao/i },
  { cats: ["Lazer"],       rx: /cinema|teatro|show|festival|jogo|netflix|streaming|spotify|amazon|disney|play|game|viagem|hotel|passeio|entretenimento/i },
  { cats: ["Cartões"],     rx: /fatura|cartão|cartao|anuidade|juros cartão/i },
  { cats: ["Assinaturas"], rx: /netflix|spotify|amazon prime|disney\+|hbo|apple|google one|icloud|dropbox|assinatura|mensalidade|plano/i },
  { cats: ["Salário"],     rx: /salário|salario|pagamento recebido|pró-labore|pro-labore|remuneração|remuneracao|contra-cheque/i },
  { cats: ["Freela"],      rx: /freela|freelance|projeto|serviço prestado|servico prestado|honorários|honorarios|consultoria/i },
  { cats: ["Imprevisto"],  rx: /imprevisto|emergência|emergencia|conserto|reparo|multa|sinistro|urgente/i },
];

function detectCategory(desc) {
  if (!desc) return null;
  for (const rule of CAT_RULES) {
    if (rule.rx.test(desc)) return rule.cats[0];
  }
  return null; // não detectado com confiança
}

function detectFormaPgto(text) {
  const t = (text || "").toLowerCase();
  if (/\bpix\b/.test(t)) return "Pix";
  if (/\bdébito\b|\bdebi(to)?\b|\bcartão de débito\b/.test(t)) return "Débito";
  if (/\bcrédito\b|\bcredito\b|\bcartão de crédito\b|\bparcel/.test(t)) return "Crédito";
  if (/\bdinheiro\b|\bcash\b|\bespécie\b|\bespecie\b/.test(t)) return "Dinheiro";
  if (/\bboleto\b/.test(t)) return "Boleto";
  if (/\btransferência\b|\btransferencia\b|\btransf\b/.test(t)) return "Transferência";
  return null;
}

function detectType(text) {
  const t = (text || "").toLowerCase();
  if (/\b(recebi|ganhei|salário|salario|entrada|venda|freela|pagamento recebido|depósito|deposito|pix recebido|lucro)\b/.test(t)) return "receita";
  return "despesa";
}

// ── Perguntas a fazer ────────────────────────────────────────────────────────

function questionForCategory(cats) {
  const list = (cats || DEFAULT_CATS).slice(0, 12);
  const opts = list.map((c, i) => `${i + 1}. ${c}`).join("\n");
  return `📂 *Qual categoria?*\n\n${opts}\n\nDigite o número ou o nome.`;
}

function questionForAccount(accounts) {
  const opts = accounts.map((a, i) => `${i + 1}. ${a}`).join("\n");
  return `🏦 *Em qual conta foi?*\n\n${opts}\n\nDigite o número ou o nome.`;
}

function questionForFormaPgto() {
  const opts = FORMAS_PGTO.map((f, i) => `${i + 1}. ${f}`).join("\n");
  return `💳 *Como foi pago?*\n\n${opts}\n\nDigite o número ou a forma.`;
}

function questionForConfirm(entry) {
  const tipo = entry.type === "receita" ? "📈 Receita" : "📉 Despesa";
  const fmtBRL = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  return (
    `✅ *Confirmar lançamento:*\n\n` +
    `${tipo}: *${fmtBRL(entry.value)}*\n` +
    `📝 ${entry.desc || "—"}\n` +
    `📂 ${entry.category}\n` +
    (entry.type === "despesa" ? `💳 ${entry.formaPgto || "—"}\n` : "") +
    `🏦 ${entry.account}\n` +
    `📅 ${entry.date}\n\n` +
    `Responda *1* para confirmar ou *2* para cancelar.`
  );
}

// ── Resolver resposta do usuário para um campo ────────────────────────────────

function resolveAnswer(field, answer, context) {
  const a = (answer || "").trim();
  const n = parseInt(a, 10);

  if (field === "category") {
    const cats = context.cats || DEFAULT_CATS;
    if (!isNaN(n) && n >= 1 && n <= cats.length) return cats[n - 1];
    const match = cats.find(c => c.toLowerCase() === a.toLowerCase());
    if (match) return match;
    const partial = cats.find(c => c.toLowerCase().includes(a.toLowerCase()) && a.length >= 3);
    if (partial) return partial;
    return null; // não reconhecido
  }

  if (field === "account") {
    const accs = context.accounts || [];
    if (!isNaN(n) && n >= 1 && n <= accs.length) return accs[n - 1];
    const match = accs.find(a2 => a2.toLowerCase() === a.toLowerCase());
    if (match) return match;
    const partial = accs.find(a2 => a2.toLowerCase().includes(a.toLowerCase()) && a.length >= 2);
    if (partial) return partial;
    return null;
  }

  if (field === "formaPgto") {
    if (!isNaN(n) && n >= 1 && n <= FORMAS_PGTO.length) return FORMAS_PGTO[n - 1];
    const match = FORMAS_PGTO.find(f => f.toLowerCase() === a.toLowerCase());
    if (match) return match;
    // Detectar do texto livre
    const detected = detectFormaPgto(a);
    if (detected) return detected;
    return null;
  }

  if (field === "confirm") {
    if (a === "1" || /^(sim|s|yes|y|confirmar|confirma|ok)$/i.test(a)) return "yes";
    if (a === "2" || /^(não|nao|n|no|cancel|cancelar)$/i.test(a)) return "no";
    return null;
  }

  return null;
}


// ── Engine principal ──────────────────────────────────────────────────────────

/**
 * Inicia o wizard a partir de uma entrada parcialmente parseada.
 * Retorna o primeiro passo a tomar.
 *
 * @param {object} partial   - { type, value, desc, category?, account?, formaPgto?, date? }
 * @param {string[]} accounts - contas do usuário
 * @param {string[]} cats     - categorias do usuário
 * @returns {{ done: false, step, question, partial } | { done: true, entry }}
 */
function startWizard(partial, accounts, cats) {
  const entry = {
    type: partial.type || detectType(partial.desc || ""),
    value: partial.value,
    desc: (partial.desc || "").substring(0, 80),
    category: partial.category || null,
    account: partial.account || null,
    formaPgto: partial.formaPgto || null,
    date: partial.date || new Date().toISOString().slice(0, 10),
  };

  // Etapa 1: categoria
  if (!entry.category || entry.category === "Outros") {
    const detected = detectCategory(entry.desc);
    if (detected) {
      entry.category = detected;
    } else {
      return {
        done: false,
        step: "category",
        question: questionForCategory(cats),
        partial: entry,
        context: { cats: cats || DEFAULT_CATS }
      };
    }
  }

  // Etapa 2: conta
  const userAccs = accounts && accounts.length > 0 ? accounts : ["Carteira física"];
  if (!entry.account) {
    if (userAccs.length === 1) {
      entry.account = userAccs[0];
    } else {
      return {
        done: false,
        step: "account",
        question: questionForAccount(userAccs),
        partial: entry,
        context: { accounts: userAccs }
      };
    }
  }

  // Etapa 3: forma de pagamento (somente despesas)
  if (entry.type === "despesa" && !entry.formaPgto) {
    const detected = detectFormaPgto(entry.desc);
    if (detected) {
      entry.formaPgto = detected;
    } else {
      return {
        done: false,
        step: "formaPgto",
        question: questionForFormaPgto(),
        partial: entry,
        context: {}
      };
    }
  }

  // Etapa 4: confirmação
  return {
    done: false,
    step: "confirm",
    question: questionForConfirm(entry),
    partial: entry,
    context: {}
  };
}

/**
 * Avança o wizard com a resposta do usuário.
 *
 * @param {object} wizardState - estado retornado por startWizard ou continueWizard
 * @param {string} userAnswer  - resposta do usuário
 * @returns {{ done: false, step, question, partial, error? } | { done: true, entry } | { cancelled: true }}
 */
function continueWizard(wizardState, userAnswer) {
  const { step, partial, context } = wizardState;
  const answer = resolveAnswer(step, userAnswer, context || {});

  if (answer === null) {
    // Resposta não reconhecida — repetir a pergunta com aviso
    const repeatMsg = `⚠️ Não entendi. Por favor escolha uma das opções:\n\n` + wizardState.question;
    return { done: false, step, question: repeatMsg, partial, context, error: true };
  }

  if (step === "confirm") {
    if (answer === "no") return { cancelled: true };
    // answer === "yes" → lançamento completo
    return { done: true, entry: partial };
  }

  // Aplicar resposta ao partial e continuar
  const updated = { ...partial, [step]: answer };

  // Avançar para próxima etapa
  const userAccs = (context && context.accounts) || [updated.account || "Carteira física"];
  return continueFromStep(step, updated, userAccs, context);
}

/**
 * Continua o wizard a partir do passo seguinte ao resolvido.
 */
function continueFromStep(resolvedStep, entry, accounts, prevContext) {
  const steps = ["category", "account", "formaPgto", "confirm"];
  const currentIdx = steps.indexOf(resolvedStep);

  for (let i = currentIdx + 1; i < steps.length; i++) {
    const step = steps[i];

    if (step === "account") {
      if (!entry.account) {
        if (accounts.length === 1) { entry.account = accounts[0]; continue; }
        return { done: false, step, question: questionForAccount(accounts), partial: entry, context: { accounts } };
      }
    }

    if (step === "formaPgto") {
      if (entry.type === "despesa" && !entry.formaPgto) {
        return { done: false, step, question: questionForFormaPgto(), partial: entry, context: {} };
      }
    }

    if (step === "confirm") {
      return { done: false, step, question: questionForConfirm(entry), partial: entry, context: {} };
    }
  }

  return { done: true, entry };
}

module.exports = {
  detectCategory,
  detectFormaPgto,
  detectType,
  startWizard,
  continueWizard,
  DEFAULT_CATS,
  FORMAS_PGTO,
};
