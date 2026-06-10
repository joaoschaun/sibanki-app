/**
 * CrediAmigo Service — empréstimos entre pessoas de confiança.
 * Coleção: /loans/{loanId}
 */
const { logEvent, logError } = require("../../logger");
const crypto = require("crypto");

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcInstallmentValue(amount, rateMonthly, n) {
  if (rateMonthly === 0) return Math.round((amount / n) * 100) / 100;
  const r = rateMonthly / 100;
  return Math.round((amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 100) / 100;
}

function addMonths(isoDate, months) {
  const d = new Date(isoDate + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

// ── createLoan ────────────────────────────────────────────────────────────────
async function createLoan(db, uid, userName, payload) {
  const {
    counterpartName, counterpartContact, contactType,
    amount, interestRate, installments, firstDueDate, notes,
  } = payload;

  if (!counterpartName || !counterpartContact || !contactType) {
    throw Object.assign(new Error("Dados do destinatário incompletos."), { code: "invalid-argument" });
  }
  if (!amount || amount <= 0) {
    throw Object.assign(new Error("Valor inválido."), { code: "invalid-argument" });
  }
  if (!installments || installments < 1 || installments > 60) {
    throw Object.assign(new Error("Número de parcelas inválido (1-60)."), { code: "invalid-argument" });
  }
  if (!firstDueDate) {
    throw Object.assign(new Error("Data de vencimento obrigatória."), { code: "invalid-argument" });
  }

  const rate = parseFloat(interestRate) || 0;
  const n    = parseInt(installments);
  const installValue = calcInstallmentValue(amount, rate, n);

  const installmentsList = Array.from({ length: n }, (_, i) => ({
    number:  i + 1,
    dueDate: addMonths(firstDueDate, i),
    amount:  installValue,
    status:  "pending",
    paidAt:  null,
  }));

  const acceptToken = generateToken();
  const loanRef = db.collection("loans").doc();
  const loan = {
    id:                loanRef.id,
    credorUid:         uid,
    credorName:        userName,
    devedorUid:        null,
    devedorName:       counterpartName,
    devedorContact:    counterpartContact,
    devedorContactType: contactType,
    amount:            parseFloat(amount),
    interestRate:      rate,
    installments:      n,
    firstDueDate,
    notes:             notes || "",
    status:            "pending_acceptance",
    acceptToken,
    installmentsList,
    createdAt:         new Date().toISOString(),
    acceptedAt:        null,
    completedAt:       null,
  };

  await loanRef.set(loan);
  logEvent("crediAmigo_created", { loanId: loanRef.id, uid, amount });
  return { loanId: loanRef.id, acceptToken };
}

// ── getLoans ──────────────────────────────────────────────────────────────────
async function getLoans(db, uid) {
  const [credorSnap, devedorSnap] = await Promise.all([
    db.collection("loans").where("credorUid", "==", uid).orderBy("createdAt", "desc").get(),
    db.collection("loans").where("devedorUid", "==", uid).orderBy("createdAt", "desc").get(),
  ]);
  const credorLoans  = credorSnap.docs.map((d)  => ({ ...d.data(), role: "credor" }));
  const devedorLoans = devedorSnap.docs.map((d) => ({ ...d.data(), role: "devedor" }));
  return [...credorLoans, ...devedorLoans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── getLoanByToken (público — sem auth) ───────────────────────────────────────
async function getLoanByToken(db, token) {
  const snap = await db.collection("loans").where("acceptToken", "==", token).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

// ── acceptLoan ────────────────────────────────────────────────────────────────
async function acceptLoan(db, token, devedorUid) {
  const snap = await db.collection("loans").where("acceptToken", "==", token).limit(1).get();
  if (snap.empty) {
    throw Object.assign(new Error("Convite não encontrado."), { code: "not-found" });
  }
  const doc  = snap.docs[0];
  const loan = doc.data();
  if (loan.status !== "pending_acceptance") {
    throw Object.assign(new Error("Este convite já foi processado."), { code: "failed-precondition" });
  }
  await doc.ref.update({
    status:     "active",
    acceptedAt: new Date().toISOString(),
    ...(devedorUid ? { devedorUid } : {}),
  });
  logEvent("crediAmigo_accepted", { loanId: doc.id, devedorUid });
  return { loanId: doc.id };
}

// ── markInstallmentPaid ───────────────────────────────────────────────────────
async function markInstallmentPaid(db, uid, loanId, installmentNumber) {
  const ref  = db.collection("loans").doc(loanId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw Object.assign(new Error("Empréstimo não encontrado."), { code: "not-found" });
  }
  const loan = snap.data();
  if (loan.credorUid !== uid && loan.devedorUid !== uid) {
    throw Object.assign(new Error("Sem permissão."), { code: "permission-denied" });
  }
  const list = loan.installmentsList.map((i) =>
    i.number === installmentNumber
      ? { ...i, status: "paid", paidAt: new Date().toISOString().slice(0, 10) }
      : i
  );
  const allPaid = list.every((i) => i.status === "paid");
  await ref.update({
    installmentsList: list,
    ...(allPaid ? { status: "completed", completedAt: new Date().toISOString() } : {}),
  });
  logEvent("crediAmigo_installment_paid", { loanId, installmentNumber, uid });
  return { allPaid };
}

module.exports = { createLoan, getLoans, getLoanByToken, acceptLoan, markInstallmentPaid };
