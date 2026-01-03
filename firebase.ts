
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCC3wbQp5713OqHlf1jLZabA0VClDstfKY",
  authDomain: "fuad-editing-zone.firebaseapp.com",
  databaseURL: "https://fuad-editing-zone-default-rtdb.firebaseio.com/",
  projectId: "fuad-editing-zone",
  storageBucket: "fuad-editing-zone.appspot.com",
  messagingSenderId: "832389657221",
  appId: "1:1032345523456:web:123456789",
};

// Singleton pattern: only initialize if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
