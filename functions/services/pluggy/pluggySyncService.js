/**
 * Sincronização Open Finance (Pluggy) → Firestore users/{uid}
 * Contas, transações, cartões, investimentos, empréstimos, identidade, faturas de cartão (bills), consentimentos;
 * recalcula creditSnapshot e finScore. Catálogo de recursos: openFinanceResourceCatalog.js
 */
const functions = require('firebase-functions');
const { getPluggyClientOrThrow } = require('./pluggyService');
const { buildCreditSnapshot } = require('../../utils/creditSnapshot');
const { calculateFinScore } = require('../../utils/calculateFinScore');
const { loadOverflowPluggyIds, trimPluggyEntriesToLimit } = require('./entryOverflow');
const { syncOpenFinanceExtras } = require('./syncOpenFinanceExtras');
/** Inventário Soluções vs OF: functions/services/pluggy/openFinanceResourceCatalog.js */

/** Quantos dias de extrato puxar (Open Finance costuma ser pesado). */
const TX_LOOKBACK_DAYS = 90;
/** Limite de novas transações por sync (evita estourar 1MB do documento). */
const MAX_NEW_TRANSACTIONS_PER_SYNC = 1500;

const DEFAULT_CATEGORIES = [
  'Moradia', 'Transporte', 'Alimentação', 'Saúde', 'Bem-estar', 'Educação', 'Lazer',
  'Cartões', 'Empréstimo', 'Assinaturas', 'Imprevisto', 'Salário', 'Freela', 'Investimentos',
  'Transferencia', 'Outros',
];

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function pickBalance(acc) {
  if (acc.type === 'BANK' && acc.bankData != null && typeof acc.bankData.closingBalance === 'number') {
    return acc.bankData.closingBalance;
  }
  return Number(acc.balance) || 0;
}

function baseLabel(acc) {
  const raw = (acc.marketingName || acc.name || 'Conta').trim();
  const kind = acc.type === 'CREDIT' ? 'Cartão' : 'Conta';
  return `${raw} (${kind} · Open Finance)`;
}

function pickUniqueLabel(acc, accounts, meta) {
  const accId = acc.id;
  const existingKey = Object.keys(meta).find((k) => meta[k]?.pluggyAccountId === accId);
  if (existingKey) return existingKey;

  let candidate = baseLabel(acc);
  let n = 0;
  while (accounts.includes(candidate)) {
    const m = meta[candidate];
    if (m?.pluggyAccountId === accId) return candidate;
    n += 1;
    candidate = `${baseLabel(acc)} (${n})`;
  }
  return candidate;
}

function formatYmd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function daysAgoYmd(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatYmd(d);
}

/** ID numérico estável para Entry / Card / Investment a partir de string Pluggy */
function stableNumericId(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const v = Math.abs(h) % 2000000000;
  return v > 0 ? v : 1;
}

function dayFromPluggyDate(d) {
  if (!d) return 1;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return 1;
  return dt.getDate();
}

function mapPluggyCategoryToApp(tx) {
  const raw = (tx.category || tx.merchant?.category || '').toLowerCase();
  if (!raw) return 'Outros';
  if (/food|restaurant|aliment|grocer|padaria|lanche/i.test(raw)) return 'Alimentação';
  if (/transport|uber|99|combust|gasolina|metro|onibus/i.test(raw)) return 'Transporte';
  if (/health|hospital|farmacia|droga|medico/i.test(raw)) return 'Saúde';
  if (/education|escola|curso|faculdade/i.test(raw)) return 'Educação';
  if (/home|moradia|aluguel|condom|energia|agua|luz/i.test(raw)) return 'Moradia';
  if (/invest|aplicacao|renda fixa|acao/i.test(raw)) return 'Investimentos';
  if (/salary|salario|folha|pagamento.*empreg/i.test(raw)) return 'Salário';
  return 'Outros';
}

