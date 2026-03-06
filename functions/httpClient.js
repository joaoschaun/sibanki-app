const fetch = require("node-fetch");

/**
 * Wrapper simples para chamadas HTTP com timeout e logging básico.
 * Mantém comportamento próximo ao código atual, mas centraliza tratamento.
 */
async function fetchJson(url, options = {}, context = "http") {
  const { timeout, method = "GET", headers, body } = options;
  const start = Date.now();

  try {
    const resp = await fetch(url, { timeout, method, headers, body });
    if (!resp.ok) {
      const err = new Error(`${context} HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return await resp.json();
  } catch (error) {
    console.error(`[httpClient:${context}]`, {
      url,
      method,
      msg: error.message,
      ms: Date.now() - start
    });
    throw error;
  }
}

async function fetchText(url, options = {}, context = "http") {
  const { timeout, method = "GET", headers, body } = options;
  const start = Date.now();

  try {
    const resp = await fetch(url, { timeout, method, headers, body });
    if (!resp.ok) {
      const err = new Error(`${context} HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return await resp.text();
  } catch (error) {
    console.error(`[httpClient:${context}]`, {
      url,
      method,
      msg: error.message,
      ms: Date.now() - start
    });
    throw error;
  }
}

module.exports = {
  fetchJson,
  fetchText
};

