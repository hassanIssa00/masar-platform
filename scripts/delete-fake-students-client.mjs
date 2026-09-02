/**
 * Local cleanup script using Firebase Client SDK (browser-compatible)
 * Run with: node scripts/delete-fake-students-client.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk",
  projectId: "masar-platform-8e642",
  appId: "1:813912614592:web:ceec71da4e3a6141eaef25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

const COLS = ['class_students', 'students', 'accounts', 'student_cert_logs', 'student_notes', 'student_hw_logs'];
let total = 0;

for (const col of COLS) {
  console.log(`🔍 Scanning: ${col}`);
  try {
    const snap = await getDocs(collection(db, col));
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const name = (data.fullName || data.name || data.studentName || '').trim();
      if (FAKE_IDS.includes(docSnap.id) || FAKE_NAMES.includes(name)) {
        await deleteDoc(doc(db, col, docSnap.id));
        total++;
        console.log(`  ✅ Deleted ${col}/${docSnap.id} — "${name}"`);
      }
    }
  } catch (e) {
    console.warn(`  ⚠️ ${col}: ${e.message}`);
  }
}

console.log(`\n🎉 Done! Deleted ${total} fake records from Firestore.`);
process.exit(0);
