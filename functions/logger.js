function logEvent(domain, action, payload) {
  const data = {
    level: "info",
    ts: new Date().toISOString(),
    domain,
    action,
    ...(payload || {})
  };
  console.log(JSON.stringify(data));
}

function logError(domain, action, error, payload) {
  const data = {
    level: "error",
    ts: new Date().toISOString(),
    domain,
    action,
    msg: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : undefined,
    ...(payload || {})
  };
  console.error(JSON.stringify(data));
}

module.exports = {
  logEvent,
  logError
};

