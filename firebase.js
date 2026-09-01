// Firebase initialization for the Scorecard App.
//
// Fill in your Firebase project's config values in a `.env` file at the repo
// root (copy `.env.example` to `.env` and paste in the values from your
// Firebase project settings). See README.md for step-by-step setup.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// We use silent anonymous auth (no login screen for users) purely so
// Firestore security rules can require `request.auth != null`, which keeps
// the database from being wide open to anyone who finds the public API
// key. Nobody ever sees a sign-in prompt.
let readyResolve;
export const authReady = new Promise((resolve) => {
  readyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    readyResolve(user);
  } else {
    signInAnonymously(auth).catch((err) => {
      console.error("Anonymous sign-in failed:", err);
    });
  }
});
