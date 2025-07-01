require("dotenv").config();
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, getDocs, orderBy, limit, where } = require("firebase/firestore");
const { getAuth } = require("firebase/auth");

// Your web app's Firebase configuration from .env
const firebaseConfig = {
  apiKey: "AIzaSyBf5EI1geqj3-OVyFW_SwsNwNb5uaKzdxw",
  authDomain: "creative-design-ii.firebaseapp.com",
  projectId: "creative-design-ii",
  storageBucket: "creative-design-ii.firebasestorage.app",
  messagingSenderId: "1001371224203",
  appId: "1:1001371224203:web:f9f7ef76ed187f7611ac8e",
  measurementId: "G-LSZJ31Q9YK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { app, db, auth };