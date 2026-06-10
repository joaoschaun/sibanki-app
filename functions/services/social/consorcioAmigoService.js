/**
 * ConsorcioAmigo Service — caixinha entre amigos (ROSCA).
 * Coleção: /consorcioGroups/{groupId}
 */
const { logEvent, logError } = require("../../logger");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function addPeriod(isoDate, frequency, count) {
  const d = new Date(isoDate + "T12:00:00");
  if (frequency === "monthly")  d.setMonth(d.getMonth() + count);
  else                           d.setDate(d.getDate() + count * 14);
  return d.toISOString().slice(0, 10);
}

// ── createGroup ───────────────────────────────────────────────────────────────
async function createGroup(db, uid, adminName, payload) {
  const {
    name, contributionAmount, frequency, drawMethod,
    startDate, members,
  } = payload;

  if (!name) throw Object.assign(new Error("Nome do grupo obrigatório."), { code: "invalid-argument" });
  if (!contributionAmount || contributionAmount <= 0) throw Object.assign(new Error("Valor inválido."), { code: "invalid-argument" });
  if (!members || members.length < 1) throw Object.assign(new Error("Adicione ao menos 1 participante."), { code: "invalid-argument" });
  if (!startDate) throw Object.assign(new Error("Data de início obrigatória."), { code: "invalid-argument" });

  const totalParticipants = members.length + 1; // +1 admin
  const inviteToken = generateToken();

  // Gera rodadas
  const rounds = Array.from({ length: totalParticipants }, (_, i) => ({
    number:   i + 1,
    dueDate:  addPeriod(startDate, frequency, i),
    winnerId: null,
    status:   i === 0 ? "active" : "upcoming",
  }));

  // Admin como primeiro membro aceito
  const builtMembers = [
    {
      id:           uid,
      name:         adminName,
      contact:      "",
      contactType:  "whatsapp",
      isAdmin:      true,
      status:       "accepted",
      receivedRound: null,
      inviteToken:  null,
      payments:     rounds.map((r) => ({ round: r.number, paid: false, date: null })),
    },
    ...members.map((m) => ({
      id:           generateToken(),  // placeholder até aceitar
      name:         m.name,
      contact:      m.contact,
      contactType:  m.contactType,
      isAdmin:      false,
      status:       "invited",
      receivedRound: null,
      inviteToken:  generateToken(),
      payments:     rounds.map((r) => ({ round: r.number, paid: false, date: null })),
    })),
  ];

  const ref = db.collection("consorcioGroups").doc();
  const group = {
    id:                 ref.id,
    adminUid:           uid,
    adminName,
    name,
    contributionAmount: parseFloat(contributionAmount),
    frequency,
    drawMethod:         drawMethod || "random",
    startDate,
    status:             "pending",
    inviteToken,
    members:            builtMembers,
    rounds,
    createdAt:          new Date().toISOString(),
    activatedAt:        null,
    completedAt:        null,
  };

  await ref.set(group);
  logEvent("consorcio_created", { groupId: ref.id, uid, participants: totalParticipants });
  return { groupId: ref.id, inviteToken };
}

