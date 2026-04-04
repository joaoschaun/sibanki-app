const SEVERITY = { DEBUG: "DEBUG", INFO: "INFO", WARNING: "WARNING", ERROR: "ERROR", CRITICAL: "CRITICAL" };

function _write(severity, data) {
  const entry = { severity, timestamp: new Date().toISOString(), ...data };
  const json = JSON.stringify(entry);
  if (severity === "ERROR" || severity === "CRITICAL") console.error(json);
  else if (severity === "WARNING") console.warn(json);
  else console.log(json);
}

function logEvent(domain, action, payload) {
  _write(SEVERITY.INFO, { domain, action, ...(payload || {}) });
}

function logWarn(domain, action, payload) {
  _write(SEVERITY.WARNING, { domain, action, ...(payload || {}) });
}

function logError(domain, action, error, payload) {
  _write(SEVERITY.ERROR, {
    domain,
    action,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack.split("\n").slice(0, 5).join("\n") : undefined,
    ...(payload || {}),
  });
}

function logCritical(domain, action, error, payload) {
  _write(SEVERITY.CRITICAL, {
    domain,
    action,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : undefined,
    ...(payload || {}),
  });
}

function timer(domain, action) {
  const start = Date.now();
  return {
    end(payload) {
      const durationMs = Date.now() - start;
      logEvent(domain, action, { durationMs, ...(payload || {}) });
      return durationMs;
    },
    fail(error, payload) {
      const durationMs = Date.now() - start;
      logError(domain, action, error, { durationMs, ...(payload || {}) });
      return durationMs;
    },
  };
}

module.exports = {
  logEvent,
  logWarn,
  logError,
  logCritical,
  timer,
  SEVERITY,
};

