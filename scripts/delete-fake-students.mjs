/**
 * Local cleanup script — run with: node scripts/delete-fake-students.mjs
 * Deletes the 7 hardcoded dummy students from ALL Firestore collections.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env vars from .env.vercel.production
const envPath = resolve(process.cwd(), '.env.vercel.production');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=["']?([\s\S]*?)["']?$/);
  if (match) envVars[match[1]] = match[2].replace(/\\n/g, '\n');
}

const serviceAccountRaw = envVars['FIREBASE_SERVICE_ACCOUNT_KEY'];
if (!serviceAccountRaw) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.vercel.production');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountRaw);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const FAKE_IDS = ['std-rabee', 'std-omar', 'std-abdullah', 'std-mohammed', 'std-salman', 'std-faisal', 'std-sara'];
const FAKE_NAMES = [
  'ربيع إسماعيل محمد كامل عيسى',
  'عمر خالد السعيد',
  'عبدالله يوسف المنصور',
  'محمد أحمد الغامدي',
  'سلمان فهد الحربي',
  'فيصل سعد القحطاني',
  'سارة تركي الدوسري',
];

const COLLECTIONS = ['class_students', 'students', 'accounts', 'student_cert_logs', 'student_notes', 'student_hw_logs'];

let totalDeleted = 0;

for (const col of COLLECTIONS) {
  console.log(`\n🔍 Scanning collection: ${col}`);
  try {
    const snap = await db.collection(col).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const name = (data.fullName || data.name || data.studentName || '').trim();
      const id = doc.id;
      const shouldDelete = FAKE_IDS.includes(id) || FAKE_NAMES.includes(name);
      if (shouldDelete) {
        await doc.ref.delete();
        totalDeleted++;
        console.log(`  ✅ Deleted ${col}/${id} — "${name}"`);
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ Could not scan ${col}: ${e.message}`);
  }
}

console.log(`\n🎉 Done! Deleted ${totalDeleted} fake/dummy records from Firestore.`);
console.log('💡 Clear your browser localStorage (Ctrl+Shift+J → Application → Clear Storage) to see changes.');
process.exit(0);