// ── getGroups ─────────────────────────────────────────────────────────────────
async function getGroups(db, uid) {
  const snap = await db.collection("consorcioGroups")
    .where("adminUid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();
  // Também busca grupos onde o uid aparece como membro aceito
  const memberSnap = await db.collection("consorcioGroups")
    .where("status", "in", ["pending", "active"])
    .get();
  const memberGroups = memberSnap.docs
    .filter((d) => {
      const g = d.data();
      return g.adminUid !== uid && g.members.some((m) => m.id === uid && m.status === "accepted");
    })
    .map((d) => d.data());

  const adminGroups = snap.docs.map((d) => d.data());
  return [...adminGroups, ...memberGroups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── getGroupByInviteToken (público) ───────────────────────────────────────────
async function getGroupByInviteToken(db, token) {
  const snap = await db.collection("consorcioGroups")
    .where("inviteToken", "==", token).limit(1).get();
  if (!snap.empty) return snap.docs[0].data();
  // Busca por token individual de membro
  const memberSnap = await db.collection("consorcioGroups").get();
  for (const doc of memberSnap.docs) {
    const g = doc.data();
    const member = g.members.find((m) => m.inviteToken === token);
    if (member) return { ...g, invitedMember: member };
  }
  return null;
}

// ── acceptGroupInvite ──────────────────────────────────────────────────────────
async function acceptGroupInvite(db, token, uid) {
  const memberSnap = await db.collection("consorcioGroups").get();
  let groupRef = null;
  let groupData = null;
  let memberIndex = -1;

  for (const doc of memberSnap.docs) {
    const g = doc.data();
    const idx = g.members.findIndex((m) => m.inviteToken === token);
    if (idx !== -1) {
      groupRef     = doc.ref;
      groupData    = g;
      memberIndex  = idx;
      break;
    }
  }

  if (!groupRef) throw Object.assign(new Error("Convite não encontrado."), { code: "not-found" });
  if (groupData.members[memberIndex].status !== "invited") {
    throw Object.assign(new Error("Convite já processado."), { code: "failed-precondition" });
  }

  const members = [...groupData.members];
  members[memberIndex] = { ...members[memberIndex], status: "accepted", id: uid || members[memberIndex].id };

  const allAccepted = members.every((m) => m.status === "accepted");
  await groupRef.update({
    members,
    ...(allAccepted ? { status: "active", activatedAt: new Date().toISOString() } : {}),
  });
  logEvent("consorcio_member_accepted", { groupId: groupRef.id, uid });
  return { groupId: groupRef.id, allAccepted };
}

// ── drawWinner ────────────────────────────────────────────────────────────────
async function drawWinner(db, uid, groupId, roundNumber) {
  const ref  = db.collection("consorcioGroups").doc(groupId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error("Grupo não encontrado."), { code: "not-found" });
  const g = snap.data();
  if (g.adminUid !== uid) throw Object.assign(new Error("Apenas o admin pode sortear."), { code: "permission-denied" });

  const round = g.rounds.find((r) => r.number === roundNumber);
  if (!round || round.status !== "active") {
    throw Object.assign(new Error("Rodada não está ativa."), { code: "failed-precondition" });
  }
  if (round.winnerId) throw Object.assign(new Error("Rodada já tem ganhador."), { code: "failed-precondition" });

  const eligible = g.members.filter((m) => m.status === "accepted" && m.receivedRound === null);
  if (eligible.length === 0) throw Object.assign(new Error("Todos os membros já receberam."), { code: "failed-precondition" });

  const winner = eligible[Math.floor(Math.random() * eligible.length)];

  const rounds  = g.rounds.map((r) =>
    r.number === roundNumber ? { ...r, winnerId: winner.id, status: "completed" } : r
  );
  const nextRound = g.rounds.find((r) => r.number === roundNumber + 1);
  const finalRounds = nextRound
    ? rounds.map((r) => r.number === roundNumber + 1 ? { ...r, status: "active" } : r)
    : rounds;

  const members = g.members.map((m) =>
    m.id === winner.id ? { ...m, receivedRound: roundNumber } : m
  );

  const allDone = finalRounds.every((r) => r.status === "completed");
  await ref.update({
    rounds:   finalRounds,
    members,
    ...(allDone ? { status: "completed", completedAt: new Date().toISOString() } : {}),
  });

  logEvent("consorcio_draw", { groupId, roundNumber, winnerId: winner.id, winnerName: winner.name });
  return { winnerId: winner.id, winnerName: winner.name, allDone };
}

// ── markRoundPaid ─────────────────────────────────────────────────────────────
async function markRoundPaid(db, uid, groupId, roundNumber, memberId) {
  const ref  = db.collection("consorcioGroups").doc(groupId);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error("Grupo não encontrado."), { code: "not-found" });
  const g = snap.data();
  if (g.adminUid !== uid) throw Object.assign(new Error("Apenas o admin pode confirmar pagamentos."), { code: "permission-denied" });

  const members = g.members.map((m) => {
    if (m.id !== memberId) return m;
    return {
      ...m,
      payments: m.payments.map((p) =>
        p.round === roundNumber ? { ...p, paid: true, date: new Date().toISOString().slice(0, 10) } : p
      ),
    };
  });

  await ref.update({ members });
  logEvent("consorcio_payment_confirmed", { groupId, roundNumber, memberId, uid });
  return { ok: true };
}

module.exports = {
  createGroup,
  getGroups,
  getGroupByInviteToken,
  acceptGroupInvite,
  drawWinner,
  markRoundPaid,
};
