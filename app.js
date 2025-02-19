document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase Auth
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const profileSetup = document.getElementById('profile-setup');
    const mainContainer = document.getElementById('main-container');
    const bottomNav = document.querySelector('.bottom-nav');

    // Auth tabs functionality
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.dataset.tab;
            
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.add('hidden'));
            
            tab.classList.add('active');
            document.getElementById(`${targetForm}-form`).classList.remove('hidden');
        });
    });

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
    });

    // Auth form handlers
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';

    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        setTimeout(() => {
            errorDisplay.style.display = 'none';
        }, 3000);
    }

    loginForm.appendChild(errorDisplay.cloneNode(true));
    signupForm.appendChild(errorDisplay.cloneNode(true));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user profile exists
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Show profile setup if new user
                showProfileSetup();
            } else {
                // Show main interface if profile exists
                showMainInterface();
                loadUserData(userDoc.data());
            }
        } catch (error) {
            showError(error.message);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelector('input[type="password"]').value;
        const confirmPassword = signupForm.querySelector('input[placeholder="Confirm Password"]').value;

        if (password !== confirmPassword) {
            showError("Passwords don't match!");
            return;
        }

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Show profile setup for new users
            showProfileSetup();
        } catch (error) {
            showError(error.message);
        }
    });

    // Auth State Observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userData = await loadUserData(user.uid);
            if (userData && userData.username) {
                showMainInterface(userData);
            } else {
                showProfileSetup();
            }
        } else {
            showAuthInterface();
        }
    });

    // Load User Data
    async function loadUserData(userId) {
        try {
            const doc = await db.collection('users').doc(userId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error loading user data:', error);
            return null;
        }
    }

    // Show/Hide Interface Functions
    function showAuthInterface() {
        authContainer.classList.remove('hidden');
        mainContainer.classList.add('hidden');
        profileSetup.classList.add('hidden');
    }

    function showProfileSetup() {
        authContainer.classList.add('hidden');
        mainContainer.classList.add('hidden');
        profileSetup.classList.remove('hidden');
    }

    function showMainInterface(userData) {
        authContainer.classList.add('hidden');
        profileSetup.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        
        // Update UI with user data
        document.getElementById('user-profile').src = userData.profileImage || 'assets/default-profile.png';
    }

    // Profile setup
    document.getElementById('complete-profile').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username-input').value;
        const profileImage = document.getElementById('profile-preview').src;
        
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }
        
        try {
            // Save the user profile data to your database here
            await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                username: username,
                profileImage: profileImage
            });
            
            // Hide profile setup and show main container
            document.getElementById('profile-setup').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
            document.querySelector('.bottom-nav').classList.remove('hidden');
            
            // Update the sidebar profile picture
            document.getElementById('user-profile').src = profileImage;
            
            // Load initial chat data
            loadChats();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error saving profile. Please try again.');
        }
    });

    // Add this function to load chats
    function loadChats() {
        // Implement your chat loading logic here
        // This function should populate the users-list
        const usersList = document.querySelector('.users-list');
        // Add your code to fetch and display users/chats
    }

    // Initialize with default profile image
    document.getElementById('profile-preview').src = 'default-profile.png';
});
