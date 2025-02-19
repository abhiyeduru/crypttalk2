document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase Auth
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const profileSetup = document.getElementById('profile-setup');
    const mainContainer = document.getElementById('main-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const searchToggle = document.querySelector('.search-toggle');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchBack = document.querySelector('.search-back');
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');

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
            // Create user document first
            await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).set({
                username: username,
                profileImage: profileImage,
                isOnline: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show main interface
            document.getElementById('profile-setup').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
            document.querySelector('.bottom-nav').classList.remove('hidden');
            
            // Update UI
            document.getElementById('user-profile').src = profileImage;
            
            // Load chats
            loadChats();
            
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error saving profile. Please try again.');
        }
    });

    // Add this function to load chats
    function loadChats() {
        const currentUser = firebase.auth().currentUser;
        const usersList = document.querySelector('.users-list');
        
        // Clear existing list
        usersList.innerHTML = '';
        
        // Get all users except current user
        db.collection('users').get().then((snapshot) => {
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser.uid) {
                    const userData = doc.data();
                    const userElement = createUserElement(doc.id, userData);
                    usersList.appendChild(userElement);
                }
            });
        });
    }

    function createUserElement(userId, userData) {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <img src="${userData.profileImage || 'assets/default-profile.png'}" alt="${userData.username}">
            <div class="user-info">
                <h4>${userData.username}</h4>
                <p class="last-message"></p>
            </div>
        `;
        
        div.addEventListener('click', () => startChat(userId, userData));
        return div;
    }

    function startChat(userId, userData) {
        try {
            // Get DOM elements
            const chatArea = document.querySelector('.chat-area');
            const chatHeader = document.querySelector('.chat-user-info');
            const messageInput = document.querySelector('.message-input-container');
            const messagesContainer = document.querySelector('.messages-container');
            
            // Update chat header
            chatHeader.innerHTML = `
                <img src="${userData.profileImage || 'assets/default-profile.png'}" alt="Profile">
                <span class="chat-username">${userData.username}</span>
            `;
            
            // Show chat area and message input
            chatArea.style.display = 'flex';
            messageInput.style.display = 'flex';
            messagesContainer.innerHTML = '';
            
            // Generate chat ID (always sort IDs to ensure consistency)
            const currentUser = firebase.auth().currentUser;
            const chatId = [currentUser.uid, userId].sort().join('-');
            
            // Create or update chat document
            firebase.firestore().collection('chats').doc(chatId).set({
                participants: [currentUser.uid, userId],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: {
                    [currentUser.uid]: 0,
                    [userId]: 0
                }
            }, { merge: true });
            
            // Reset unread count for current user
            firebase.firestore().collection('chats').doc(chatId).update({
                [`unreadCount.${currentUser.uid}`]: 0
            });
            
            // Load messages and setup input
            const unsubscribe = loadChatMessages(chatId);
            setupMessageInput(chatId, userId);
            
            // Store unsubscribe function
            return () => {
                unsubscribe();
            };
            
            // On mobile, hide sidebar and show chat
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').style.display = 'none';
                chatArea.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Error loading chat. Please try again.');
        }

        // Setup clear chat functionality
        setupClearChat(chatId);
    }

    function loadChatMessages(chatId) {
        try {
            const messagesContainer = document.querySelector('.messages-container');
            const currentUser = firebase.auth().currentUser;
            
            // Clear existing messages
            messagesContainer.innerHTML = '';
            
            // Create a query for messages
            const query = firebase.firestore().collection('chats')
                .doc(chatId)
                .collection('messages')
                .orderBy('timestamp');
            
            // Listen to messages in real-time
            return query.onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const messageElement = createMessageElement(message, currentUser.uid);
                        messagesContainer.appendChild(messageElement);
                        
                        // Mark message as read if it's received
                        if (message.receiverId === currentUser.uid && !message.read) {
                            change.doc.ref.update({ read: true });
                        }
                    }
                });
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        } catch (error) {
            console.error('Error in loadChatMessages:', error);
        }
    }

    async function sendMessage(chatId, receiverId, text) {
        if (!text.trim()) return;
        
        try {
            const currentUser = firebase.auth().currentUser;
            const message = {
                text: text,
                senderId: currentUser.uid,
                receiverId: receiverId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            };
            
            // Add message to chat collection
            await firebase.firestore().collection('chats')
                .doc(chatId)
                .collection('messages')
                .add(message);
            
            // Update last message in chat document
            await firebase.firestore().collection('chats').doc(chatId).update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${receiverId}`]: firebase.firestore.FieldValue.increment(1)
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        }
    }

    // Update setupMessageInput function
    function setupMessageInput(chatId, receiverId) {
        const messageInput = document.querySelector('.message-input-container input');
        const sendButton = document.querySelector('.send-btn');
        
        const newMessageInput = messageInput.cloneNode(true);
        const newSendButton = sendButton.cloneNode(true);
        messageInput.parentNode.replaceChild(newMessageInput, messageInput);
        sendButton.parentNode.replaceChild(newSendButton, sendButton);
        
        newMessageInput.value = '';
        newMessageInput.focus();
        
        const handleSend = () => {
            const text = newMessageInput.value.trim();
            if (text) {
                sendMessage(chatId, receiverId, text);
                newMessageInput.value = '';
                newMessageInput.focus();
            }
        };
        
        newMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSend();
            }
        });
        
        newSendButton.addEventListener('click', handleSend);
    }

    function createMessageElement(message, currentUserId) {
        const div = document.createElement('div');
        div.className = `message ${message.senderId === currentUserId ? 'outgoing' : 'incoming'}`;
        
        const time = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : '';
        
        div.innerHTML = `
            <div class="message-content">
                <p>${message.text}</p>
                <span class="message-time">
                    ${time}
                    ${message.senderId === currentUserId ? 
                        (message.read ? '<i class="fas fa-check-double"></i>' : '<i class="fas fa-check"></i>') 
                        : ''}
                </span>
            </div>
        `;
        return div;
    }

    function updateLastMessage(message) {
        const usersList = document.querySelector('.users-list');
        const userItem = usersList.querySelector(`[data-user-id="${message.senderId === firebase.auth().currentUser.uid ? message.receiverId : message.senderId}"]`);
        
        if (userItem) {
            const lastMessageEl = userItem.querySelector('.last-message');
            if (lastMessageEl) {
                const text = message.text.length > 30 ? message.text.substring(0, 30) + '...' : message.text;
                lastMessageEl.textContent = text;
            }
        }
    }

    // Add CSS styles for messages
    const style = document.createElement('style');
    style.textContent = `
        .message {
            margin: 10px;
            max-width: 70%;
        }
        
        .message-content {
            padding: 10px;
            border-radius: 10px;
            word-wrap: break-word;
        }
        
        .sent {
            margin-left: auto;
        }
        
        .sent .message-content {
            background-color: #dcf8c6;
        }
        
        .received {
            margin-right: auto;
        }
        
        .received .message-content {
            background-color: #fff;
        }
        
        .message-time {
            font-size: 0.75em;
            color: #999;
            float: right;
            margin-top: 5px;
        }
        
        .user-item {
            display: flex;
            align-items: center;
            padding: 10px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .user-item:hover {
            background-color: #f0f0f0;
        }
        
        .user-item img {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .user-info h4 {
            margin: 0;
        }
        
        .last-message {
            color: #666;
            font-size: 0.9em;
            margin: 0;
        }
    `;
    document.head.appendChild(style);

    // Initialize with default profile image
    document.getElementById('profile-preview').src = 'default-profile.png';

    // Add these functions after the existing code inside DOMContentLoaded
    const settingsPage = document.getElementById('settings-page');
    const settingsNav = document.querySelector('[data-tab="settings"]');
    const settingsBack = document.getElementById('settings-back');
    const logoutBtn = document.getElementById('logout-btn');

    // Settings navigation
    settingsNav.addEventListener('click', () => {
        mainContainer.classList.add('hidden');
        settingsPage.classList.remove('hidden');
        loadSettingsPage();
    });

    settingsBack.addEventListener('click', () => {
        settingsPage.classList.add('hidden');
        mainContainer.classList.remove('hidden');
    });

    // Load settings page content
    function loadSettingsPage() {
        const currentUser = firebase.auth().currentUser;
        const settingsProfileImg = document.getElementById('settings-profile-img');
        const settingsUsername = document.getElementById('settings-username');
        const settingsEmail = document.getElementById('settings-email');
        const allUsersList = document.querySelector('.all-users-list');

        // Load current user data
        db.collection('users').doc(currentUser.uid).get().then((doc) => {
            const userData = doc.data();
            settingsProfileImg.src = userData.profileImage || 'assets/default-profile.png';
            settingsUsername.textContent = userData.username;
            settingsEmail.textContent = currentUser.email;
        });

        // Load all users
        allUsersList.innerHTML = '';
        db.collection('users').get().then((snapshot) => {
            snapshot.forEach((doc) => {
                const userData = doc.data();
                const userElement = document.createElement('div');
                userElement.className = 'settings-user-item';
                userElement.innerHTML = `
                    <img src="${userData.profileImage || 'assets/default-profile.png'}" alt="${userData.username}">
                    <div class="settings-user-info">
                        <h4>${userData.username}</h4>
                        <p>${doc.id === currentUser.uid ? '(You)' : ''}</p>
                    </div>
                `;
                allUsersList.appendChild(userElement);
            });
        });

        initializeSettings();
    }

    // Logout functionality
    logoutBtn.addEventListener('click', async () => {
        try {
            // Update online status before logging out
            await updateOnlineStatus(false);
            
            // Sign out from Firebase
            await firebase.auth().signOut();
            
            // Reset UI
            showAuthInterface();
            settingsPage.classList.add('hidden');
            
            // Clear any cached data
            document.querySelector('.users-list').innerHTML = '';
            document.querySelector('.messages-container').innerHTML = '';
            
            // Show success message
            alert('Logged out successfully');
            
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    });

    // Add these styles to the existing style element
    style.textContent += `
        .settings-page {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #fff;
            z-index: 1000;
            padding: 20px;
        }

        .settings-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
        }

        .settings-header i {
            font-size: 24px;
            margin-right: 20px;
            cursor: pointer;
        }

        .current-user-profile {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eee;
        }

        .current-user-profile img {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin-bottom: 10px;
        }

        .settings-section {
            margin: 20px 0;
        }

        .settings-user-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
        }

        .settings-user-item img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 15px;
        }

        .settings-user-info h4 {
            margin: 0;
        }

        .settings-user-info p {
            margin: 0;
            font-size: 0.8em;
            color: #666;
        }

        .logout-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 15px;
            margin-top: 20px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }

        .logout-button i {
            margin-right: 10px;
        }
    `;

    // Add this function to fetch and display users
    function loadUsers() {
        const usersList = document.querySelector('.users-list');
        const currentUser = firebase.auth().currentUser;

        // Clear existing users
        usersList.innerHTML = '';

        // Real-time listener for users collection
        db.collection('users')
            .orderBy('username')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const userData = change.doc.data();
                    const userId = change.doc.id;

                    // Don't show current user in the list
                    if (userId !== currentUser.uid) {
                        if (change.type === 'added') {
                            // Create and add new user element
                            const userElement = createUserElement(userId, userData);
                            usersList.appendChild(userElement);
                        } else if (change.type === 'modified') {
                            // Update existing user element
                            const existingElement = usersList.querySelector(`[data-user-id="${userId}"]`);
                            if (existingElement) {
                                const newElement = createUserElement(userId, userData);
                                existingElement.replaceWith(newElement);
                            }
                        } else if (change.type === 'removed') {
                            // Remove user element
                            const existingElement = usersList.querySelector(`[data-user-id="${userId}"]`);
                            if (existingElement) {
                                existingElement.remove();
                            }
                        }
                    }
                });
            }, (error) => {
                console.error("Error loading users:", error);
            });
    }

    function createUserElement(userId, userData) {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.setAttribute('data-user-id', userId);
        
        div.innerHTML = `
            <img src="${userData.profileImage || 'assets/default-profile.png'}" alt="${userData.username}">
            <div class="user-info">
                <h4>${userData.username || 'Anonymous'}</h4>
                <p class="user-status">${userData.isOnline ? 'Online' : 'Offline'}</p>
                <p class="last-message"></p>
            </div>
        `;
        
        // Add click event to start chat
        div.addEventListener('click', () => {
            startChat(userId, userData);
            // Add active class to selected user
            document.querySelectorAll('.user-item').forEach(item => {
                item.classList.remove('active');
            });
            div.classList.add('active');
        });
        
        return div;
    }

    // Add this to your initialization code
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadUsers(); // Load users after authentication
            updateOnlineStatus(true); // Set user as online
        }
    });

    // Update online status function
    async function updateOnlineStatus(isOnline) {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                await db.collection('users').doc(user.uid).update({
                    isOnline: isOnline,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Error updating online status:', error);
            }
        }
    }

    // Add this to handle user going offline
    window.addEventListener('beforeunload', () => {
        updateOnlineStatus(false);
    });

    // Add this after your existing event listeners
    searchToggle.addEventListener('click', () => {
        searchOverlay.classList.remove('hidden');
        searchInput.focus();
    });

    searchBack.addEventListener('click', () => {
        searchOverlay.classList.add('hidden');
        searchInput.value = '';
        searchResults.innerHTML = '';
    });

    // Add the search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const currentUser = firebase.auth().currentUser;
        
        if (!searchTerm) {
            searchResults.innerHTML = '';
            return;
        }
        
        try {
            const snapshot = await db.collection('users').get();
            searchResults.innerHTML = '';
            
            snapshot.forEach(doc => {
                const userData = doc.data();
                if (doc.id !== currentUser.uid && 
                    userData.username.toLowerCase().includes(searchTerm)) {
                    
                    const resultElement = document.createElement('div');
                    resultElement.className = 'search-result-item';
                    resultElement.innerHTML = `
                        <img src="${userData.profileImage || 'assets/default-profile.png'}" 
                             alt="${userData.username}" 
                             style="width: 40px; height: 40px; border-radius: 50%; margin-right: 15px;">
                        <div class="user-info">
                            <h4>${userData.username}</h4>
                            <p>${userData.isOnline ? 'Online' : 'Offline'}</p>
                        </div>
                    `;
                    
                    resultElement.addEventListener('click', () => {
                        startChat(doc.id, userData);
                        searchOverlay.classList.add('hidden');
                        searchInput.value = '';
                        searchResults.innerHTML = '';
                    });
                    
                    searchResults.appendChild(resultElement);
                }
            });
            
            if (!searchResults.children.length) {
                searchResults.innerHTML = '<p style="text-align: center; padding: 20px;">No users found</p>';
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }, 300));

    // Add this helper function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});

