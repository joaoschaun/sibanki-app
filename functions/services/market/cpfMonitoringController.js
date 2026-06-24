const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

/**
 * Consulta real de CPF e Score na BigDataCorp
 * Requer BIGDATACORP_TOKEN no ambiente (firebase functions:secrets:set)
 */
exports.syncCpfMonitoring = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário.");
  }

  const db = admin.firestore();
  const uid = context.auth.uid;

  // 1. Busca CPF no cadastro do usuário no Firestore
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
  }

  const userData = userSnap.data() || {};
  const cpfRaw = userData.cadastroCompleto?.cpf || "";
  const cpf = String(cpfRaw).replace(/\D/g, "");

  if (cpf.length !== 11) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "CPF não configurado ou inválido no perfil. Por favor, conclua seu cadastro em Perfil."
    );
  }

  const token = String(process.env.BIGDATACORP_TOKEN || "").trim();
  const isDev = process.env.FUNCTIONS_EMULATOR === "true" || process.env.NODE_ENV === "development";

  // 2. Se o token não está configurado
  if (!token) {
    if (isDev) {
      // No ambiente de testes/dev local, gera dados determinísticos reais baseados no CPF para não travar a homologação
      console.warn("[syncCpfMonitoring] BIGDATACORP_TOKEN ausente. Gerando dados determinísticos de teste (Modo Sandbox).");
      
      const cpfSum = cpf.split("").reduce((acc, char) => acc + Number(char), 0);
      const mockScore = 300 + (cpfSum * 12) % 650; // Entre 300 e 950
      
      const generatedSnapshot = {
        version: 1,
        updatedAt: new Date().toISOString(),
        score: mockScore,
        scoreBand: mockScore < 400 ? "muito-baixo" : mockScore < 600 ? "regular" : mockScore < 750 ? "bom" : "excelente",
        scoreSource: "boa-vista",
        negativacoesCount: cpfSum % 4 === 0 ? 1 : 0,
        negativacoesTotal: cpfSum % 4 === 0 ? 320.50 : 0,
        consultasRecentes: (cpfSum % 5) + 1,
        protecaoAtiva: userData.cpfMonitoring?.protecaoAtiva ?? false,
        negativacoes: cpfSum % 4 === 0 ? [
          {
            id: `neg-test-${cpf.slice(-4)}`,
            credor: "Banco Bradesco S.A.",
            valor: 320.50,
            vencimento: "2026-02-15",
            status: "ativa",
            origem: "SCPC Boa Vista"
          }
        ] : [],
        consultas: [
          { id: "c1", empresa: "Banco Itaú Unibanco S.A.", data: "2026-05-10", motivo: "Análise de crédito" },
          { id: "c2", empresa: "Claro S.A.", data: "2026-04-20", motivo: "Aquisição de serviços" }
        ],
        alertas: [
          {
            id: `alert-score-${cpf.slice(-4)}`,
            tipo: "score-alta",
            descricao: "Seu score subiu 15 pontos recentemente!",
            detectedAt: new Date().toISOString(),
            lido: false
          }
        ]
      };

      await db.collection("users").doc(uid).set(
        { cpfMonitoring: generatedSnapshot },
        { merge: true }
      );

      return { ok: true, message: "Modo Sandbox (Token de Produção Ausente)", data: generatedSnapshot };
    } else {
      // Em produção, se o token estiver ausente, rejeita (fail-closed)
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Serviço de monitoramento indisponível: BIGDATACORP_TOKEN não configurado no servidor."
      );
    }
  }

  // 3. Chamada real à API da BigDataCorp
  try {
    const response = await fetch("https://api.bigdatacorp.com.br/pessoas/credito", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AccessToken": token
      },
      body: JSON.stringify({
        q: `doc{${cpf}}`,
        datasets: ["credit_score", "credit_queries", "credit_restrictions"]
      }),
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`BigDataCorp HTTP Error: ${response.status}`);
    }

    const json = await response.json();
    
    // Normalização das informações retornadas pelo bureau
    const scoreVal = json?.credit_score?.score ?? 550;
    const band = scoreVal < 400 ? "muito-baixo" : scoreVal < 600 ? "regular" : scoreVal < 750 ? "bom" : "excelente";
    
    const rawNegativacoes = json?.credit_restrictions?.restrictions || [];
    const negativacoes = rawNegativacoes.map((n, i) => ({
      id: n.id || `neg-${i}-${Date.now()}`,
      credor: n.creditor || "Credor não especificado",
      valor: Number(n.amount) || 0,
      vencimento: n.due_date || new Date().toISOString().slice(0, 10),
      status: "ativa",
      origem: n.source || "Bureau de Crédito"
    }));

    const rawConsultas = json?.credit_queries?.queries || [];
    const consultas = rawConsultas.map((c, i) => ({
      id: c.id || `con-${i}-${Date.now()}`,
      empresa: c.inquirer || "Empresa de Serviços",
      data: c.query_date || new Date().toISOString().slice(0, 10),
      motivo: c.reason || "Análise de crédito"
    }));

    const negativacoesCount = negativacoes.length;
    const negativacoesTotal = negativacoes.reduce((sum, n) => sum + n.valor, 0);

    const alertas = [];
    if (negativacoesCount > 0) {
      alertas.push({
        id: `alert-neg-${Date.now()}`,
        tipo: "negativacao",
        descricao: `Aviso: Seu CPF possui ${negativacoesCount} pendência(s) ativa(s).`,
        detectedAt: new Date().toISOString(),
        lido: false
      });
    }

    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      score: scoreVal,
      scoreBand: band,
      scoreSource: "serasa",
      negativacoesCount,
      negativacoesTotal,
      consultasRecentes: consultas.length,
      protecaoAtiva: userData.cpfMonitoring?.protecaoAtiva ?? false,
      negativacoes,
      consultas,
      alertas
    };

    // Salva no Firestore
    await db.collection("users").doc(uid).set(
      { cpfMonitoring: payload },
      { merge: true }
    );

    return { ok: true, message: "Sucesso", data: payload };

  } catch (error) {
    console.error("[syncCpfMonitoring] Erro na consulta real:", error.message);
    throw new functions.https.HttpsError(
      "internal",
      `Erro ao consultar bureau de crédito: ${error.message}`
    );
  }
});
