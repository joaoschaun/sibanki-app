/**
 * Evita estourar ~1 MB do documento users/{uid}: arquiva lançamentos Pluggy mais antigos
 * em users/{uid}/entriesOverflow/{pg_<transactionId>}.
 */
const MAX_ENTRIES_IN_USER_DOC = 2800;
const BATCH_SIZE = 450;

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Carrega IDs Pluggy já arquivados (para deduplicar na sync).
 * @param {FirebaseFirestore.DocumentReference} userRef
 * @returns {Promise<Set<string>>}
 */
async function loadOverflowPluggyIds(userRef) {
  const ids = new Set();
  const col = userRef.collection('entriesOverflow');
  const snap = await col.get();
  snap.forEach((d) => {
    const x = d.data();
    if (x && x.pluggyTransactionId) ids.add(String(x.pluggyTransactionId));
  });
  return ids;
}

/**
 * Se entries passar do limite, move os lançamentos Pluggy mais antigos para subcoleção.
 * @returns {{ entries: any[], archived: number }}
 */
async function trimPluggyEntriesToLimit(userRef, entries) {
  if (!Array.isArray(entries) || entries.length <= MAX_ENTRIES_IN_USER_DOC) {
    return { entries, archived: 0 };
  }

  const manual = entries.filter((e) => !e.pluggyTransactionId);
  const pluggy = entries.filter((e) => e.pluggyTransactionId);
  pluggy.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  const overBy = entries.length - MAX_ENTRIES_IN_USER_DOC;
  const toArchive = pluggy.slice(0, overBy);
  const keepPluggy = pluggy.slice(overBy);
  const final = [...manual, ...keepPluggy];

  let archived = 0;
  const db = userRef.firestore;
  for (let i = 0; i < toArchive.length; i += BATCH_SIZE) {
    const chunk = toArchive.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    const col = userRef.collection('entriesOverflow');
    for (const e of chunk) {
      const tid = String(e.pluggyTransactionId);
      const dref = col.doc(`pg_${tid}`);
      batch.set(dref, {
        ...e,
        archivedAt: new Date().toISOString(),
        entryLocation: 'overflow',
      });
      archived += 1;
    }
    await batch.commit();
  }

  return { entries: final, archived };
}

module.exports = {
  MAX_ENTRIES_IN_USER_DOC,
  loadOverflowPluggyIds,
  trimPluggyEntriesToLimit,
};