function mapTransactionToEntry(tx, accountLabel) {
  const type = tx.type === 'CREDIT' ? 'receita' : 'despesa';
  const value = round2(Math.abs(Number(tx.amount) || 0));
  return {
    id: stableNumericId(`pluggy-tx:${tx.id}`),
    type,
    desc: (tx.description || tx.descriptionRaw || 'Movimentação').slice(0, 500),
    category: mapPluggyCategoryToApp(tx),
    value,
    date: formatYmd(tx.date),
    account: accountLabel || undefined,
    status: 'confirmado',
    pluggyTransactionId: tx.id,
    pluggyAccountId: tx.accountId,
    source: 'open-finance',
  };
}

function mapCreditToCard(acc, displayLabel) {
  const cd = acc.creditData || {};
  const pid = acc.id;
  return {
    id: stableNumericId(`pluggy-card:${pid}`),
    name: displayLabel.replace(/\s*\(Cartão · Open Finance\)\s*$/i, '').trim() || displayLabel,
    limit: round2(Number(cd.creditLimit || 0)),
    closeDay: dayFromPluggyDate(cd.balanceCloseDate),
    dueDay: dayFromPluggyDate(cd.balanceDueDate),
    currentBill: round2(Math.abs(Number(acc.balance) || 0)),
    active: true,
    pluggyAccountId: pid,
    source: 'open-finance',
    flag: cd.brand || undefined,
  };
}

function mapInvestmentToUser(inv, _accountLabel) {
  const purchase = inv.purchaseDate || inv.date;
  return {
    id: stableNumericId(`pluggy-inv:${inv.id}`),
    date: formatYmd(purchase || new Date()),
    tipo: inv.type || 'OTHER',
    nome: (inv.name || 'Investimento').slice(0, 200),
    valor: round2(Number(inv.amountOriginal != null ? inv.amountOriginal : inv.value || 0)),
    atual: round2(Number(inv.balance || 0)),
    pluggyInvestmentId: inv.id,
    pluggyItemId: inv.itemId,
    source: 'open-finance',
  };
}

async function fetchAllAccountsForItem(client, itemId) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await client.createGetRequest('accounts', { itemId, page, pageSize: 100 });
    out.push(...(res.results || []));
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return out;
}

async function fetchAllInvestmentsForItem(client, itemId) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await client.fetchInvestments(itemId, undefined, { page, pageSize: 100 });
    out.push(...(res.results || []));
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return out;
}

async function fetchAllLoansForItem(client, itemId) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await client.fetchLoans(itemId, { page, pageSize: 100 });
    out.push(...(res.results || []));
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return out;
}

function mapLoanKind(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('CONSIGN')) return 'consignado';
  if (t.includes('FINANC') || t.includes('IMOBILI') || t.includes('HOME') || t.includes('REAL_ESTATE')) {
    return 'financiamento';
  }
  return 'emprestimo';
}

function loanIsSettled(loan) {
  if (loan.settlementDate) {
    const sd = new Date(loan.settlementDate);
    if (!Number.isNaN(sd.getTime()) && sd <= new Date()) return true;
  }
  const raw = loan.payments && loan.payments.contractOutstandingBalance;
  if (raw != null && Number(raw) <= 0 && Number(loan.contractAmount || 0) > 0) return true;
  return false;
}

function estimateMonthlyInstallment(loan) {
  const contractAmt = round2(Number(loan.contractAmount || 0));
  const inst = loan.installments;
  if (inst && inst.totalNumberOfInstallments && Number(inst.totalNumberOfInstallments) > 0 && contractAmt > 0) {
    return round2(contractAmt / Number(inst.totalNumberOfInstallments));
  }
  return null;
}

function mapLoanToCreditAccount(loan) {
  const contractAmt = round2(Number(loan.contractAmount || 0));
  const rawOut = loan.payments && loan.payments.contractOutstandingBalance;
  const outstanding =
    rawOut != null && !Number.isNaN(Number(rawOut)) ? round2(Number(rawOut)) : null;
  const balanceUsed = outstanding != null ? outstanding : contractAmt;

  const monthlyInstallment = estimateMonthlyInstallment(loan);

  let annualInterestPct;
  if (loan.CET != null && !Number.isNaN(Number(loan.CET))) {
    const c = Number(loan.CET);
    annualInterestPct = c <= 1 ? round2(c * 100) : round2(c);
  }

  const settled = loanIsSettled(loan);

  return {
    id: String(stableNumericId(`pluggy-loan-acc:${loan.id}`)),
    kind: mapLoanKind(loan.type),
    label: (loan.productName || 'Empréstimo').slice(0, 200),
    source: 'open-finance',
    status: settled ? 'quitado' : 'ativo',
    limitTotal: contractAmt,
    balanceUsed,
    monthlyInstallment,
    annualInterestPct,
    pluggyLoanId: loan.id,
    pluggyItemId: loan.itemId,
    updatedAt: new Date().toISOString(),
  };
}

