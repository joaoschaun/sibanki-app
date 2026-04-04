const admin = require("firebase-admin");
const crypto = require("crypto");
const tenantService = require("../tenant/tenantService");

const INVITE_TTL_HOURS = 72;
const INVITE_COLLECTION = "invites";
const LEGACY_SUBCOLLECTIONS = ["transactions", "accounts", "categories", "goals", "investments"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createUserService(deps = {}) {
  const adminRef = deps.admin || admin;
  const db = deps.db || adminRef.firestore();
  const tenantDeps = deps.tenantService || tenantService;
  const PLAN_LIMITS = tenantDeps.PLAN_LIMITS;
  const getMasterTenant = tenantDeps.getMasterTenant;
  const getTenantById = tenantDeps.getTenantById;
  const setUserTenantClaims = tenantDeps.setUserTenantClaims;
  const randomBytes = deps.randomBytes || crypto.randomBytes;
  const nowMs = deps.nowMs || (() => Date.now());

  function getUserLimit(tenant) {
    const plan = tenant?.plan || "starter";
    const byPlan = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
    return Number.isFinite(tenant?.userLimit) ? tenant.userLimit : byPlan;
  }

  async function countTenantUsers(tenantId) {
    const snap = await db.collection("tenants").doc(tenantId).collection("users").count().get();
    return snap.data().count || 0;
  }

  async function registerUserInTenant(tenantId, userData) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("Tenant não encontrado.");

  const currentUsers = await countTenantUsers(tenantId);
  const userLimit = getUserLimit(tenant);
  if (Number.isFinite(userLimit) && currentUsers >= userLimit) {
    const err = new Error("Limite de usuários do plano atingido.");
    err.code = "plan-limit-reached";
    throw err;
  }

  const uid = String(userData?.uid || "").trim();
  if (!uid) throw new Error("uid obrigatório.");

  const role = userData?.role || "user";
  const payload = {
    uid,
    email: normalizeEmail(userData?.email),
    displayName: userData?.displayName || "",
    role,
    tenantId,
    ownerId: uid,
    createdAt: adminRef.firestore.FieldValue.serverTimestamp(),
    updatedAt: adminRef.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("tenants").doc(tenantId).collection("users").doc(uid).set(payload, { merge: true });
  await setUserTenantClaims(uid, tenantId, role);
  return payload;
  }

  async function onUserCreated(user) {
  const master = await getMasterTenant();
  await registerUserInTenant(master.id, {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    role: "user",
  });
  return null;
  }

  async function createInvite(tenantId, inviterUid, inviteData) {
  const code = randomBytes(Math.ceil(8 / 2)).toString("hex").slice(0, 8).toUpperCase();
  const expiresAt = new Date(nowMs() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const payload = {
    tenantId,
    code,
    email: normalizeEmail(inviteData?.email),
    role: inviteData?.role || "user",
    invitedBy: inviterUid,
    status: "pending",
    createdAt: adminRef.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  };
  await db.collection("tenants").doc(tenantId).collection(INVITE_COLLECTION).doc(code).set(payload);
  return { code, expiresAt };
  }

  async function validateAndConsumeInvite(tenantId, code, email) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const normalizedEmail = normalizeEmail(email);
  const ref = db.collection("tenants").doc(tenantId).collection(INVITE_COLLECTION).doc(normalizedCode);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Convite não encontrado.");

  const data = doc.data();
  if (data.status !== "pending") throw new Error("Convite já utilizado.");
  if (normalizeEmail(data.email) !== normalizedEmail) throw new Error("E-mail do convite inválido.");
  if (new Date(data.expiresAt).getTime() < nowMs()) throw new Error("Convite expirado.");

  await ref.set(
    {
      status: "consumed",
      consumedAt: adminRef.firestore.FieldValue.serverTimestamp(),
      consumedByEmail: normalizedEmail,
    },
    { merge: true }
  );

  return data;
  }

  async function copySubcollectionDocs(sourceRef, targetRef) {
  const snap = await sourceRef.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  let count = 0;
  snap.docs.forEach((doc) => {
    batch.set(targetRef.doc(doc.id), {
      ...doc.data(),
      tenantMigratedAt: adminRef.firestore.FieldValue.serverTimestamp(),
    });
    count += 1;
  });
  await batch.commit();
  return count;
  }

  async function migrateLegacyUser(uid, targetTenantId) {
  const legacyRef = db.collection("users").doc(uid);
  const legacySnap = await legacyRef.get();
  if (!legacySnap.exists) {
    return { uid, migrated: false, reason: "legacy-user-not-found" };
  }

  const tenantUserRef = db.collection("tenants").doc(targetTenantId).collection("users").doc(uid);
  const tenantUserSnap = await tenantUserRef.get();
  if (tenantUserSnap.exists && tenantUserSnap.data()?.migratedFrom === "legacy") {
    return { uid, migrated: false, reason: "already-migrated" };
  }

  const legacyData = legacySnap.data() || {};
  await tenantUserRef.set(
    {
      ...legacyData,
      tenantId: targetTenantId,
      ownerId: uid,
      migratedFrom: "legacy",
      migratedAt: adminRef.firestore.FieldValue.serverTimestamp(),
      updatedAt: adminRef.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const copied = {};
  for (const name of LEGACY_SUBCOLLECTIONS) {
    copied[name] = await copySubcollectionDocs(legacyRef.collection(name), tenantUserRef.collection(name));
  }

  await setUserTenantClaims(uid, targetTenantId, "user");
  return { uid, migrated: true, copied };
  }

  return {
    onUserCreated,
    registerUserInTenant,
    createInvite,
    validateAndConsumeInvite,
    migrateLegacyUser,
  };
}

const userService = createUserService();

module.exports = {
  ...userService,
  createUserService,
};
