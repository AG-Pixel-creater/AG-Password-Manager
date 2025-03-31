/**
 * Authentication module for Password Manager
 * Uses Firebase Authentication
 */

import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  githubProvider,
  signOut
} from './firebase.js';

// Debug helper
console.log("Auth module loaded", auth);

class Auth {
  constructor() {
    // Current user state
    this.currentUser = null;
    console.log("Auth constructor called");
    
    try {
      // Set up auth state listener
      console.log("Setting up auth state listener");
      onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed", user);
        if (user) {
          // User is signed in
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email,
            photoURL: user.photoURL,
            provider: user.providerData[0]?.providerId || 'email'
          };
          console.log("User authenticated, dispatching event");
          // Dispatch event for app to react to login
          document.dispatchEvent(new CustomEvent('user-authenticated', {
            detail: { user: this.currentUser }
          }));
        } else {
          // User is signed out
          console.log("No user found, dispatching signed-out event");
          this.currentUser = null;
          // Dispatch event for app to react to logout
          document.dispatchEvent(new CustomEvent('user-signed-out'));
          
          // Force hide loading screen after 3 seconds if no auth event
          setTimeout(() => {
            const loadingScreen = document.querySelector('.loading-screen');
            if (loadingScreen) {
              console.log("Forcing hide of loading screen");
              loadingScreen.style.opacity = '0';
              setTimeout(() => {
                loadingScreen.remove();
              }, 500);
            }
          }, 3000);
        }
      }, (error) => {
        console.error('Auth state change error:', error);
        alert('Authentication error: ' + error.message);
      });
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      alert('Authentication initialization error: ' + error.message);
    }
  }

  // Register with email/password
  async signup(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error("Error signing up:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sign in with email/password
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error) {
      console.error("Error logging in:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sign in with Google
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sign in with GitHub
  async loginWithGithub() {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sign out the current user
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Error signing out:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if a user is currently logged in
  checkSession() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  // Get the current user's information
  getCurrentUser() {
    return this.currentUser;
  }
}

// Create and export the Auth instance
let authService;
try {
  authService = new Auth();
} catch (error) {
  console.error('Failed to initialize Auth service:', error);
  alert('Authentication service could not be initialized. Please refresh the page.');
  // Create a dummy service to prevent further errors
  authService = {
    currentUser: null,
    signup: () => Promise.resolve({ success: false, error: 'Auth service not available' }),
    login: () => Promise.resolve({ success: false, error: 'Auth service not available' }),
    loginWithGoogle: () => Promise.resolve({ success: false, error: 'Auth service not available' }),
    loginWithGithub: () => Promise.resolve({ success: false, error: 'Auth service not available' }),
    logout: () => Promise.resolve({ success: false, error: 'Auth service not available' }),
    checkSession: () => null,
    getCurrentUser: () => null
  };
}

export default authService;