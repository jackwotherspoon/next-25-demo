// src/firebase.ts
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Load Firebase config from environment variables (prefixed with VITE_)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    // measurementId is optional
    // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that config values are present (optional but recommended)
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.error("Firebase configuration environment variables are missing!");
    // You might want to throw an error or handle this more gracefully
}


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app); // Get the Auth instance for the initialized app
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Failed to initialize Firebase:", error);
    // Handle initialization error appropriately - maybe show an error message to the user
    // Provide dummy objects or re-throw to prevent the app from running incorrectly
    throw new Error("Firebase initialization failed");
}


export { auth, app }; // Export auth instance and optionally the app instance