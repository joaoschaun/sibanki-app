const admin = require("firebase-admin");

const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE = new Map();

const PLAN_LIMITS = {
  starter: 100,
  growth: 1000,
  enterprise: Number.POSITIVE_INFINITY,
};

const DEFAULT_FEATURES = {
  openFinance: false,
  whatsapp: true,
  reports: true,
  advisor: true,
};

const DEFAULT_BRANDING = {
  appName: "Sibanki",
  primaryColor: "#22c55e",
  secondaryColor: "#0ea5e9",
  logoUrl: "",
  faviconUrl: "",
  customCss: "",
};

const DEFAULT_CATEGORIES = [
  "Alimentacao",
  "Moradia",
  "Transporte",
  "Saude",
  "Educacao",
  "Lazer",
  "Investimentos",
  "Outros",
];

function createTenantService(deps = {}) {
  const adminRef = deps.admin || admin;
  const db = deps.db || adminRef.firestore();
  const cache = deps.cache || CACHE;
  const now = deps.now || (() => Date.now());

  function setCache(key, value) {
    cache.set(key, { value, expiresAt: now() + TENANT_CACHE_TTL_MS });
  }

  function getCache(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (item.expiresAt < now()) {
      cache.delete(key);
      return null;
    }
    return item.value;
  }

  function clearCacheForTenant(tenant) {
    if (!tenant) return;
    cache.delete(`tenant:id:${tenant.id}`);
    if (tenant.slug) cache.delete(`tenant:slug:${tenant.slug}`);
    if (Array.isArray(tenant.domains)) {
      tenant.domains.forEach((domain) => cache.delete(`tenant:host:${String(domain).toLowerCase()}`));
    }
  }

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

function mapTenant(doc) {
  const data = doc.data() || {};
  return { id: doc.id, ...data };
}

  async function resolveTenantByHost(host) {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  const cacheKey = `tenant:host:${normalized}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const snap = await db
    .collection("tenants")
    .where("domains", "array-contains", normalized)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const tenant = mapTenant(snap.docs[0]);
  setCache(cacheKey, tenant);
  setCache(`tenant:id:${tenant.id}`, tenant);
  if (tenant.slug) setCache(`tenant:slug:${tenant.slug}`, tenant);
  return tenant;
  }

  async function resolveTenantBySlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  const cacheKey = `tenant:slug:${normalized}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const snap = await db.collection("tenants").where("slug", "==", normalized).limit(1).get();
  if (snap.empty) return null;
  const tenant = mapTenant(snap.docs[0]);
  setCache(cacheKey, tenant);
  setCache(`tenant:id:${tenant.id}`, tenant);
  if (Array.isArray(tenant.domains)) {
    tenant.domains.forEach((domain) => setCache(`tenant:host:${String(domain).toLowerCase()}`, tenant));
  }
  return tenant;
  }

  async function getTenantById(tenantId) {
  const id = String(tenantId || "").trim();
  if (!id) return null;
  const cacheKey = `tenant:id:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const doc = await db.collection("tenants").doc(id).get();
  if (!doc.exists) return null;
  const tenant = mapTenant(doc);
  setCache(cacheKey, tenant);
  if (tenant.slug) setCache(`tenant:slug:${tenant.slug}`, tenant);
  if (Array.isArray(tenant.domains)) {
    tenant.domains.forEach((domain) => setCache(`tenant:host:${String(domain).toLowerCase()}`, tenant));
  }
  return tenant;
  }

  async function getMasterTenant() {
  const tenant = await getTenantById("sibanki_master");
  if (tenant) return tenant;
  return createTenant(
    {
      tenantId: "sibanki_master",
      name: "Sibanki Master",
      slug: "sibanki-master",
      domains: ["sibanki.com.br", "app.sibanki.com.br", "localhost"],
      plan: "enterprise",
      branding: DEFAULT_BRANDING,
      features: DEFAULT_FEATURES,
    },
    "system"
  );
  }

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

  async function assertUniqueSlug(slug) {
  const existing = await db.collection("tenants").where("slug", "==", slug).limit(1).get();
  if (!existing.empty) {
    const error = new Error("Slug já existe.");
    error.code = "slug-already-exists";
    throw error;
  }
  }

  async function createTenant(data, uid) {
  const tenantId = String(data?.tenantId || data?.id || "").trim() || db.collection("tenants").doc().id;
  const name = String(data?.name || "").trim();
  const slug = normalizeSlug(data?.slug);
  const plan = PLAN_LIMITS[data?.plan] ? data.plan : "starter";
  const domains = Array.isArray(data?.domains)
    ? data.domains.map((d) => normalizeHost(d)).filter(Boolean)
    : [];

  if (!name) throw new Error("Nome do tenant é obrigatório.");
  if (!slug) throw new Error("Slug do tenant é obrigatório.");
  await assertUniqueSlug(slug);

  const ref = db.collection("tenants").doc(tenantId);
  const snap = await ref.get();
  if (snap.exists) {
    throw new Error("Tenant já existe.");
  }

  const tenantData = {
    name,
    slug,
    plan,
    userLimit: PLAN_LIMITS[plan],
    domains,
    status: "active",
    branding: { ...DEFAULT_BRANDING, ...(data?.branding || {}) },
    features: { ...DEFAULT_FEATURES, ...(data?.features || {}) },
    createdBy: uid,
    createdAt: adminRef.firestore.FieldValue.serverTimestamp(),
    updatedAt: adminRef.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(ref, tenantData);
  batch.set(ref.collection("config").doc("default"), {
    locale: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    createdAt: adminRef.firestore.FieldValue.serverTimestamp(),
  });

  DEFAULT_CATEGORIES.forEach((nameCategory, index) => {
    batch.set(ref.collection("categories").doc(), {
      name: nameCategory,
      type: "despesa",
      order: index + 1,
      createdAt: adminRef.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  const created = await getTenantById(tenantId);
  return created;
  }

  async function updateTenantBranding(tenantId, branding, uid) {
  const ref = db.collection("tenants").doc(tenantId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Tenant não encontrado.");
  await ref.set(
    {
      branding: { ...(doc.data().branding || DEFAULT_BRANDING), ...(branding || {}) },
      updatedBy: uid,
      updatedAt: adminRef.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  clearCacheForTenant({ id: tenantId, ...(doc.data() || {}) });
  return getTenantById(tenantId);
  }

  async function updateTenantFeatures(tenantId, features, uid) {
  const ref = db.collection("tenants").doc(tenantId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Tenant não encontrado.");
  await ref.set(
    {
      features: { ...(doc.data().features || DEFAULT_FEATURES), ...(features || {}) },
      updatedBy: uid,
      updatedAt: adminRef.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  clearCacheForTenant({ id: tenantId, ...(doc.data() || {}) });
  return getTenantById(tenantId);
  }

  async function setUserTenantClaims(uid, tenantId, role) {
  const normalizedRole = ALLOWED_ROLE(role);
  const user = await adminRef.auth().getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  claims.tenantId = tenantId;
  claims.role = normalizedRole;
  await adminRef.auth().setCustomUserClaims(uid, claims);
  return claims;
  }

function ALLOWED_ROLE(role) {
  if (role === "superadmin" || role === "admin" || role === "user") return role;
  return "user";
}

  async function verifyUserTenant(uid, expectedTenantId) {
  const user = await adminRef.auth().getUser(uid);
  const claims = user.customClaims || {};
  const inClaims = claims.tenantId === expectedTenantId;
  const userDoc = await db.collection("tenants").doc(expectedTenantId).collection("users").doc(uid).get();
  return {
    ok: inClaims && userDoc.exists,
    claimsTenantId: claims.tenantId || null,
    expectedTenantId,
    role: claims.role || null,
    inTenantCollection: userDoc.exists,
  };
  }

  return {
    PLAN_LIMITS,
    resolveTenantByHost,
    resolveTenantBySlug,
    getMasterTenant,
    getTenantById,
    createTenant,
    updateTenantBranding,
    updateTenantFeatures,
    setUserTenantClaims,
    verifyUserTenant,
  };
}

const tenantService = createTenantService();

module.exports = {
  ...tenantService,
  createTenantService,
};
