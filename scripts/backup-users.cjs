/**
 * _backup-users.cjs — dump completo de users (+ subcoleções) e Auth para JSON.
 * Uso: NODE_PATH=...\functions\node_modules node scripts/_backup-users.cjs
 * Credencial: ADC ou GOOGLE_APPLICATION_CREDENTIALS.
 * Saída: arquivo JSON FORA do repo (contém PII) — caminho impresso ao final.
 */
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp();
const db = admin.firestore();

async function dumpDoc(ref) {
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const subcols = await ref.listCollections();
  const subcollections = {};
  for (const col of subcols) {
    const docs = await col.get();
    subcollections[col.id] = {};
    for (const d of docs.docs) {
      subcollections[col.id][d.id] = await dumpDoc(d.ref);
    }
  }
  return { data, subcollections };
}

(async () => {
  const out = { exportedAt: new Date().toISOString(), users: {}, auth: [] };
  const users = await db.collection('users').get();
  let entryTotal = 0;
  for (const u of users.docs) {
    out.users[u.id] = await dumpDoc(u.ref);
    const e = (out.users[u.id].data || {}).entries;
    entryTotal += Array.isArray(e) ? e.length : 0;
  }
  const au = await admin.auth().listUsers(1000);
  out.auth = au.users.map((u) => ({
    uid: u.uid, email: u.email, displayName: u.displayName,
    disabled: u.disabled, creationTime: u.metadata.creationTime,
    providerData: u.providerData,
  }));
  const file = 'C:\\Users\\jscha\\sibanki-users-backup-' + Date.now() + '.json';
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log('BACKUP_FILE=' + file);
  console.log('users_docs=' + Object.keys(out.users).length + ' auth_users=' + out.auth.length + ' entries_inline_total=' + entryTotal);
  process.exit(0);
})().catch((e) => { console.error('ERR:' + e.message); process.exit(1); });