// Add CSS for read receipts
const style = document.createElement('style');
style.textContent += `
    .message-time i {
        font-size: 12px;
        margin-left: 4px;
        color: var(--primary-color);
    }
    
    .message.outgoing .message-time i {
        color: inherit;
    }
`;
document.head.appendChild(style);

// Add these functions after your existing code

// Clear chat functionality
function setupClearChat(chatId) {
    const clearChatBtn = document.querySelector('.clear-chat-btn');
    
    clearChatBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
            try {
                const messagesRef = db.collection('chats').doc(chatId).collection('messages');
                const messages = await messagesRef.get();
                
                // Delete all messages in batches
                const batch = db.batch();
                messages.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                // Clear messages container
                document.querySelector('.messages-container').innerHTML = '';
                
                // Update chat document
                await db.collection('chats').doc(chatId).update({
                    lastMessage: null,
                    lastMessageTime: null
                });
                
            } catch (error) {
                console.error('Error clearing chat:', error);
                alert('Error clearing chat. Please try again.');
            }
        }
    });
}

// Settings functionality
function initializeSettings() {
    const themeSwitch = document.getElementById('theme-switch');
    const notificationsSwitch = document.getElementById('notifications-switch');
    const readReceiptsSwitch = document.getElementById('read-receipts-switch');
    const onlineStatusSwitch = document.getElementById('online-status-switch');
    const editProfileBtn = document.querySelector('.edit-profile-btn');

    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('chatSettings')) || {
        darkMode: false,
        notifications: true,
        readReceipts: true,
        onlineStatus: true
    };

    // Initialize switches
    themeSwitch.checked = settings.darkMode;
    notificationsSwitch.checked = settings.notifications;
    readReceiptsSwitch.checked = settings.readReceipts;
    onlineStatusSwitch.checked = settings.onlineStatus;

    // Theme switch
    themeSwitch.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        document.body.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('light-mode', !isDark);
        settings.darkMode = isDark;
        saveSettings(settings);
    });

    // Notifications switch
    notificationsSwitch.addEventListener('change', (e) => {
        settings.notifications = e.target.checked;
        saveSettings(settings);
        if (e.target.checked) {
            requestNotificationPermission();
        }
    });

    // Read receipts switch
    readReceiptsSwitch.addEventListener('change', (e) => {
        settings.readReceipts = e.target.checked;
        saveSettings(settings);
    });

    // Online status switch
    onlineStatusSwitch.addEventListener('change', async (e) => {
        settings.onlineStatus = e.target.checked;
        saveSettings(settings);
        await updateOnlineStatus(e.target.checked);
    });

    // Edit profile button
    editProfileBtn.addEventListener('click', () => {
        showProfileEditModal();
    });
}

function saveSettings(settings) {
    localStorage.setItem('chatSettings', JSON.stringify(settings));
}

function showProfileEditModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Profile</h3>
            <input type="text" id="edit-username" placeholder="Username">
            <input type="file" id="edit-profile-image" accept="image/*">
            <div class="modal-buttons">
                <button class="cancel-btn">Cancel</button>
                <button class="save-btn">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners and handling for profile updates
    // ... (implement profile update logic)
}

// Update the startChat function
function startChat(userId, userData) {
    // ...existing code...

    // Setup clear chat functionality
    setupClearChat(chatId);

    // ...rest of existing code...
}

// Initialize settings when the settings page is loaded
function loadSettingsPage() {
    // ...existing code...
    initializeSettings();
}

// Add notification permission request
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Please enable notifications for better experience');
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
}
