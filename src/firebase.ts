import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Mesmo config do app atual (public/app/app.js) – Firestore default, sem segundo banco
const firebaseConfig = {
  apiKey: 'AIzaSyAFuVpVJQb51MYqXyKD9w9ETwI-FHKv2k8',
  authDomain: 'virtus-financeiro-cd7bd.firebaseapp.com',
  projectId: 'virtus-financeiro-cd7bd',
  storageBucket: 'virtus-financeiro-cd7bd.firebasestorage.app',
  messagingSenderId: '508459921027',
  appId: '1:508459921027:web:fb54b7f94795bdb88735b6',
  measurementId: 'G-M03SM9BFWX',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;
