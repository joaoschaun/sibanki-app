/**
 * Pluggy — criação de Connect Token para o widget (Open Finance).
 * Credenciais: PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET no .env (dev) ou env vars do Firebase (prod)
 */
const { PluggyClient } = require('pluggy-sdk');
const functions = require('firebase-functions');

function getPluggyCredentials() {
  const clientId = String(process.env.PLUGGY_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PLUGGY_CLIENT_SECRET || '').trim();
  return { clientId, clientSecret };
}

/**
 * @param {string} clientUserId — Firebase uid (rastreio ponta a ponta no Pluggy)
 * @returns {Promise<{ accessToken: string }>}
 */
async function createConnectToken(clientUserId) {
  const { clientId, clientSecret } = getPluggyCredentials();
  if (!clientId || !clientSecret) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Integração Open Finance (Pluggy) não configurada no servidor. Use o app web em /app ou configure PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET.',
    );
  }
  const client = new PluggyClient({ clientId, clientSecret });
  const { accessToken } = await client.createConnectToken(undefined, {
    clientUserId,
  });
  return { accessToken };
}

function getPluggyClientOrThrow() {
  const { clientId, clientSecret } = getPluggyCredentials();
  if (!clientId || !clientSecret) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Pluggy não configurado no servidor.',
    );
  }
  return new PluggyClient({ clientId, clientSecret });
}

module.exports = {
  createConnectToken,
  getPluggyCredentials,
  getPluggyClientOrThrow,
};
