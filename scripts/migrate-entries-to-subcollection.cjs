/**
 * migrate-entries-to-subcollection.js
 * Script de migração: move entries[] do documento /users/{uid}
 * para a subcoleção /users/{uid}/entries/{id}.
 *
 * SEGURO: lê do array inline e grava na subcoleção.
 * Não apaga o array original (rollback trivial).
 * Pode ser executado em lote ou por uid individual.
 *
 * Uso:
 *   node scripts/migrate-entries-to-subcollection.js            # todos os usuários
 *   node scripts/migrate-entries-to-subcollection.js uid123     # usuário específico
 *   node scripts/migrate-entries-to-subcollection.js --dry-run  # preview sem gravar
 *
 * Pré-requisitos:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json
 *   ou firebase-admin com credenciais de Application Default
 */

const admin = require("firebase-admin");
const path  = require("path");

// ── Init ──────────────────────────────────────────────────────────────────────
try {
  require("dotenv").config({ path: path.join(__dirname, "../functions/.env") });
} catch (_) {}

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const DRY_RUN   = process.argv.includes("--dry-run");
const SINGLE_UID = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);
const BATCH_SIZE = 100;   // usuários por página
const WRITE_BATCH = 450;  // máx docs por writeBatch Firestore

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(...args) { console.log(new Date().toISOString(), ...args); }
function warn(...args) { console.warn(new Date().toISOString(), "[WARN]", ...args); }

/**
 * Migra entries de um único usuário para a subcoleção.
 * @returns {{ migrated: number, skipped: number, alreadyMigrated: number }}
 */
async function migrateUser(uid) {
  const userRef = db.collection("users").doc(uid);
  const snap    = await userRef.get();
  if (!snap.exists) return { migrated: 0, skipped: 0, alreadyMigrated: 0 };

  const data    = snap.data() || {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  if (entries.length === 0) return { migrated: 0, skipped: 0, alreadyMigrated: 0 };

  // Verifica quais já existem na subcoleção
  const subColRef = userRef.collection("entries");
  const existingSnap = await subColRef.select().get(); // só metadados, sem dados
  const existingIds  = new Set(existingSnap.docs.map((d) => d.id));

  const toMigrate = [];
  let skipped = 0;
  let alreadyMigrated = 0;

  for (const entry of entries) {
    if (typeof entry.id !== "number" && typeof entry.id !== "string") {
      skipped++;
      continue;
    }
    const docId = String(entry.id);
    if (existingIds.has(docId)) {
      alreadyMigrated++;
      continue;
    }
    // Limpa campo entryLocation (não deve persistir na subcoleção)
    const clean = { ...entry };
    delete clean.entryLocation;
    toMigrate.push({ docId, data: clean });
  }

  if (toMigrate.length === 0) {
    return { migrated: 0, skipped, alreadyMigrated };
  }

  if (DRY_RUN) {
    log(`[DRY-RUN] ${uid}: would migrate ${toMigrate.length} entries (${alreadyMigrated} already migrated, ${skipped} invalid)`);
    return { migrated: toMigrate.length, skipped, alreadyMigrated };
  }

  // Grava em lotes de WRITE_BATCH
  for (let i = 0; i < toMigrate.length; i += WRITE_BATCH) {
    const chunk = toMigrate.slice(i, i + WRITE_BATCH);
    const batch = db.batch();
    for (const { docId, data: entryData } of chunk) {
      batch.set(subColRef.doc(docId), entryData);
    }
    await batch.commit();
  }

  // Marca no doc principal que a migração foi feita
  await userRef.set(
    {
      entriesMigratedAt: new Date().toISOString(),
      entriesSubcollectionCount: toMigrate.length + alreadyMigrated,
    },
    { merge: true }
  );

  return { migrated: toMigrate.length, skipped, alreadyMigrated };
}

// ── Runner principal ──────────────────────────────────────────────────────────

async function run() {
  log(`Início da migração. DRY_RUN=${DRY_RUN}, SINGLE_UID=${SINGLE_UID || "todos"}`);

  let totalUsers   = 0;
  let totalMigrated = 0;
  let totalSkipped  = 0;
  let totalErrors   = 0;

  if (SINGLE_UID) {
    // Migração de usuário específico
    try {
      const result = await migrateUser(SINGLE_UID);
      totalUsers++;
      totalMigrated += result.migrated;
      totalSkipped  += result.skipped;
      log(`${SINGLE_UID}: migrated=${result.migrated} alreadyMigrated=${result.alreadyMigrated} skipped=${result.skipped}`);
    } catch (e) {
      totalErrors++;
      warn(`Erro em ${SINGLE_UID}:`, e.message);
    }
  } else {
    // Migração em lote (paginada)
    let lastDoc = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = db.collection("users")
        .select("entries", "entriesMigratedAt") // só campos necessários
        .limit(BATCH_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);

      const page = await query.get();
      if (page.empty) break;
      lastDoc = page.docs[page.docs.length - 1];

      for (const doc of page.docs) {
        const data = doc.data();
        // Pula usuários sem entries ou já migrados recentemente
        if (!Array.isArray(data.entries) || data.entries.length === 0) continue;
        if (data.entriesMigratedAt) {
          // Já migrado mas pode ter novas entries inline — força re-check
        }

        totalUsers++;
        try {
          const result = await migrateUser(doc.id);
          totalMigrated += result.migrated;
          totalSkipped  += result.skipped;
          if (result.migrated > 0) {
            log(`${doc.id}: migrated=${result.migrated} skipped=${result.skipped}`);
          }
        } catch (e) {
          totalErrors++;
          warn(`Erro em ${doc.id}:`, e.message);
        }
      }

      if (page.docs.length < BATCH_SIZE) break;
    }
  }

  log("─── Resultado ───────────────────────────────────────────────────────");
  log(`Usuários processados : ${totalUsers}`);
  log(`Entries migradas     : ${totalMigrated}`);
  log(`Entries inválidas    : ${totalSkipped}`);
  log(`Erros                : ${totalErrors}`);
  if (DRY_RUN) log("(DRY-RUN: nenhuma escrita realizada)");
  log("─────────────────────────────────────────────────────────────────────");
}

run().catch((e) => { console.error("Erro fatal:", e); process.exit(1); });
