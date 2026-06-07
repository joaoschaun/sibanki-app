const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

exports.valoresAReceberApi = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }
  const cpf = String(data?.cpf || "").replace(/\D/g, "");
  if (cpf.length !== 11) {
    throw new functions.https.HttpsError("invalid-argument", "CPF inválido.");
  }

  const db = admin.firestore();

  // Cascata de endpoints BCB — a URL exata varia por versão da API
  const BCB_ENDPOINTS = [
    `https://valoresareceber.bcb.gov.br/publico/api/v1/cpf/${cpf}`,
    `https://valoresareceber.bcb.gov.br/publico/api/v1/cliente/${cpf}`,
  ];

  for (const url of BCB_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "Sibanki/1.0" },
        timeout: 12_000,
      });
      if (!res.ok) continue;
      const json = await res.json();

      // Normaliza resposta — BCB mudou o formato ao longo das versões
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json?.resultado)
        ? json.resultado
        : Array.isArray(json?.data)
        ? json.data
        : [];

      const available = items.filter(
        (i) => i?.valorDisponivel !== false && i?.habilitado !== false
      );
      const institutions = [
        ...new Set(
          available
            .map((i) => i?.nomeInstituicao || i?.nome || i?.instituicao || "")
            .filter(Boolean)
        ),
      ];

      // Salva snapshot em Firestore para o Consultor IA usar depois
      if (available.length > 0) {
        try {
          await db.collection("users").doc(context.auth.uid).set(
            {
              valoresAReceber: {
                hasValues: true,
                institutions,
                total: available.length,
                checkedAt: new Date().toISOString(),
                claimUrl: "https://valoresareceber.bcb.gov.br",
              },
            },
            { merge: true }
          );
        } catch (_) { /* não bloqueia resposta */ }
      }

      return {
        hasValues: available.length > 0,
        count: available.length,
        institutions,
        claimUrl: "https://valoresareceber.bcb.gov.br",
        source: "bcb",
      };
    } catch (e) {
      console.warn("[valoresAReceberApi] endpoint falhou:", url, e.message);
    }
  }

  // API BCB indisponível — retorna null para o front tratar
  return { hasValues: null, error: "API do Banco Central indisponível agora.", institutions: [] };
});
