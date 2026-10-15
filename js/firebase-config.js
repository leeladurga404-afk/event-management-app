// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwn5adk_D0a0o3rQugkDvWmQrwfKvXdRI",
  authDomain: "event-management-app-5faa8.firebaseapp.com",
  projectId: "event-management-app-5faa8",
  storageBucket: "event-management-app-5faa8.firebasestorage.app",
  messagingSenderId: "743938259444",
  appId: "1:743938259444:web:588662356cc2ab171fe1a1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };