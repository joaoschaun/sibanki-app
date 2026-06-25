/**
 * rewardEngine — Motor de Recompensas SibCoin
 *
 * Responsabilidades:
 *   1. Receber eventos da plataforma (entry_added, goal_created, open_finance_connected, etc.)
 *   2. Verificar missões elegíveis para o usuário
 *   3. Creditar SibCoin no Firestore (ledger off-chain) com transação atômica
 *   4. Atualizar tier do usuário (bronze → silver → gold → diamond)
 *
 * Fase atual: off-chain Firestore
 * Fase futura: bridge para Polygon ERC-20 via Cloud Function separada (bridgeSibcoin)
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// ── 5 Missões Iniciais ────────────────────────────────────────────────────────
const MISSIONS = [
  {
    id: 'mission_first_entry',
    title: 'Primeiro Lançamento',
    description: 'Cadastre seu primeiro lançamento financeiro',
    category: 'onboarding',
    frequency: 'once',
    reward: 50,
    requiredEvent: 'entry_added',
    requiredCount: 1,
    iconEmoji: '📝',
    active: true,
  },
  {
    id: 'mission_first_goal',
    title: 'Primeiro Objetivo',
    description: 'Crie seu primeiro objetivo financeiro',
    category: 'onboarding',
    frequency: 'once',
    reward: 100,
    requiredEvent: 'goal_created',
    requiredCount: 1,
    iconEmoji: '🎯',
    active: true,
  },
  {
    id: 'mission_open_finance',
    title: 'Open Finance Conectado',
    description: 'Conecte sua conta bancária via Open Finance',
    category: 'onboarding',
    frequency: 'once',
    reward: 200,
    requiredEvent: 'open_finance_connected',
    requiredCount: 1,
    iconEmoji: '🏦',
    active: true,
  },
  {
    id: 'mission_first_investment',
    title: 'Primeiro Investimento',
    description: 'Cadastre seu primeiro investimento',
    category: 'onboarding',
    frequency: 'once',
    reward: 150,
    requiredEvent: 'investment_added',
    requiredCount: 1,
    iconEmoji: '📈',
    active: true,
  },
  {
    id: 'mission_weekly_entries',
    title: 'Semana Financeira',
    description: 'Cadastre pelo menos 5 lançamentos em uma semana',
    category: 'habito',
    frequency: 'weekly',
    reward: 30,
    requiredEvent: 'entry_added',
    requiredCount: 5,
    iconEmoji: '📊',
    active: true,
  },
  {
    id: 'mission_login_streak',
    title: 'Check-in Diário',
    description: 'Acesse o Sibanki todos os dias',
    category: 'habito',
    frequency: 'daily',
    reward: 10,
    requiredEvent: 'login_streak',
    requiredCount: 1,
    iconEmoji: '🔥',
    active: true,
  },
  {
    id: 'mission_budget_created',
    title: 'Orçamento Definido',
    description: 'Configure seu orçamento mensal por categoria',
    category: 'onboarding',
    frequency: 'once',
    reward: 75,
    requiredEvent: 'budget_created',
    requiredCount: 1,
    iconEmoji: '💰',
    active: true,
  },
  {
    id: 'mission_profile_completed',
    title: 'Perfil Completo',
    description: 'Preencha nome, telefone e objetivo financeiro',
    category: 'onboarding',
    frequency: 'once',
    reward: 100,
    requiredEvent: 'profile_completed',
    requiredCount: 1,
    iconEmoji: '👤',
    active: true,
  },
  {
    /**
     * Acao 8 -- Missao DDA
     * Recompensa o usuario quando o primeiro boleto e detectado
     * automaticamente pela integracao DDA / Pluggy.
     * Evento: dda_boleto_detected  |  Recompensa: 80 SibCoin
     */
    id: 'mission_first_dda_boleto',
    title: 'Primeiro Boleto DDA',
    description: 'Tenha seu primeiro boleto detectado automaticamente via DDA',
    category: 'onboarding',
    frequency: 'once',
    reward: 80,
    requiredEvent: 'dda_boleto_detected',
    requiredCount: 1,
    iconEmoji: '📄',
    active: true,
  },
];

// ── Tiers (lifetime SibCoin earned) ──────────────────────────────────────────
const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 2000, diamond: 10000 };

