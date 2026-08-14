import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error('Missing Firebase environment variables. Refusing to run destructive clear script.');
}

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
