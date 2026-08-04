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