function calcTier(earned = 0) {
  if (earned >= TIER_THRESHOLDS.diamond) return 'diamond';
  if (earned >= TIER_THRESHOLDS.gold) return 'gold';
  if (earned >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

function getPeriodKey(frequency) {
  const now = new Date();
  if (frequency === 'daily') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (frequency === 'weekly') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  if (frequency === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

function isMissionCompleted(mission, userData) {
  const completed = userData.sibcoinMissionsCompleted || {};
  if (mission.frequency === 'once') return !!completed[mission.id];
  const periodKey = getPeriodKey(mission.frequency);
  return !!completed[`${mission.id}:${periodKey}`];
}

/**
 * REW-4 (auditoria 26/04/2026, decisão sênior): validação anti-farming.
 *
 * Antes: `triggerSibcoinEvent` aceitava qualquer evento da allowlist e creditava
 * SibCoin imediatamente. Atacante autenticado podia chamar
 * `{eventType: 'open_finance_connected'}` sem ter Open Finance e ganhar 200 SC.
 * 7 missões "once" trivialmente farmaveis = ~755 SC (~R$ 75 a 0,10/SC).
 *
 * Agora: para cada evento, verificamos se o estado real do usuário no Firestore
 * comprova a ação. Sem prova de estado, retornamos `false` e não creditamos.
 */
function isEventStateValid(eventType, userData) {
  switch (eventType) {
    case 'entry_added': {
      const entries = userData.entries;
      return Array.isArray(entries) && entries.length > 0;
    }
    case 'goal_created': {
      const goals = userData.goals;
      return Array.isArray(goals) && goals.length > 0;
    }
    case 'open_finance_connected': {
      // Bandeira escrita por registrarOpenBanking + sync Pluggy bem-sucedido
      return userData.openBankingAtivo === true ||
             userData.openFinanceStatus === 'ativo' ||
             !!userData.openFinanceSyncedAt;
    }
    case 'investment_added': {
      const inv = userData.investments;
      return Array.isArray(inv) && inv.length > 0;
    }
    case 'budget_created': {
      const b = userData.budgets;
      return b && typeof b === 'object' && Object.keys(b).length > 0;
    }
    case 'profile_completed': {
      // Definição mínima: nome + telefone + objetivoFinanceiro preenchidos
      return !!(userData.name && userData.whatsappPhone && userData.objetivoFinanceiro);
    }
    case 'dda_boleto_detected': {
      const boletos = userData.boletosDDA;
      return Array.isArray(boletos) && boletos.length > 0;
    }
    case 'login_streak':
    case 'referral_signup':
      // Eventos de fluxo: difícil validar estado retroativo. Mantemos liberados
      // mas com rate limit natural por frequência (daily/once com requiredCount).
      return true;
    default:
      // Evento desconhecido — caller já filtrou via VALID_EVENTS, mas defensivo:
      return false;
  }
}

/**
 * processEvent — credita SibCoin atomicamente no Firestore.
 * Exportado para uso interno por outras Cloud Functions.
 */
async function processEvent(uid, eventType, eventMeta = {}) {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const completedMissions = [];

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error(`Usuário ${uid} não encontrado`);

    const userData = userSnap.data();

    // REW-4: validar estado real do usuário antes de creditar.
    // Sem essa checagem, atacante autenticado farma SC simplesmente chamando
    // `triggerSibcoinEvent({eventType: 'open_finance_connected'})` sem ter
    // Open Finance conectado.
    if (!isEventStateValid(eventType, userData)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[REW-4] processEvent rejeitado para uid=${uid} eventType=${eventType}: ` +
        "estado do usuário não comprova o evento."
      );
      return;
    }

    const now = new Date().toISOString();
    let totalCredit = 0;
    const newCompletions = {};
    const newTransactions = [];

    // sibcoinProgress stores incremental counters: { "missionId:periodKey": count }
    const currentProgress = userData.sibcoinProgress || {};
    const progressUpdates = {};

    for (const mission of MISSIONS) {
      if (!mission.active) continue;
      if (mission.requiredEvent !== eventType) continue;
      if (isMissionCompleted(mission, userData)) continue;

      const periodKey = getPeriodKey(mission.frequency);
      const completionKey = periodKey ? `${mission.id}:${periodKey}` : mission.id;

      if (mission.requiredCount > 1) {
        // Progress-tracked mission (e.g. mission_weekly_entries needs 5 entries)
        const progressKey = periodKey ? `${mission.id}:${periodKey}` : mission.id;
        const prev = currentProgress[progressKey] || 0;
        const next = prev + 1;
        progressUpdates[`sibcoinProgress.${progressKey}`] = next;
        if (next < mission.requiredCount) continue; // not complete yet
      }

      totalCredit += mission.reward;
      newCompletions[`sibcoinMissionsCompleted.${completionKey}`] = now;
      completedMissions.push(mission);

      newTransactions.push({
        id: `${uid}_${mission.id}_${Date.now()}`,
        type: 'credit',
        event: 'mission_completed',
        amount: mission.reward,
        balanceAfter: (userData.sibcoinBalance || 0) + totalCredit,
        description: `Missão: ${mission.title}`,
        missionId: mission.id,
        createdAt: now,
      });
    }

    // Always increment progress counters, even if mission not yet complete
    if (Object.keys(progressUpdates).length > 0 && totalCredit === 0) {
      tx.update(userRef, { ...progressUpdates, updated: now });
      return;
    }

    if (totalCredit === 0) return;

    const newBalance = (userData.sibcoinBalance || 0) + totalCredit;
    const newEarned = (userData.sibcoinEarned || 0) + totalCredit;
    const currentHistory = userData.sibcoinHistory || [];

    tx.update(userRef, {
      sibcoinBalance: newBalance,
      sibcoinEarned: newEarned,
      sibcoinTier: calcTier(newEarned),
      sibcoinHistory: [...newTransactions, ...currentHistory].slice(0, 50),
      ...newCompletions,
      ...progressUpdates,
      updated: now,
    });
  });

  return completedMissions;
}

// ── Callable: front-end dispara evento ───────────────────────────────────────
exports.triggerSibcoinEvent = onCall(
  // REW-2 (auditoria 26/04/2026): App Check honra env. Em prod recomendo ON.
  { region: 'southamerica-east1', enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' },
  async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Autenticação necessária');

    const VALID_EVENTS = [
      'entry_added', 'goal_created', 'open_finance_connected',
      'profile_completed', 'investment_added', 'budget_created',
      'login_streak', 'referral_signup', 'dda_boleto_detected',
    ];
    if (!data.eventType || !VALID_EVENTS.includes(data.eventType)) {
      throw new HttpsError('invalid-argument', `Evento inválido: ${data.eventType}`);
    }

    const completed = await processEvent(auth.uid, data.eventType, data.eventMeta || {});
    const sibcoinAwarded = completed.reduce((s, m) => s + m.reward, 0);

    const userSnap = await admin.firestore().collection('users').doc(auth.uid).get();
    const userData = userSnap.data() || {};

    return {
      completedMissions: completed.map((m) => ({
        id: m.id, title: m.title, reward: m.reward, iconEmoji: m.iconEmoji,
      })),
      sibcoinAwarded,
      newBalance: userData.sibcoinBalance || 0,
      newTier: userData.sibcoinTier || 'bronze',
    };
  }
);

// ── Callable: buscar missões com status do usuário ───────────────────────────
exports.getSibcoinMissions = onCall(
  // REW-2 (auditoria 26/04/2026): App Check honra env. Em prod recomendo ON.
  { region: 'southamerica-east1', enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' },
  async (request) => {
    const { auth } = request;
    if (!auth) throw new HttpsError('unauthenticated', 'Autenticação necessária');

    let userSnap = await admin.firestore().collection('users').doc(auth.uid).get();
    let userData = userSnap.exists ? userSnap.data() : {};

    let dataChanged = false;

    // Verificar se há missões "once" pendentes que já podem ser concluídas de acordo com o estado do usuário
    for (const m of MISSIONS) {
      if (m.active && m.frequency === 'once' && !isMissionCompleted(m, userData)) {
        if (isEventStateValid(m.requiredEvent, userData)) {
          // Processa o evento para conceder a recompensa
          await processEvent(auth.uid, m.requiredEvent);
          dataChanged = true;
        }
      }
    }

    // Se houve alteração de dados, reler o documento do usuário
    if (dataChanged) {
      userSnap = await admin.firestore().collection('users').doc(auth.uid).get();
      userData = userSnap.exists ? userSnap.data() : {};
    }

    const userProgress = (userSnap.exists ? userSnap.data()?.sibcoinProgress : {}) || {};

    return {
      missions: MISSIONS.filter((m) => m.active).map((m) => {
        const periodKey = getPeriodKey(m.frequency);
        const progressKey = periodKey ? `${m.id}:${periodKey}` : m.id;
        return {
          ...m,
          completed: isMissionCompleted(m, userData),
          periodKey,
          progress: m.requiredCount > 1 ? (userProgress[progressKey] || 0) : undefined,
          target: m.requiredCount > 1 ? m.requiredCount : undefined,
        };
      }),
      balance: userData.sibcoinBalance || 0,
      tier: userData.sibcoinTier || 'bronze',
      earned: userData.sibcoinEarned || 0,
    };
  }
);

// ── Callable: crédito manual (admin) ─────────────────────────────────────────
exports.adminCreditSibcoin = onCall(
  // REW-2 (auditoria 26/04/2026): App Check honra env. Em prod recomendo ON.
  { region: 'southamerica-east1', enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true' },
  async (request) => {
    const { auth, data } = request;
    if (!auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Apenas administradores');
    }
    const { targetUid, amount, description = 'Crédito administrativo' } = data;
    if (!targetUid || !amount || amount <= 0) {
      throw new HttpsError('invalid-argument', 'targetUid e amount positivo obrigatórios');
    }

    const db = admin.firestore();
    await db.runTransaction(async (tx) => {
      const ref = db.collection('users').doc(targetUid);
      const snap = await tx.get(ref);
      const ud = snap.exists ? snap.data() : {};
      const now = new Date().toISOString();
      const newBalance = (ud.sibcoinBalance || 0) + amount;
      const newEarned = (ud.sibcoinEarned || 0) + amount;
      const txRecord = {
        id: `admin_${targetUid}_${Date.now()}`,
        type: 'credit', event: 'admin_credit',
        amount, balanceAfter: newBalance, description, createdAt: now,
      };
      tx.set(ref, {
        sibcoinBalance: newBalance,
        sibcoinEarned: newEarned,
        sibcoinTier: calcTier(newEarned),
        sibcoinHistory: [txRecord, ...(ud.sibcoinHistory || [])].slice(0, 50),
        updated: now,
      }, { merge: true });
    });

    return { success: true, targetUid, amount };
  }
);

module.exports.processEvent = processEvent;
module.exports.MISSIONS = MISSIONS;
module.exports.calcTier = calcTier;