function mapBalloonObligations(loan) {
  const balloons = loan.installments && loan.installments.balloonPayments;
  if (!Array.isArray(balloons) || balloons.length === 0) return [];
  const settled = loanIsSettled(loan);
  const out = [];
  for (let i = 0; i < balloons.length; i += 1) {
    const b = balloons[i];
    if (!b || !b.dueDate || !b.amount || b.amount.value == null) continue;
    const due = formatYmd(b.dueDate);
    const amt = round2(Number(b.amount.value));
    out.push({
      id: `pluggy-balloon-${loan.id}-${i}-${due}`,
      kind: 'parcela',
      label: `${(loan.productName || 'Empréstimo').slice(0, 100)} (parcela)`,
      source: 'open-finance',
      status: settled ? 'paga' : 'aberta',
      amount: amt,
      dueDate: due,
      pluggyLoanId: loan.id,
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Próxima parcela regular (quando há data futura e saldo). */
function mapNextRegularInstallment(loan) {
  if (loanIsSettled(loan)) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rawOut = loan.payments && loan.payments.contractOutstandingBalance;
  const outstanding =
    rawOut != null && !Number.isNaN(Number(rawOut)) ? round2(Number(rawOut)) : null;
  if (outstanding != null && outstanding <= 0) return [];

  const monthly = estimateMonthlyInstallment(loan);
  const inst = loan.installments;
  const remaining =
    inst && inst.contractRemainingNumber != null ? Math.max(0, Number(inst.contractRemainingNumber)) : null;

  let due = null;
  if (loan.firstInstallmentDueDate) {
    const d = new Date(loan.firstInstallmentDueDate);
    if (!Number.isNaN(d.getTime()) && d >= today) due = d;
  }
  if (!due && loan.dueDate) {
    const d = new Date(loan.dueDate);
    if (!Number.isNaN(d.getTime()) && d >= today) due = d;
  }
  if (!due) return [];

  let amount = 0;
  if (monthly != null && monthly > 0) {
    amount = Math.min(monthly, outstanding ?? monthly);
  } else if (outstanding != null && remaining != null && remaining > 0) {
    amount = round2(outstanding / remaining);
  } else if (outstanding != null) {
    amount = outstanding;
  }
  if (amount <= 0) return [];

  return [
    {
      id: `pluggy-next-${loan.id}`,
      kind: 'parcela',
      label: `${(loan.productName || 'Empréstimo').slice(0, 100)} (próx. parcela)`,
      source: 'open-finance',
      status: 'aberta',
      amount,
      dueDate: formatYmd(due),
      pluggyLoanId: loan.id,
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * PLG-2 (auditoria 26/04/2026, decisão sênior): lock anti-concurrent.
 * TTL conservador: 15 min (mais que o timeout da function = 540s, com margem
 * para sync travada).
 */
const SYNC_LOCK_TTL_MS = 15 * 60 * 1000;

async function acquireSyncLock(userRef) {
  const lockRef = userRef.collection('_syncLocks').doc('pluggy');
  return userRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);
    const now = Date.now();
    if (snap.exists) {
      const startedAt = Number(snap.data()?.startedAt) || 0;
      const stale = now - startedAt > SYNC_LOCK_TTL_MS;
      if (!stale) {
        return { acquired: false, startedAt };
      }
    }
    tx.set(lockRef, {
      startedAt: now,
      startedAtIso: new Date(now).toISOString(),
    });
    return { acquired: true, startedAt: now };
  });
}

async function releaseSyncLock(userRef) {
  const lockRef = userRef.collection('_syncLocks').doc('pluggy');
  try {
    await lockRef.delete();
  } catch (e) {
    console.warn('[pluggySync] release lock falhou (não-bloqueante):', e?.message || e);
  }
}

/**
 * Sincroniza o que a Pluggy expõe para os itens conectados (contas, lançamentos, cartões, investimentos, empréstimos).
 *
 * PLG-1 (auditoria 26/04/2026): write final usa `runTransaction` para mesclar
 * `entries` manuais frescos com newTxEntries, evitando perder lançamentos
 * adicionados pelo usuário durante a sync.
 * PLG-2: lock anti-concurrent impede 2 syncs paralelas para o mesmo usuário.
 */
async function syncAccountsToUser(uid, db) {
  const userRef = db.collection('users').doc(uid);

  // PLG-2: bloqueia segunda sync concorrente
  const lock = await acquireSyncLock(userRef);
  if (!lock.acquired) {
    const ageSec = Math.round((Date.now() - lock.startedAt) / 1000);
    throw new functions.https.HttpsError(
      'aborted',
      `Sincronização Open Finance já em andamento (iniciada há ${ageSec}s). Aguarde concluir.`,
    );
  }

  try { // try/finally para sempre liberar lock

  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
  }
  const data = snap.data();
  const itemIds = Array.isArray(data.openFinanceItems) ? data.openFinanceItems : [];
  if (itemIds.length === 0) {
    return {
      ok: true,
      accounts: 0,
      transactionsAdded: 0,
      investments: 0,
      cards: 0,
      loans: 0,
      message: 'Nenhum item Pluggy vinculado. Conecte o Open Finance primeiro.',
    };
  }

  const client = getPluggyClientOrThrow();
  const all = [];
  for (const itemId of itemIds) {
    try {
      const rows = await fetchAllAccountsForItem(client, itemId);
      all.push(...rows);
    } catch (e) {
      console.error(`[pluggySync] accounts item ${itemId}:`, e?.message || e);
    }
  }

  let accounts = [...(data.accounts || [])];
  const balances = { ...(data.accountBalances || {}) };
  const meta = { ...(data.accountMeta || {}) };
  const pluggyAccountIdToLabel = {};

  for (const acc of all) {
    const label = pickUniqueLabel(acc, accounts, meta);
    if (!accounts.includes(label)) accounts.push(label);
    balances[label] = round2(pickBalance(acc));
    const tipo =
      acc.subtype === 'CREDIT_CARD'
        ? 'cartao'
        : acc.subtype === 'SAVINGS_ACCOUNT'
          ? 'poupanca'
          : 'conta';
    meta[label] = {
      ...(meta[label] || {}),
      source: 'open-finance',
      pluggyAccountId: acc.id,
      pluggyItemId: acc.itemId,
      tipo,
      incluirNaSoma: true,
    };
    pluggyAccountIdToLabel[acc.id] = label;
  }

  const fromStr = daysAgoYmd(TX_LOOKBACK_DAYS);
  const toStr = formatYmd(new Date());

  const existingEntries = data.entries || [];
  const knownPluggyTxIds = new Set(
    existingEntries.filter((e) => e.pluggyTransactionId).map((e) => String(e.pluggyTransactionId)),
  );
  const overflowPluggyIds = await loadOverflowPluggyIds(userRef);
  overflowPluggyIds.forEach((id) => knownPluggyTxIds.add(id));
  const manualEntries = existingEntries.filter((e) => !e.pluggyTransactionId);
  const oldPluggyEntries = existingEntries.filter((e) => e.pluggyTransactionId);

  const newTxEntries = [];
  let txCount = 0;

  for (const acc of all) {
    if (txCount >= MAX_NEW_TRANSACTIONS_PER_SYNC) break;
    const accLabel = pluggyAccountIdToLabel[acc.id];
    try {
      const txs = await client.fetchAllTransactions(acc.id, { from: fromStr, to: toStr });
      for (const tx of txs) {
        if (txCount >= MAX_NEW_TRANSACTIONS_PER_SYNC) break;
        if (knownPluggyTxIds.has(tx.id)) continue;
        knownPluggyTxIds.add(tx.id);
        newTxEntries.push(mapTransactionToEntry(tx, accLabel));
        txCount += 1;
      }
    } catch (e) {
      console.error(`[pluggySync] tx account ${acc.id}:`, e?.message || e);
    }
  }

  let entries = [...manualEntries, ...oldPluggyEntries, ...newTxEntries];
  const trimResult = await trimPluggyEntriesToLimit(userRef, entries);
  entries = trimResult.entries;

  let cards = [...(data.cards || [])];
  let cardsUpdated = 0;
  for (const acc of all.filter((a) => a.type === 'CREDIT')) {
    const label = pluggyAccountIdToLabel[acc.id];
    const cardPayload = mapCreditToCard(acc, label);
    const idx = cards.findIndex((c) => c.pluggyAccountId === acc.id);
    if (idx >= 0) {
      cards[idx] = { ...cards[idx], ...cardPayload };
    } else {
      cards.push(cardPayload);
    }
    cardsUpdated += 1;
  }

  let investments = [...(data.investments || [])];
  let invSynced = 0;
  for (const itemId of itemIds) {
    try {
      const invs = await fetchAllInvestmentsForItem(client, itemId);
      for (const inv of invs) {
        const mapped = mapInvestmentToUser(inv);
        const idx = investments.findIndex((i) => i.pluggyInvestmentId === inv.id);
        if (idx >= 0) {
          investments[idx] = { ...investments[idx], ...mapped };
        } else {
          investments.push(mapped);
        }
      }
      invSynced += (invs && invs.length) || 0;
    } catch (e) {
      console.error(`[pluggySync] investments item ${itemId}:`, e?.message || e);
    }
  }

  const existingCA = data.creditAccounts || [];
  const manualCA = existingCA.filter((a) => !a.pluggyLoanId);
  const allLoans = [];
  for (const itemId of itemIds) {
    try {
      const rows = await fetchAllLoansForItem(client, itemId);
      allLoans.push(...rows);
    } catch (e) {
      console.error(`[pluggySync] loans item ${itemId}:`, e?.message || e);
    }
  }
  const pluggyLoanAccounts = allLoans.map(mapLoanToCreditAccount);
  const creditAccounts = [...manualCA, ...pluggyLoanAccounts];

  const existingObl = data.creditObligations || [];
  const manualObl = existingObl.filter((o) => !o.pluggyLoanId);
  const pluggyObl = [];
  for (const loan of allLoans) {
    pluggyObl.push(...mapBalloonObligations(loan));
    pluggyObl.push(...mapNextRegularInstallment(loan));
  }
  const creditObligations = [...manualObl, ...pluggyObl];

  const creditPluggyAccounts = all.filter((a) => a.type === 'CREDIT');
  const ofExtras = await syncOpenFinanceExtras(client, {
    itemIds,
    creditPluggyAccounts,
  });

  const includedForBalance = accounts.filter((a) => meta[a]?.incluirNaSoma !== false);
  const availableBalance = includedForBalance.reduce((s, a) => s + Number(balances[a] || 0), 0);

  const creditSnapshot = buildCreditSnapshot({
    cards,
    recurrents: data.recurrents || [],
    creditAccounts,
    creditObligations,
    availableBalance,
    persistedSnapshot: data.creditSnapshot || null,
  });

  const finScore = calculateFinScore(
    entries,
    data.goals || [],
    data.budgets || {},
    balances,
    meta,
    creditSnapshot,
  );

  let categories = [...new Set([...(data.categories || []), ...DEFAULT_CATEGORIES])];

  const payload = {
    accounts,
    accountBalances: balances,
    accountMeta: meta,
    entries,
    cards,
    investments,
    creditAccounts,
    creditObligations,
    creditSnapshot,
    finScore,
    categories,
    openFinanceDataSchemaVersion: 1,
    openFinanceIdentityByItem: ofExtras.openFinanceIdentityByItem,
    openFinanceCreditBills: ofExtras.openFinanceCreditBills,
    openFinanceConsentsByItem: ofExtras.openFinanceConsentsByItem,
    openBankingAtivo: true,
    openFinanceStatus: 'ativo',
    openFinanceSyncedAt: new Date().toISOString(),
    openFinanceLastSyncSummary: {
      at: new Date().toISOString(),
      accounts: all.length,
      transactionsNew: newTxEntries.length,
      investments: invSynced,
      creditCards: cardsUpdated,
      loans: allLoans.length,
      identityItems: ofExtras.counts.identity,
      creditBills: ofExtras.counts.bills,
      consentsTotal: ofExtras.counts.consents,
      entriesArchived: trimResult.archived,
      periodFrom: fromStr,
      periodTo: toStr,
    },
    updated: new Date().toISOString(),
  };

  // PLG-1: write final em transação. Re-lê entries do Firestore e mescla
  // os manuais NOVOS (que possam ter chegado durante a sync) com os Pluggy.
  // Outros campos (accounts, balances, cards) são derivados do estado Pluggy
  // — para esses, mantemos `merge: true` que é seguro o suficiente (race
  // window curta, e edição paralela de conta/cartão durante sync é evento raro).
  await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(userRef);
    const fresh = freshSnap.exists ? (freshSnap.data() || {}) : {};
    const freshEntries = Array.isArray(fresh.entries) ? fresh.entries : [];

    // Identifica manuais frescos (criados durante a sync) que não estavam em `manualEntries` (snapshot inicial).
    const knownManualIds = new Set(manualEntries.map((e) => e.id));
    const newManualDuringSync = freshEntries.filter(
      (e) => !e.pluggyTransactionId && !knownManualIds.has(e.id),
    );
    if (newManualDuringSync.length > 0) {
      console.log(
        `[pluggySync][PLG-1] preservando ${newManualDuringSync.length} lançamento(s) manual(is) ` +
        `criado(s) durante a sync (uid=${uid}).`,
      );
    }

    // Reconstroi entries final mantendo manuais frescos no topo.
    const finalEntries = [
      ...newManualDuringSync,
      ...payload.entries,
    ];

    tx.set(userRef, { ...payload, entries: finalEntries }, { merge: true });
  });

  // Dual-write: se o usuário já foi migrado, grava novas transações na subcoleção também
  if (data.entriesMigratedAt && newTxEntries.length > 0) {
    const admin = require('firebase-admin');
    const BATCH_LIMIT = 450;
    for (let i = 0; i < newTxEntries.length; i += BATCH_LIMIT) {
      const chunk = newTxEntries.slice(i, i + BATCH_LIMIT);
      const batch = admin.firestore().batch();
      for (const entry of chunk) {
        const clean = { ...entry };
        delete clean.entryLocation;
        batch.set(userRef.collection('entries').doc(String(entry.id)), clean);
      }
      await batch.commit();
    }
    console.log(`[pluggySync] dual-write: ${newTxEntries.length} entries na subcoleção (uid=${uid})`);
  }

  return {
    ok: true,
    accounts: all.length,
    transactionsAdded: newTxEntries.length,
    investments: invSynced,
    cards: cardsUpdated,
    loans: allLoans.length,
    identityItems: ofExtras.counts.identity,
    creditBills: ofExtras.counts.bills,
    consentsTotal: ofExtras.counts.consents,
    entriesArchived: trimResult.archived,
    message:
      `Sincronizado: ${all.length} conta(s), ${newTxEntries.length} lançamento(s) novo(s), ` +
      `${invSynced} investimento(s), ${cardsUpdated} cartão(ões), ${allLoans.length} empréstimo(s), ` +
      `${ofExtras.counts.identity} identidade(s), ${ofExtras.counts.bills} fatura(s) cartão, ${ofExtras.counts.consents} consentimento(s)` +
      (trimResult.archived > 0 ? `; ${trimResult.archived} lanç. Pluggy arquivados (limite do documento).` : '.'),
  };

  } finally {
    // PLG-2: sempre liberar o lock, mesmo em erro.
    await releaseSyncLock(userRef);
  }
}

module.exports = {
  syncAccountsToUser,
  // Exposed for unit tests only — do not use in production code.
  _internals: {
    stableNumericId,
    formatYmd,
    daysAgoYmd,
    mapPluggyCategoryToApp,
    mapTransactionToEntry,
    mapCreditToCard,
    mapInvestmentToUser,
    loanIsSettled,
    estimateMonthlyInstallment,
    mapLoanKind,
    mapLoanToCreditAccount,
    mapBalloonObligations,
    mapNextRegularInstallment,
    round2,
    pickBalance,
    baseLabel,
    dayFromPluggyDate,
  },
};
