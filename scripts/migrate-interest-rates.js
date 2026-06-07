import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");
const dotenv = require("../functions/node_modules/dotenv");

// Carrega .env do functions se existir
try {
  dotenv.config({ path: path.join(__dirname, "../functions/.env") });
} catch (_) {}

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const DRY_RUN = process.argv.includes("--dry-run");
const execute = process.argv.includes("--execute");

// O padrão do AGENTS.md e das regras do repositório é que a migração de dados roda em dry-run
// e precisa de um parâmetro explícito para executar de verdade (ex: --execute).
const isRealRun = execute && !DRY_RUN;

const SINGLE_UID = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function warn(...args) {
  console.warn(new Date().toISOString(), "[WARN]", ...args);
}

async function migrateUserDoc(docRef) {
  const snap = await docRef.get();
  if (!snap.exists) return { updated: 0, skipped: 0 };

  const data = snap.data() || {};
  const creditObligations = Array.isArray(data.creditObligations) ? data.creditObligations : [];
  if (creditObligations.length === 0) return { updated: 0, skipped: 0 };

  let updatedCount = 0;
  let skippedCount = 0;
  const newObligations = [];

  for (const ob of creditObligations) {
    if (!ob || typeof ob !== "object") {
      newObligations.push(ob);
      skippedCount++;
      continue;
    }

    // Se já possui a taxa canônica como número válido, mantém
    if (typeof ob.interestRatePct === "number" && Number.isFinite(ob.interestRatePct)) {
      newObligations.push(ob);
      continue;
    }

    let resolvedPct = null;

    // 1. Fallback para interestPct
    if (typeof ob.interestPct === "number" && Number.isFinite(ob.interestPct)) {
      resolvedPct = ob.interestPct;
    }
    // 2. Fallback para interestRate (aplicando o heurístico original)
    else if (typeof ob.interestRate === "number" && Number.isFinite(ob.interestRate)) {
      const raw = ob.interestRate;
      // Heurístico original:
      const monthlyRateDecimal = raw > 1 ? raw / 100 : raw > 0.3 ? raw / 12 : raw;
      resolvedPct = monthlyRateDecimal * 100;
    }
    // 3. Fallback para taxaMensal (decimal)
    else if (typeof ob.taxaMensal === "number" && Number.isFinite(ob.taxaMensal)) {
      resolvedPct = ob.taxaMensal * 100;
    }

    if (resolvedPct !== null) {
      const updatedOb = {
        ...ob,
        interestRatePct: Number(resolvedPct.toFixed(4)), // arredonda para 4 casas decimais para limpeza
      };
      newObligations.push(updatedOb);
      updatedCount++;
    } else {
      newObligations.push(ob);
    }
  }

  if (updatedCount === 0) {
    return { updated: 0, skipped: skippedCount };
  }

  if (!isRealRun) {
    log(`[DRY-RUN] Path: ${docRef.path} - would update ${updatedCount} obligations (skipped ${skippedCount} invalid)`);
    return { updated: updatedCount, skipped: skippedCount };
  }

  // Atualiza no Firestore
  await docRef.update({
    creditObligations: newObligations,
    updated: new Date().toISOString()
  });

  log(`[UPDATED] Path: ${docRef.path} - updated ${updatedCount} obligations (skipped ${skippedCount} invalid)`);
  return { updated: updatedCount, skipped: skippedCount };
}

async function run() {
  log(`Início da migração de taxas de juros (SOV-2). MODO: ${isRealRun ? "EXECUÇÃO REAL" : "DRY-RUN"}`);
  if (SINGLE_UID) {
    log(`Buscando apenas o usuário específico: ${SINGLE_UID}`);
    // Testa no path root users/{uid}
    const rootUserRef = db.collection("users").doc(SINGLE_UID);
    let migrated = 0;
    let skipped = 0;
    try {
      const res = await migrateUserDoc(rootUserRef);
      migrated += res.updated;
      skipped += res.skipped;
    } catch (e) {
      warn(`Erro ao processar root user ${SINGLE_UID}:`, e.message);
    }

    // E tenta no path de tenants (usando collectionGroup)
    try {
      const tenantUsersSnap = await db.collectionGroup("users").get();
      for (const doc of tenantUsersSnap.docs) {
        if (doc.id === SINGLE_UID && doc.ref.path !== rootUserRef.path) {
          const res = await migrateUserDoc(doc.ref);
          migrated += res.updated;
          skipped += res.skipped;
        }
      }
    } catch (e) {
      warn(`Erro ao processar tenant users para ${SINGLE_UID}:`, e.message);
    }

    log(`Fim. Processado ${SINGLE_UID}. Atualizados: ${migrated}, Inválidos/Ignorados: ${skipped}`);
    return;
  }

  // Busca geral usando collectionGroup
  log("Buscando todos os documentos na coleção 'users' (inclui root e multi-tenant)...");
  const usersSnap = await db.collectionGroup("users").get();
  log(`Total de documentos 'users' encontrados: ${usersSnap.size}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const doc of usersSnap.docs) {
    totalProcessed++;
    try {
      const res = await migrateUserDoc(doc.ref);
      totalUpdated += res.updated;
      totalSkipped += res.skipped;
    } catch (e) {
      totalErrors++;
      warn(`Erro ao migrar doc ${doc.ref.path}:`, e.message);
    }
  }

  log("─── Resumo da Migração ──────────────────────────────────────────────");
  log(`Documentos analisados: ${totalProcessed}`);
  log(`Dívidas atualizadas  : ${totalUpdated}`);
  log(`Dívidas ignoradas    : ${totalSkipped}`);
  log(`Erros encontrados    : ${totalErrors}`);
  if (!isRealRun) {
    log("Aviso: MODO DRY-RUN. Nenhuma alteração foi gravada no banco de dados.");
    log("Para gravar as alterações de verdade, execute com o parâmetro: --execute");
  }
  log("─────────────────────────────────────────────────────────────────────");
}

run().catch((e) => {
  console.error("Erro fatal na migração:", e);
  process.exit(1);
});
