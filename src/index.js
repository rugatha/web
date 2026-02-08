// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // For Realtime Database

// Firebase config is provided globally via shared/firebase.config.js.
const firebaseConfig =
  typeof window !== "undefined" ? window.RUGATHA_FIREBASE_CONFIG : null;
const firebaseDisabled =
  typeof window !== "undefined" &&
  window.RUGATHA_FEATURE_FLAGS &&
  window.RUGATHA_FEATURE_FLAGS.firebaseEnabled === false;

let database = null;

if (firebaseDisabled || !firebaseConfig) {
  console.warn("Firebase disabled or missing config.");
} else {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Get a reference to the Realtime Database service
  database = getDatabase(app);
}

export { database };
