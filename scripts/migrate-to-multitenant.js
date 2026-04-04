#!/usr/bin/env node
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const BATCH_LIMIT = 400;
const SUBCOLLECTIONS = ["transactions", "accounts", "categories", "goals", "investments"];
const TENANT_ID = "sibanki_master";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

function log(message) {
  process.stdout.write(`${message}\n`);
}

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

async function ensureMasterTenant(dryRun) {
  const ref = db.collection("tenants").doc(TENANT_ID);
  const snap = await ref.get();
  if (snap.exists) return { created: false };
  if (dryRun) return { created: true, dryRun: true };
  await ref.set({
    name: "Sibanki Master",
    slug: "sibanki-master",
    plan: "enterprise",
    userLimit: null,
    domains: ["sibanki.com.br", "app.sibanki.com.br", "localhost"],
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { created: true };
}

async function copySubcollection(uid, name, dryRun, report) {
  const fromRef = db.collection("users").doc(uid).collection(name);
  const toRef = db.collection("tenants").doc(TENANT_ID).collection("users").doc(uid).collection(name);
  const snap = await fromRef.get();
  if (snap.empty) return 0;

  let moved = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const chunk = snap.docs.slice(i, i + BATCH_LIMIT);
    if (!dryRun) {
      const batch = db.batch();
      chunk.forEach((doc) => {
        batch.set(toRef.doc(doc.id), {
          ...doc.data(),
          migratedFrom: "legacy",
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }
    moved += chunk.length;
  }
  report.subcollections[name] = moved;
  return moved;
}

async function updateUserClaims(uid, dryRun) {
  if (dryRun) return { updated: false, dryRun: true };
  const user = await auth.getUser(uid);
  const customClaims = { ...(user.customClaims || {}), tenantId: TENANT_ID };
  if (!customClaims.role) customClaims.role = "user";
  await auth.setCustomUserClaims(uid, customClaims);
  return { updated: true };
}

async function migrateUsers(dryRun) {
  const usersSnap = await db.collection("users").get();
  const report = {
    dryRun,
    startedAt: new Date().toISOString(),
    tenantId: TENANT_ID,
    usersFound: usersSnap.size,
    usersMigrated: 0,
    usersSkipped: 0,
    users: [],
    errors: [],
  };

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const targetRef = db.collection("tenants").doc(TENANT_ID).collection("users").doc(uid);
    const targetSnap = await targetRef.get();

    if (targetSnap.exists && targetSnap.data()?.migratedFrom === "legacy") {
      report.usersSkipped += 1;
      report.users.push({ uid, skipped: true, reason: "already-migrated" });
      continue;
    }

    const item = { uid, subcollections: {} };
    try {
      const data = doc.data() || {};
      if (!dryRun) {
        await targetRef.set({
          ...data,
          tenantId: TENANT_ID,
          ownerId: uid,
          migratedFrom: "legacy",
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      for (const name of SUBCOLLECTIONS) {
        await copySubcollection(uid, name, dryRun, item);
      }

      item.claims = await updateUserClaims(uid, dryRun);
      report.usersMigrated += 1;
      report.users.push(item);
    } catch (error) {
      report.errors.push({ uid, error: error.message });
      report.users.push({ uid, failed: true, error: error.message });
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

async function main() {
  const dryRun = !execute;
  log(`Modo: ${dryRun ? "DRY-RUN" : "EXECUTE"}`);
  const tenant = await ensureMasterTenant(dryRun);
  log(`Tenant master: ${tenant.created ? "criado" : "já existia"}${tenant.dryRun ? " (simulado)" : ""}`);
  const report = await migrateUsers(dryRun);

  const fileName = `multitenant-migration-report-${Date.now()}.json`;
  const outPath = path.join(process.cwd(), "scripts", fileName);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  log(`Relatório salvo em: ${outPath}`);
  log(`Usuários encontrados: ${report.usersFound}`);
  log(`Migrados: ${report.usersMigrated}`);
  log(`Pulados: ${report.usersSkipped}`);
  log(`Erros: ${report.errors.length}`);
}

main().catch((error) => {
  process.stderr.write(`Falha na migração: ${error.message}\n`);
  process.exit(1);
});
