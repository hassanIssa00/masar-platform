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

const collectionsToClear = ['students', 'reports', 'surveys', 'activities', 'messages', 'masar_rooms'];

async function clearAll() {
  console.log('🧹 Clearing mock data from Firestore...');
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Deleting ${snap.size} documents from '${colName}'...`);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      console.log(`✅ Cleared '${colName}'`);
    } catch (err) {
      console.error(`Error clearing ${colName}:`, err);
    }
  }
  console.log('🎉 All mock data cleared successfully!');
  process.exit(0);
}

clearAll();
