// Import Firebase services
import authService from './auth.js';
import PasswordManager from './passwordManager.js';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';

console.log("App.js loaded, authService:", authService);

// Wrap everything in an immediately invoked function to catch any errors
(async function() {
    try {
        document.addEventListener('DOMContentLoaded', async () => {
            // Debug info
            console.log("DOM content loaded");
            
    let currentUser = null;
    let passwordManager = null;

            // Show loading screen on page load
            showLoadingScreen();
            
            // Add a timeout to hide loading screen if authentication doesn't happen
            const loadingTimeout = setTimeout(() => {
                console.log("Loading timeout reached, hiding loading screen");
                hideLoadingScreen();
            document.getElementById('loginForm').classList.remove('hidden');
            }, 5000);
            
            // Listen for authentication state changes
            document.addEventListener('user-authenticated', async (event) => {
                try {
                    console.log("User authenticated event received", event.detail);
                    clearTimeout(loadingTimeout); // Clear the timeout
                    
                    currentUser = event.detail.user;
                    console.log('User authenticated:', currentUser);

                    // First check if Firestore is accessible
                    const firestoreReady = await initializeFirestore(currentUser.uid);
                    if (!firestoreReady) {
                        console.error('Firestore is not accessible');
                        hideLoadingScreen();
                        return;
                    }

                    // Initialize password manager with the user's ID
                    passwordManager = new PasswordManager(currentUser.uid);
                    await passwordManager.init();
                    
                    // Show the password manager interface and load passwords
                    showPasswordManager();
                    await displayPasswords();
                    hideLoadingScreen();
                } catch (error) {
                    console.error('Error in authentication handler:', error);
                    hideLoadingScreen();
                    
                    // Display the error to the user
                    document.getElementById('errorContainer').classList.remove('hidden');
                    document.getElementById('errorMessage').textContent = error.message;
                    document.getElementById('errorDetails').textContent = error.stack || JSON.stringify(error, null, 2);
                    
                    alert('An error occurred: ' + error.message);
                }
            });

            document.addEventListener('user-signed-out', () => {
                console.log("User signed out event received");
                clearTimeout(loadingTimeout); // Clear the timeout
                
        currentUser = null;
        passwordManager = null;
        
        // Safely access DOM elements with null checks
        const passwordManagerElement = document.getElementById('passwordManager');
        const loginFormElement = document.getElementById('loginForm');
        const signupFormElement = document.getElementById('signupForm');
        const logoutBtnElement = document.getElementById('logoutBtn');
        const userDisplayElement = document.getElementById('userDisplay');
        
        if (passwordManagerElement) passwordManagerElement.classList.add('hidden');
        if (loginFormElement) loginFormElement.classList.remove('hidden');
        if (signupFormElement) signupFormElement.classList.add('hidden');
        if (logoutBtnElement) logoutBtnElement.classList.add('hidden');
        
        // Clear the user display
        if (userDisplayElement) {
            userDisplayElement.textContent = '';
        }
            });

            // Handle login form submission
    const loginForm = document.getElementById('login');
            loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
                const email = e.target[0].value;
        const password = e.target[1].value;

                try {
                    const result = await authService.login(email, password);
                    if (!result.success) {
                        alert(result.error || 'Invalid credentials');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    alert('Login failed: ' + error.message);
                }
            });

            // Handle signup form submission
    const signupForm = document.getElementById('signup');
            signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
                const email = e.target[0].value;
        const password = e.target[1].value;

                try {
                    const result = await authService.signup(email, password);
                    if (result.success) {
                        showNotification('Account created successfully');
        } else {
                        alert(result.error || 'Signup failed');
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    alert('Signup failed: ' + error.message);
                }
            });

            // Handle navigation between login and signup forms
            document.getElementById('showSignup').addEventListener('click', () => {
                document.getElementById('loginForm').classList.add('hidden');
                document.getElementById('signupForm').classList.remove('hidden');
            });

            document.getElementById('showLogin').addEventListener('click', () => {
                document.getElementById('signupForm').classList.add('hidden');
                document.getElementById('loginForm').classList.remove('hidden');
            });

            // Handle OAuth logins
            const googleLoginBtn = document.getElementById('googleLogin');
            googleLoginBtn.addEventListener('click', async () => {
                try {
                    await authService.loginWithGoogle();
                    // Authentication state change will be handled by the listener
                } catch (error) {
                    console.error('Google login error:', error);
                    alert('Google login failed: ' + error.message);
                }
            });

            const githubLoginBtn = document.getElementById('githubLogin');
            githubLoginBtn.addEventListener('click', async () => {
                try {
                    await authService.loginWithGithub();
                    // Authentication state change will be handled by the listener
                } catch (error) {
                    console.error('GitHub login error:', error);
                    alert('GitHub login failed: ' + error.message);
                }
            });

            // Handle Google signup (same as Google login)
            const googleSignupBtn = document.getElementById('googleSignup');
            if (googleSignupBtn) {
                googleSignupBtn.addEventListener('click', async () => {
                    try {
                        await authService.loginWithGoogle();
                        // Authentication state change will be handled by the listener
                    } catch (error) {
                        console.error('Google signup error:', error);
                        alert('Google signup failed: ' + error.message);
                    }
                });
            }

            // Handle GitHub signup (same as GitHub login)
            const githubSignupBtn = document.getElementById('githubSignup');
            if (githubSignupBtn) {
                githubSignupBtn.addEventListener('click', async () => {
                    try {
                        await authService.loginWithGithub();
                        // Authentication state change will be handled by the listener
                    } catch (error) {
                        console.error('GitHub signup error:', error);
                        alert('GitHub signup failed: ' + error.message);
                    }
                });
            }

            // Handle password form submission
    const passwordForm = document.getElementById('passwordForm');
            passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const website = document.getElementById('website').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

                try {
                    await passwordManager.addPassword(website, username, password);
                    passwordForm.reset();
                    await displayPasswords();
                    showNotification('Password saved successfully');
        } catch (error) {
                    console.error('Error saving password:', error);
                    alert('Failed to save password: ' + error.message);
                }
            });

            // Handle logout
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                try {
                    await authService.logout();
                    showNotification('Logged out successfully');
        } catch (error) {
                    console.error('Logout error:', error);
                    alert('Logout failed: ' + error.message);
                }
            });

            // Add loading screen for initial authentication check
            function showLoadingScreen() {
                const loadingScreen = document.createElement('div');
                loadingScreen.className = 'loading-screen';
                
                loadingScreen.innerHTML = `
                    <div class="particles-container">
                        <div class="particle" style="--x-offset: 30px; --opacity: 0.4;"></div>
                        <div class="particle" style="--x-offset: -40px; --opacity: 0.3;"></div>
                        <div class="particle" style="--x-offset: 10px; --opacity: 0.25;"></div>
                        <div class="particle" style="--x-offset: -20px; --opacity: 0.35;"></div>
                        <div class="particle" style="--x-offset: 50px; --opacity: 0.3;"></div>
                        <div class="particle" style="--x-offset: -10px; --opacity: 0.2;"></div>
                    </div>
                    
                    <div class="loader-container">
                        <div class="loader-app-name">AG Password Manager</div>
                        <div class="ag-logo-loader">
                            <div class="ag-logo-container">
                                <div class="ag-letters-wrapper">
                                    <div class="ag-letter ag-letter-a">A</div>
                                    <div class="ag-letter ag-letter-g">G</div>
                                </div>
                                <div class="ag-logo-outline"></div>
                                <div class="ag-triangle ag-triangle-top"></div>
                                <div class="ag-triangle ag-triangle-bottom"></div>
                            </div>
                        </div>
                        <div class="loader"></div>
                        <div class="loader-percentage">0%</div>
                        <div class="loader-text">Initializing...</div>
            </div>
                `;
                
                document.body.appendChild(loadingScreen);
                
                simulateLoading();
            }

            function simulateLoading() {
                let progress = 0;
                const percentageElement = document.querySelector('.loader-percentage');
                const textElement = document.querySelector('.loader-text');
                
                const loadingMessages = [
                    "Initializing...",
                    "Loading resources...",
                    "Connecting to Firebase...",
                    "Checking authentication...",
                    "Loading user data...",
                    "Almost there..."
                ];
                
                const loadingInterval = setInterval(() => {
                    progress += Math.floor(Math.random() * 5) + 1;
                    
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(loadingInterval);
                        
                        // Note: We don't hide the loading screen here anymore
                        // It will be hidden after authentication is checked
                        textElement.textContent = "Waiting for authentication...";
                    }
                    
                    const messageIndex = Math.min(
                        Math.floor(progress / (100 / loadingMessages.length)),
                        loadingMessages.length - 1
                    );
                    
                    percentageElement.textContent = `${progress}%`;
                    if (progress < 100) {
                        textElement.textContent = loadingMessages[messageIndex];
                    }
                }, 200);
            }

            function hideLoadingScreen() {
                console.log("Hiding loading screen");
                const loadingScreen = document.querySelector('.loading-screen');
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.remove();
                    }, 500);
                }
            }

            // Display the password manager UI
    function showPasswordManager() {
                try {
                    // Hide login and signup forms
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.add('hidden');
                    
                    // Show password manager and logout button
                    const passwordManagerElement = document.getElementById('passwordManager');
                    if (passwordManagerElement) {
                        passwordManagerElement.classList.remove('hidden');
                        
                        // Convert to responsive layout if not already done
                        if (!document.querySelector('.password-manager-container')) {
                            // Create responsive container
                            const containerDiv = document.createElement('div');
                            containerDiv.className = 'password-manager-container';

                            // Create the form container
                            const formContainer = document.createElement('div');
                            formContainer.className = 'password-form-container';

                            // Move the existing form to the form container
                            const passwordForm = document.getElementById('passwordForm');
                            if (passwordForm && passwordForm.parentNode) {
                                passwordForm.parentNode.insertBefore(containerDiv, passwordForm);
                                formContainer.appendChild(passwordForm);
                                containerDiv.appendChild(formContainer);
                            }

                            // Create the list container
                            const listContainer = document.createElement('div');
                            listContainer.className = 'password-list-container';
                            
                            // Get the heading for passwords
                            const listHeading = document.querySelector('#passwordManager > h2:nth-of-type(2)');
                            const passwordsList = document.getElementById('passwordsList');
                            
                            // Move the heading and passwords list to the list container
                            if (listHeading && passwordsList) {
                                listContainer.appendChild(listHeading);
                                listContainer.appendChild(passwordsList);
                                containerDiv.appendChild(listContainer);
                            }
                        }
                    }
                    
                    // Show logout button and user display
                    const logoutBtn = document.getElementById('logoutBtn');
                    if (logoutBtn) {
                        logoutBtn.classList.remove('hidden');
                    }
                    
                    // Display user information
                    if (currentUser) {
                        const userDisplay = document.getElementById('userDisplay');
                        if (userDisplay) {
                            userDisplay.textContent = currentUser.email;
                            userDisplay.classList.remove('hidden');
                        } else {
                            // Create user display if it doesn't exist
                            const userDisplayEl = document.createElement('div');
                            userDisplayEl.id = 'userDisplay';
                            userDisplayEl.className = 'user-display';
                            userDisplayEl.textContent = currentUser.email;
                            document.body.appendChild(userDisplayEl);
                        }
                    }
                } catch (error) {
                    console.error('Error showing password manager:', error);
                }
            }

            // Display passwords in the UI
            async function displayPasswords() {
                const passwordsList = document.getElementById('passwordsList');
                if (!passwordsList) {
                    console.error('passwordsList element not found');
                    return;
                }

                try {
                    // Ensure the password manager is initialized
                    if (!passwordManager) {
                        console.error('Password manager not initialized');
                        return;
                    }

                    // Get all passwords
                    const passwords = await passwordManager.getPasswords();
                    passwordsList.innerHTML = '';

                    // Add search functionality if not already added
                    if (!document.getElementById('searchPasswords')) {
                        const searchBar = document.createElement('input');
                        searchBar.type = 'text';
                        searchBar.id = 'searchPasswords';
                        searchBar.className = 'search-bar';
                        searchBar.placeholder = 'Search passwords...';
                        searchBar.addEventListener('input', filterPasswords);
                        passwordsList.parentNode.insertBefore(searchBar, passwordsList);
                    }

                    // Display empty state if no passwords
                    if (passwords.length === 0) {
                        const emptyState = document.createElement('div');
                        emptyState.className = 'empty-state';
                        emptyState.textContent = 'No passwords saved yet. Add your first password using the form.';
                        passwordsList.appendChild(emptyState);
                        return;
                    }

                    // Create responsive password cards
                    passwords.forEach(entry => {
                        const passwordCard = document.createElement('div');
                        passwordCard.className = 'password-card';
                        passwordCard.dataset.website = entry.website.toLowerCase();
                        passwordCard.dataset.username = entry.username.toLowerCase();

                        // Create a structured layout for the password details
                        const passwordDetails = document.createElement('div');
                        passwordDetails.className = 'password-details';

                        // Website with icon
                        const websiteElement = document.createElement('div');
                        websiteElement.className = 'password-item-website';
                        websiteElement.innerHTML = `<strong>Website:</strong> <span>${escapeHtml(entry.website)}</span>`;
                        passwordDetails.appendChild(websiteElement);

                        // Username with icon
                        const usernameElement = document.createElement('div');
                        usernameElement.className = 'password-item-username';
                        usernameElement.innerHTML = `<strong>Username:</strong> <span>${escapeHtml(entry.username)}</span>`;
                        passwordDetails.appendChild(usernameElement);

                        // Password with toggle visibility
                        const passwordElement = document.createElement('div');
                        passwordElement.className = 'password-item-password';
                        
                        const passwordValue = document.createElement('span');
                        passwordValue.className = 'password-value';
                        passwordValue.textContent = '••••••••';
                        passwordValue.dataset.value = entry.password;
                        
                        passwordElement.innerHTML = `<strong>Password:</strong> `;
                        passwordElement.appendChild(passwordValue);
                        
                        passwordDetails.appendChild(passwordElement);

                        passwordCard.appendChild(passwordDetails);

                        // Action buttons in a flex container
                        const actionContainer = document.createElement('div');
                        actionContainer.className = 'password-item-actions';

                        // Toggle password visibility
                        const toggleBtn = document.createElement('button');
                        toggleBtn.className = 'toggle-password-btn';
                        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show';
                        toggleBtn.addEventListener('click', function() {
                            const passwordSpan = passwordValue;
                            if (passwordSpan.textContent === '••••••••') {
                                passwordSpan.textContent = passwordSpan.dataset.value;
                                toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
                            } else {
                                passwordSpan.textContent = '••••••••';
                                toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show';
                            }
                        });

                        // Copy password button
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-btn';
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        copyBtn.addEventListener('click', function() {
                            navigator.clipboard.writeText(passwordValue.dataset.value)
                                .then(() => {
                                    showNotification('Password copied to clipboard', 'info');
                                    // Change button text temporarily
                                    const originalText = copyBtn.innerHTML;
                                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                                    setTimeout(() => {
                                        copyBtn.innerHTML = originalText;
                                    }, 2000);
                                })
                                .catch(err => {
                                    console.error('Could not copy password: ', err);
                                    showNotification('Failed to copy password', 'error');
                                });
                        });

                        // Delete button
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-btn';
                        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
                        deleteBtn.addEventListener('click', async function() {
                            if (confirm(`Are you sure you want to delete the password for ${entry.website}?`)) {
                                try {
                                    await passwordManager.deletePassword(entry.id);
                                    await displayPasswords();
                                    showNotification('Password deleted successfully');
                                } catch (error) {
                                    console.error('Error deleting password:', error);
                                    showNotification('Failed to delete password', 'error');
                                }
                            }
                        });

                        actionContainer.appendChild(toggleBtn);
                        actionContainer.appendChild(copyBtn);
                        actionContainer.appendChild(deleteBtn);
                        passwordCard.appendChild(actionContainer);

                        passwordsList.appendChild(passwordCard);
                    });
                } catch (error) {
                    console.error('Error displaying passwords:', error);
                    passwordsList.innerHTML = `<div class="error-message">Error loading passwords: ${error.message}</div>`;
                }

                // Add export/import buttons
                addExportImportButtons();
            }

            // Function to filter passwords based on search
            function filterPasswords() {
                const searchTerm = document.getElementById('searchPasswords').value.toLowerCase();
                const passwordCards = document.querySelectorAll('.password-card');
                let hasVisibleCards = false;

                passwordCards.forEach(card => {
                    const website = card.dataset.website;
                    const username = card.dataset.username;
                    
                    if (website.includes(searchTerm) || username.includes(searchTerm)) {
                        card.style.display = 'block';
                        hasVisibleCards = true;
                    } else {
                        card.style.display = 'none';
                    }
                });

                // Show a message if no passwords match the search
                const noResultsMessage = document.getElementById('noResultsMessage');
                if (!hasVisibleCards) {
                    if (!noResultsMessage) {
                        const message = document.createElement('div');
                        message.id = 'noResultsMessage';
                        message.className = 'empty-state';
                        message.textContent = 'No passwords match your search.';
                        document.getElementById('passwordsList').appendChild(message);
                    }
                } else if (noResultsMessage) {
                    noResultsMessage.remove();
                }
            }

            // Helper function to escape HTML to prevent XSS
            function escapeHtml(unsafe) {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function addExportImportButtons() {
                try {
                    console.log('Adding export/import buttons');
                    
                    // Only proceed if the passwordManager container exists
                    const container = document.getElementById('passwordManager');
                    if (!container) {
                        console.error('Password manager container not found');
                        return;
                    }
                    
                    // Check if buttons already exist to avoid duplicates
                    if (document.getElementById('exportBtn')) {
                        console.log('Export/import buttons already exist');
                        return;
                    }
                    
                    // Create export button
                    const exportBtn = document.createElement('button');
                    exportBtn.id = 'exportBtn';
                    exportBtn.className = 'action-btn export-btn';
                    exportBtn.innerHTML = '<i class="fas">📤</i> Export Passwords';
                    exportBtn.title = 'Export passwords as JSON file';
                    
                    // Create import button
                    const importBtn = document.createElement('button');
                    importBtn.id = 'importBtn';
                    importBtn.className = 'action-btn import-btn';
                    importBtn.innerHTML = '<i class="fas">📥</i> Import Passwords';
                    importBtn.title = 'Import passwords from JSON file';
                    
                    // Create input for file import (hidden)
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.id = 'fileInput';
                    fileInput.accept = '.json';
                    fileInput.style.display = 'none';
                    
                    // Create a container for the buttons
                    const btnContainer = document.createElement('div');
                    btnContainer.className = 'import-export-container';
                    btnContainer.appendChild(exportBtn);
                    btnContainer.appendChild(importBtn);
                    btnContainer.appendChild(fileInput);
                    
                    // Find the appropriate place to insert the buttons
                    const dashboardHeader = container.querySelector('h2');
                    if (dashboardHeader && dashboardHeader.nextSibling) {
                        // Insert after the header
                        dashboardHeader.parentNode.insertBefore(btnContainer, dashboardHeader.nextSibling);
                    } else {
                        // Fallback - just append to the container
                        container.appendChild(btnContainer);
                    }
                    
                    // Add event listeners
                    exportBtn.addEventListener('click', handleExport);
                    importBtn.addEventListener('click', () => fileInput.click());
                    fileInput.addEventListener('change', handleImport);
                    
                    console.log('Export/import buttons added successfully');
                } catch (error) {
                    console.error('Error adding export/import buttons:', error);
                }
            }

            function handleExport() {
                console.log("Export function called");
                
                if (!passwordManager) {
                    console.error("passwordManager is null or undefined");
                    showNotification('Error: No active password manager');
                    return;
                }
                
                const passwords = passwordManager.getPasswords();
                console.log("Passwords:", passwords);
                
                if (!passwords || passwords.length === 0) {
                    showNotification('No passwords to export');
                    return;
                }
                
                try {
                    const exportData = passwordManager.exportPasswords();
                    console.log("Export data:", exportData);
                    
                    // Create temporary textarea to copy data
                    const textarea = document.createElement('textarea');
                    textarea.value = exportData;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    // Create download option
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `passwords_${currentUser.uid}_${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    showNotification('Passwords exported and copied to clipboard');
                } catch (error) {
                    console.error("Export error:", error);
                    showNotification('Export failed: ' + error.message);
                }
            }

            function handleImport(event) {
                console.log("Import function called");
                
                const file = event.target.files[0];
                if (!file) {
                    console.error("No file selected");
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const importData = e.target.result;
                    console.log("Import data length:", importData.length);
                    
                    try {
                        const result = await passwordManager.importPasswords(importData);
                        console.log("Import result:", result);
                        
                        if (result.success) {
                            await displayPasswords();
                            showNotification(result.message);
                        } else {
                            alert(result.message);
                        }
                    } catch (error) {
                        console.error("Import error:", error);
                        alert('Import failed: ' + error.message);
                    }
                };
                
                reader.readAsText(file);
            }

            function showNotification(message, type = 'success') {
                // Check if notification container exists, if not create it
                let notificationContainer = document.querySelector('.notification-container');
                
                if (!notificationContainer) {
                    notificationContainer = document.createElement('div');
                    notificationContainer.className = 'notification-container';
                    document.body.appendChild(notificationContainer);
                }
                
                // Create notification element
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.innerHTML = `
                    <div class="notification-message">${message}</div>
                    <button class="notification-close">×</button>
                `;
                
                // Add to container
                notificationContainer.appendChild(notification);
                
                // Add close button functionality
                const closeBtn = notification.querySelector('.notification-close');
                closeBtn.addEventListener('click', () => {
                    notification.classList.add('notification-hide');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                });
                
                // Auto dismiss after 3 seconds
                setTimeout(() => {
                    notification.classList.add('notification-hide');
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, 3000);
            }

            // Theme handling
            const storedTheme = localStorage.getItem('theme') || 'dark';
            document.body.setAttribute('data-theme', storedTheme);

            // Settings modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
            
            settingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('hidden');
                updateActiveTheme(document.body.getAttribute('data-theme'));
            });

            document.getElementById('closeSettings').addEventListener('click', () => {
                settingsModal.classList.add('hidden');
            });

            function updateActiveTheme(theme) {
    const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            if (btn.getAttribute('data-theme') === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

            // Theme selection
            const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateActiveTheme(theme);
            showNotification(`Theme changed to ${theme}`);
        });
    });

            // Add search functionality
            const searchInput = document.getElementById('passwordSearch');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const searchTerm = searchInput.value.toLowerCase();
                    const passwordItems = document.querySelectorAll('.password-item');
                    
                    passwordItems.forEach(item => {
                        const website = item.querySelector('h4').textContent.toLowerCase();
                        const username = item.querySelector('.username .field-value').textContent.toLowerCase();
                        
                        if (website.includes(searchTerm) || username.includes(searchTerm)) {
                            item.style.display = 'block';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                    
                    // Show empty state if no results
                    const visibleItems = Array.from(passwordItems).filter(item => item.style.display !== 'none');
                    const emptyState = document.querySelector('.empty-search-results');
                    
                    if (visibleItems.length === 0 && searchTerm !== '') {
                        if (!emptyState) {
                            const noResults = document.createElement('div');
                            noResults.className = 'empty-state empty-search-results';
                            noResults.textContent = `No passwords match "${searchTerm}"`;
                            document.getElementById('passwordsList').appendChild(noResults);
                        }
                    } else if (emptyState) {
                        emptyState.remove();
                    }
                });
            }

            // Initialize event listeners after DOM is fully loaded
            setupEventListeners();

            function setupEventListeners() {
                try {
                    // Handle login form submission
                    const loginForm = document.getElementById('login');
                    if (loginForm) {
                        loginForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const email = e.target[0].value;
                            const password = e.target[1].value;

                            try {
                                const result = await authService.login(email, password);
                                if (!result.success) {
                                    alert(result.error || 'Invalid credentials');
                                }
                            } catch (error) {
                                console.error('Login error:', error);
                                alert('Login failed: ' + error.message);
                            }
                        });
                    }

                    // Other event listeners...
                    // ... existing code ...
                } catch (error) {
                    console.error('Error setting up event listeners:', error);
                    alert('Error initializing application: ' + error.message);
                }
            }

            // Check if Firestore is accessible and create initial structure if needed
            async function initializeFirestore(userId) {
                try {
                    console.log('Initializing Firestore for user:', userId);
                    
                    // Try to create an empty document to ensure permissions are working
                    const testDoc = doc(db, `users/${userId}/test`, 'test-doc');
                    await setDoc(testDoc, { 
                        timestamp: new Date().toISOString(),
                        test: true
                    });
                    console.log('Successfully wrote to Firestore');
                    
                    // Clean up test document
                    await deleteDoc(testDoc);
                    
                    return true;
                } catch (error) {
                    console.error('Firestore initialization error:', error);
                    
                    // Check for permission errors
                    if (error.message.includes('permission') || error.code === 'permission-denied') {
                        // Show Firestore instructions
                        document.getElementById('firestoreInstructions').classList.remove('hidden');
                        document.getElementById('errorContainer').classList.remove('hidden');
                        document.getElementById('errorMessage').textContent = 'Firebase Permissions Error: ' + error.message;
                        document.getElementById('errorDetails').textContent = JSON.stringify(error, null, 2);
                    }
                    
                    return false;
                }
            }
        });
    } catch (error) {
        console.error('Application initialization error:', error);
        alert('Failed to initialize application. Please check your console for details.');
    }
})().catch(err => {
    console.error('Fatal application error:', err);
    alert('A critical error occurred. Please refresh the page and try again.');
});