import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBf5EI1geqj3-OVyFW_SwsNwNb5uaKzdxw",
  authDomain: "creative-design-ii.firebaseapp.com",
  projectId: "creative-design-ii",
  storageBucket: "creative-design-ii.firebasestorage.app",
  messagingSenderId: "1001371224203",
  appId: "1:1001371224203:web:f9f7ef76ed187f7611ac8e",
  measurementId: "G-LSZJ31Q9YK"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const db = getFirestore(app);

export { app, database, db };