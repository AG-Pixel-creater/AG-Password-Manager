/**
 * Password Manager class
 * Handles storing and retrieving passwords using Firebase Firestore
 */

import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from './firebase.js';

class PasswordManager {
  constructor(userId) {
    if (!userId) {
      throw new Error('User ID is required for PasswordManager');
    }
    console.log('PasswordManager initialized for user:', userId);
    this.userId = userId;
    this.passwords = [];
    this.initialized = false;
    
    // The path to the user's passwords collection
    this.passwordsCollectionPath = `users/${this.userId}/passwords`;
  }

  // Initialize by loading passwords from Firestore
  async init() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing password manager for user:', this.userId);
      
      // First check permissions
      const hasPermissions = await this.checkFirestorePermissions();
      if (!hasPermissions) {
        throw new Error('Firebase permissions check failed. Please verify your Firestore security rules.');
      }
      
      await this.loadPasswords();
      this.initialized = true;
      console.log('Password manager initialized successfully');
    } catch (error) {
      console.error('Error initializing password manager:', error);
      throw error;
    }
  }

  // Load passwords from Firestore
  async loadPasswords() {
    try {
      console.log('Loading passwords from path:', this.passwordsCollectionPath);
      // Use the passwordsCollectionPath instead of building the path here
      const passwordsQuery = query(collection(db, this.passwordsCollectionPath));
      
      const querySnapshot = await getDocs(passwordsQuery);
      this.passwords = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        this.passwords.push({
          id: doc.id,
          website: data.website,
          username: data.username,
          password: data.password,
          createdAt: data.createdAt
        });
      });
      
      console.log(`Loaded ${this.passwords.length} passwords`);
      return this.passwords;
    } catch (error) {
      console.error('Error loading passwords:', error);
      console.error('Error details:', JSON.stringify(error));
      throw error;
    }
  }

  // Add a new password
  async addPassword(website, username, password) {
    try {
      console.log('Adding password for website:', website);
      // Create password object
      const passwordData = {
        website,
        username,
        password,
        createdAt: new Date().toISOString()
      };
      
      // Add to Firestore using the passwordsCollectionPath
      const passwordsRef = collection(db, this.passwordsCollectionPath);
      const newPasswordDoc = doc(passwordsRef);
      
      console.log('Adding password to document:', newPasswordDoc.id);
      await setDoc(newPasswordDoc, passwordData);
      
      // Add to local array with ID
      const newPassword = {
        ...passwordData,
        id: newPasswordDoc.id
      };
      
      this.passwords.push(newPassword);
      console.log('Password added successfully');
      return newPassword;
    } catch (error) {
      console.error('Error adding password:', error);
      console.error('Error details:', JSON.stringify(error));
      throw error;
    }
  }

  // Get all passwords for the user
  async getPasswords() {
    if (!this.initialized) {
      await this.init();
    }
        return this.passwords;
  }

  // Delete a password by ID
  async deletePassword(passwordId) {
    try {
      console.log('Deleting password with ID:', passwordId);
      // Delete from Firestore using the passwordsCollectionPath
      const passwordRef = doc(db, this.passwordsCollectionPath, passwordId);
      await deleteDoc(passwordRef);
      
      // Remove from local array
      this.passwords = this.passwords.filter(p => p.id !== passwordId);
      
      console.log('Password deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting password:', error);
      console.error('Error details:', JSON.stringify(error));
      throw error;
    }
  }

  // Export passwords as JSON string
  exportPasswords() {
    const data = {
      userId: this.userId,
      passwords: this.passwords,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data);
  }
  
  // Import passwords from JSON string
  async importPasswords(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Basic validation
      if (!data.passwords || !Array.isArray(data.passwords)) {
        throw new Error("Invalid password data format");
      }
      
      // Get existing password websites+usernames for duplicate checking
      const existingCredentials = new Set(
        this.passwords.map(p => `${p.website}:${p.username}`)
      );
      
      // Filter out duplicates
      const newPasswords = data.passwords.filter(p => 
        !existingCredentials.has(`${p.website}:${p.username}`)
      );
      
      if (newPasswords.length === 0) {
        return { 
          success: true, 
          imported: 0,
          message: "No new passwords to import" 
        };
      }
      
      console.log(`Importing ${newPasswords.length} passwords`);
      
      // Add each new password to Firestore
      const passwordsRef = collection(db, this.passwordsCollectionPath);
      let importCount = 0;
      
      for (const password of newPasswords) {
        const passwordData = {
          website: password.website,
          username: password.username,
          password: password.password,
          createdAt: new Date().toISOString(),
          imported: true
        };
        
        const newPasswordDoc = doc(passwordsRef);
        await setDoc(newPasswordDoc, passwordData);
        
        this.passwords.push({
          ...passwordData,
          id: newPasswordDoc.id
        });
        
        importCount++;
      }
      
      console.log(`Successfully imported ${importCount} passwords`);
      return { 
        success: true, 
        imported: importCount,
        message: `Successfully imported ${importCount} passwords` 
      };
    } catch (error) {
      console.error('Error importing passwords:', error);
      console.error('Error details:', JSON.stringify(error));
      return { 
        success: false, 
        imported: 0,
        message: `Import failed: ${error.message}` 
      };
    }
  }

  // Helper to handle Firestore permission errors
  async checkFirestorePermissions() {
    try {
      console.log('Checking Firestore permissions for user', this.userId);
      // Try creating a temporary document to check permissions
      const testDoc = doc(db, `users/${this.userId}/test`, 'permission-test');
      await setDoc(testDoc, { timestamp: new Date().toISOString() });
      
      // If we get here, we have write permissions
      await deleteDoc(testDoc);
      console.log('Firestore permissions verified successfully');
      return true;
    } catch (error) {
      console.error('Firestore permissions check failed:', error);
      // Check if it's a permissions error
      if (error.code === 'permission-denied' || error.message.includes('permission')) {
        console.error('This is a permissions error. Please check your Firestore rules.');
        // Show the error in the UI if available
        const errorContainer = document.getElementById('errorContainer');
        const firestoreInstructions = document.getElementById('firestoreInstructions');
        
        if (errorContainer && firestoreInstructions) {
          errorContainer.classList.remove('hidden');
          firestoreInstructions.classList.remove('hidden');
          document.getElementById('errorMessage').textContent = 'Firebase Permissions Error: ' + error.message;
        }
      }
      return false;
    }
  }
}

export default PasswordManager;