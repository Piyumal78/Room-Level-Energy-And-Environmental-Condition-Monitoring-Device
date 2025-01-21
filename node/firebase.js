require("dotenv").config();
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let db;
try {
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase: ", error);
}

module.exports = { db };
