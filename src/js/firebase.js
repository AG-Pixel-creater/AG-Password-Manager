// Firebase configuration
// Replace with your Firebase project config from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyC8cmVUnA5BH886q8pZaY95qJWtp2Zix-0",
  authDomain: "ag-password-manager.firebaseapp.com",
  projectId: "ag-password-manager",
  storageBucket: "ag-password-manager.appspot.com",
  messagingSenderId: "600996701075",
  appId: "1:600996701075:web:2726a2e9b16fee4e2f3e66",
  measurementId: "G-DGW7L70Z13"
};

console.log("Firebase config:", firebaseConfig);

// Import Firebase modules from npm package
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

console.log("Firebase modules imported");

// Initialize Firebase services
let auth = null;
let db = null;
let googleProvider = null;
let githubProvider = null;

// Initialize Firebase app
try {
  console.log("Initializing Firebase app");
  const app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized:", app);

  // Initialize services
  console.log("Initializing Firebase services");
  auth = getAuth(app);
  console.log("Auth initialized:", auth);
  db = getFirestore(app);
  console.log("Firestore initialized:", db);
  
  // Analytics may not work in all environments, so wrap in try/catch
  try {
    const analytics = getAnalytics(app);
    console.log("Analytics initialized");
  } catch (e) {
    console.log("Analytics failed to initialize", e);
  }

  // Authentication providers
  googleProvider = new GoogleAuthProvider();
  githubProvider = new GithubAuthProvider();
  console.log("Auth providers created");
  
  console.log("Firebase initialization complete");
} catch (error) {
  console.error("Firebase initialization error:", error);
  alert("Firebase could not initialize: " + error.message);
  
  // Create dummy objects if Firebase fails to initialize
  auth = {};
  db = {};
  googleProvider = {};
  githubProvider = {};
}

// Export everything needed by other modules
export { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  googleProvider,
  GithubAuthProvider,
  githubProvider,
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
}; 