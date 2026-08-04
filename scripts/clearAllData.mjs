import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAP2z31ctzFGPQTRKNEKc_Sv-JOG-m0_Vk",
  authDomain: "masar-platform-8e642.firebaseapp.com",
  projectId: "masar-platform-8e642",
  storageBucket: "masar-platform-8e642.firebasestorage.app",
  messagingSenderId: "813912614592",
  appId: "1:813912614592:web:ceec71da4e3a6141eaef25",
  measurementId: "G-JV7WERZER8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Clear everything EXCEPT 'accounts' (keeps doctor login working)
const COLLECTIONS = [
  'students',
  'reports',
  'surveys',
  'activities',
  'messages',
  'masar_rooms',
];

async function clearAll() {
  console.log('🧹 Clearing ALL data from Firestore (keeping accounts)...\n');
  let total = 0;
  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) {
        console.log(`✅ '${colName}' already empty`);
        continue;
      }
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        total++;
      }
      console.log(`🗑️  '${colName}': deleted ${snap.size} docs`);
    } catch (err) {
      console.error(`Error clearing ${colName}:`, err);
    }
  }
  console.log(`\n✅ Done. Total deleted: ${total} documents.`);
  process.exit(0);
}

clearAll();
