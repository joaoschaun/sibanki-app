const admin = require("firebase-admin");

const ALLOWED_ROLES = new Set(["user", "admin", "superadmin"]);

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

function createAuthMiddleware(deps = {}) {
  const adminRef = deps.admin || admin;

  async function requireAuth(req, res, next) {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: "Token ausente." });
      }

      const decoded = await adminRef.auth().verifyIdToken(token, true);
      const tenantId = decoded.tenantId || null;
      const role = decoded.role || "user";

      if (!tenantId || !ALLOWED_ROLES.has(role)) {
        return res.status(403).json({ error: "Claims de tenant inválidas." });
      }

      req.auth = {
        uid: decoded.uid,
        email: decoded.email || null,
        email_verified: !!decoded.email_verified,
        tenantId,
        role,
        claims: decoded,
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        error: "Token inválido ou revogado.",
        details: error.message,
      });
    }
  }

  function requireSuperAdmin(req, res, next) {
    if (req.auth?.role !== "superadmin") {
      return res.status(403).json({ error: "Acesso restrito a superadmin." });
    }
    return next();
  }

  function requireTenantAdmin(req, res, next) {
    if (!req.auth || (req.auth.role !== "admin" && req.auth.role !== "superadmin")) {
      return res.status(403).json({ error: "Acesso restrito a admin do tenant." });
    }
    return next();
  }

  function requireSameTenant(req, res, next) {
    const tenantId = req.params.id || req.params.tenantId || req.body?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId obrigatório." });
    }
    if (req.auth?.role === "superadmin" || req.auth?.tenantId === tenantId) {
      return next();
    }
    return res.status(403).json({ error: "Tenant não autorizado." });
  }

  function requireOwnerOrTenantAdmin(req, res, next) {
    const ownerUid = req.params.userId || req.body?.uid;
    if (!ownerUid) {
      return res.status(400).json({ error: "uid obrigatório." });
    }
    if (
      req.auth?.role === "superadmin" ||
      req.auth?.role === "admin" ||
      req.auth?.uid === ownerUid
    ) {
      return next();
    }
    return res.status(403).json({ error: "Acesso negado ao recurso do usuário." });
  }

  function requireEmailVerified(req, res, next) {
    if (req.auth?.role === "superadmin") return next();
    if (!req.auth?.email_verified) {
      return res.status(403).json({ error: "E-mail não verificado." });
    }
    return next();
  }

  return {
    requireAuth,
    requireSuperAdmin,
    requireTenantAdmin,
    requireSameTenant,
    requireOwnerOrTenantAdmin,
    requireEmailVerified,
  };
}

const middleware = createAuthMiddleware();

module.exports = {
  ...middleware,
  createAuthMiddleware,
};
