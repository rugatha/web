// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // For Realtime Database

// Firebase config is provided globally via shared/firebase.config.js.
const firebaseConfig =
  typeof window !== "undefined" ? window.RUGATHA_FIREBASE_CONFIG : null;

if (!firebaseConfig) {
  throw new Error("Missing window.RUGATHA_FIREBASE_CONFIG");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Realtime Database service
export const database = getDatabase(app);
