const express = require("express");
const admin = require("firebase-admin");
const {
  requireAuth,
  requireSuperAdmin,
  requireTenantAdmin,
  requireSameTenant,
  requireEmailVerified,
} = require("../../middleware/auth");
const {
  resolveTenantByHost,
  getTenantById,
  createTenant,
  updateTenantBranding,
  updateTenantFeatures,
} = require("./tenantService");
const {
  registerUserInTenant,
  createInvite,
  validateAndConsumeInvite,
} = require("../user/userService");

const db = admin.firestore();

function createTenantRouter(deps = {}) {
  const router = express.Router();
  const dbRef = deps.db || db;
  const middleware = {
    requireAuth: deps.requireAuth || requireAuth,
    requireSuperAdmin: deps.requireSuperAdmin || requireSuperAdmin,
    requireTenantAdmin: deps.requireTenantAdmin || requireTenantAdmin,
    requireSameTenant: deps.requireSameTenant || requireSameTenant,
    requireEmailVerified: deps.requireEmailVerified || requireEmailVerified,
  };
  const services = {
    resolveTenantByHost: deps.resolveTenantByHost || resolveTenantByHost,
    getTenantById: deps.getTenantById || getTenantById,
    createTenant: deps.createTenant || createTenant,
    updateTenantBranding: deps.updateTenantBranding || updateTenantBranding,
    updateTenantFeatures: deps.updateTenantFeatures || updateTenantFeatures,
    registerUserInTenant: deps.registerUserInTenant || registerUserInTenant,
    createInvite: deps.createInvite || createInvite,
    validateAndConsumeInvite: deps.validateAndConsumeInvite || validateAndConsumeInvite,
  };

  router.post("/", middleware.requireAuth, middleware.requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await services.createTenant(req.body || {}, req.auth.uid);
      return res.status(201).json(tenant);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.get("/resolve", async (req, res) => {
    try {
      const host = req.query.host || req.headers.host || "";
      const tenant = await services.resolveTenantByHost(host);
      if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });
      return res.json({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        branding: tenant.branding || {},
        features: tenant.features || {},
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", middleware.requireAuth, middleware.requireSameTenant, async (req, res) => {
    try {
      const tenant = await services.getTenantById(req.params.id);
      if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });
      const canAccess = req.auth.role === "superadmin" || req.auth.role === "admin";
      if (!canAccess) return res.status(403).json({ error: "Acesso negado." });
      return res.json(tenant);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.patch(
    "/:id/branding",
    middleware.requireAuth,
    middleware.requireTenantAdmin,
    middleware.requireSameTenant,
    middleware.requireEmailVerified,
    async (req, res) => {
      try {
        const tenant = await services.updateTenantBranding(req.params.id, req.body || {}, req.auth.uid);
        return res.json(tenant);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
  );

  router.patch("/:id/features", middleware.requireAuth, middleware.requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await services.updateTenantFeatures(req.params.id, req.body || {}, req.auth.uid);
      return res.json(tenant);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.post("/:id/users", middleware.requireAuth, middleware.requireTenantAdmin, middleware.requireSameTenant, async (req, res) => {
    try {
      const tenantId = req.params.id;
      const { uid, email, role, sendInvite = false } = req.body || {};
      if (!uid) {
        return res.status(400).json({ error: "uid obrigatório." });
      }
      const userData = await services.registerUserInTenant(tenantId, { uid, email, role });
      if (sendInvite && email) {
        const invite = await services.createInvite(tenantId, req.auth.uid, { email, role });
        return res.status(201).json({ user: userData, invite });
      }
      return res.status(201).json({ user: userData });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  // Onboarding por convite (join por código)
  router.post("/:id/invites/consume", middleware.requireAuth, middleware.requireEmailVerified, async (req, res) => {
    try {
      const tenantId = req.params.id;
      const code = String(req.body?.code || "").trim().toUpperCase();
      if (!code) {
        return res.status(400).json({ error: "code obrigatório." });
      }

      const invite = await services.validateAndConsumeInvite(tenantId, code, req.auth.email || "");
      const user = await services.registerUserInTenant(tenantId, {
        uid: req.auth.uid,
        email: req.auth.email || "",
        role: invite.role || "user",
      });

      return res.status(201).json({ ok: true, tenantId, user });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.get("/:id/stats", middleware.requireAuth, middleware.requireTenantAdmin, middleware.requireSameTenant, async (req, res) => {
    try {
      const tenantId = req.params.id;
      const usersCountSnap = await dbRef.collection("tenants").doc(tenantId).collection("users").count().get();
      const invitesCountSnap = await dbRef.collection("tenants").doc(tenantId).collection("invites").count().get();
      const usersCount = usersCountSnap.data().count || 0;
      const invitesCount = invitesCountSnap.data().count || 0;
      return res.json({ tenantId, usersCount, invitesCount });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createTenantRouter();
module.exports.createTenantRouter = createTenantRouter;
