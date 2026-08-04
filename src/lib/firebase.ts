import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAP2z31ctzFGPQTRKNEKc_Sv-JOG-m0_Vk",
  authDomain: "masar-platform-8e642.firebaseapp.com",
  projectId: "masar-platform-8e642",
  storageBucket: "masar-platform-8e642.firebasestorage.app",
  messagingSenderId: "813912614592",
  appId: "1:813912614592:web:ceec71da4e3a6141eaef25",
  measurementId: "G-JV7WERZER8"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
