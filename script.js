// Firebase Configuration
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Cloudinary Configuration
const cloudinaryWidget = cloudinary.createUploadWidget(
    {
        cloudName: 'dp8bfdbab',
        uploadPreset: 'cryptchat',
        maxFileSize: 10000000, // 10MB
        sources: ['local', 'camera'],
    },
    (error, result) => {
        if (!error && result && result.event === "success") {
            handleMediaUploadSuccess(result.info.secure_url);
        }
    }
);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const profileSetup = document.getElementById('profile-setup');
const mainContainer = document.getElementById('main-container');
const bottomNav = document.querySelector('.bottom-nav');
const themeToggle = document.querySelector('.theme-toggle');
const messageInput = document.querySelector('.message-input-container input');
const sendButton = document.querySelector('.send-btn');
const attachmentButton = document.querySelector('.attachment-btn');
const usersList = document.querySelector('.users-list');
const messagesContainer = document.querySelector('.messages-container');

// State Management
let currentUser = null;
let currentChat = null;
let isDarkMode = false;

// Authentication Event Listeners
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        checkProfileSetup();
    } else {showAuthContainer();
    }
});

// Authentication Functions
function showAuthContainer() {
    authContainer.classList.remove('hidden');
    profileSetup.classList.add('hidden');
    mainContainer.classList.add('hidden');
    bottomNav.classList.add('hidden');
}

async function checkProfileSetup() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    
    if (!userDoc.exists || !userDoc.data().username) {
        showProfileSetup();
    } else {
        showMainInterface();
        loadUserData(userDoc.data());
    }
}

function showProfileSetup() {
    authContainer.classList.add('hidden');
    profileSetup.classList.remove('hidden');
    mainContainer.classList.add('hidden');
    bottomNav.classList.add('hidden');
}

function showMainInterface() {
    authContainer.classList.add('hidden');
    profileSetup.classList.add('hidden');
    mainContainer.classList.remove('hidden');
    bottomNav.classList.remove('hidden');
    loadUsers();
    setupMessageListeners();
}

// User Management
async function loadUserData(userData) {
    document.getElementById('user-profile').src = userData.profilePicture || 'placeholder.png';
    // Update other UI elements with user data
}

async function loadUsers() {
    const usersSnapshot = await db.collection('users').get();
    usersList.innerHTML = '';
    
    usersSnapshot.forEach(doc => {
        if (doc.id !== currentUser.uid) {
            const userData = doc.data();
            const userElement = createUserElement(doc.id, userData);
            usersList.appendChild(userElement);
        }
    });
}

function createUserElement(userId, userData) {
    const div = document.createElement('div');
    div.className = 'user-item';
    div.innerHTML = `
        <img src="${userData.profilePicture || 'placeholder.png'}" alt="${userData.username}">
        <div class="user-info">
            <h3>${userData.username}</h3>
            <p>${userData.status || 'Available'}</p>
        </div>
    `;
    
    div.addEventListener('click', () => openChat(userId, userData));
    return div;
}

// Chat Management
async function openChat(userId, userData) {
    currentChat = userId;
    updateChatHeader(userData);
    await loadMessages(userId);
}

function updateChatHeader(userData) {
    const chatHeader = document.querySelector('.chat-user-info');
    chatHeader.querySelector('img').src = userData.profilePicture || 'placeholder.png';
    chatHeader.querySelector('.chat-username').textContent = userData.username;
}

async function loadMessages(userId) {
    const chatId = getChatId(currentUser.uid, userId);
    messagesContainer.innerHTML = '';
    
    // Set up real-time listener for messages
    db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    displayMessage(change.doc.data());
                }
            });
            scrollToBottom();
        });
}

function displayMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.senderId === currentUser.uid ? 'outgoing' : 'incoming'}`;
    
    // Handle different message types
    switch(messageData.type) {
        case 'text':
            messageElement.textContent = messageData.content;
            break;
        case 'image':
            messageElement.innerHTML = `<img src="${messageData.content}" alt="Shared image">`;
            break;
        case 'video':
            messageElement.innerHTML = `<video controls src="${messageData.content}"></video>`;
            break;
        case 'file':
            messageElement.innerHTML = `<a href="${messageData.content}" target="_blank">${messageData.fileName}</a>`;
            break;
    }
    
    messagesContainer.appendChild(messageElement);
}

// Message Sending Functions
async function sendMessage(content, type = 'text', fileName = null) {
    if (!currentChat) return;
    
    const chatId = getChatId(currentUser.uid, currentChat);
    const messageData = {
        senderId: currentUser.uid,
        content: content,
        type: type,
        fileName: fileName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);
}

// Media Upload Handlers
function handleMediaUploadSuccess(url) {
    const fileExtension = url.split('.').pop().toLowerCase();
    const type = fileExtension.match(/^(jpg|jpeg|png|gif)$/) ? 'image' : 
                fileExtension.match(/^(mp4|webm|ogg)$/) ? 'video' : 'file';
    
    sendMessage(url, type, 'Shared ' + type);
}

// Utility Functions
function getChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event Listeners
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

attachmentButton.addEventListener('click', () => {
    cloudinaryWidget.open();
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
});

// Theme Management
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    isDarkMode = true;
}

// Authentication Form Handlers
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements[0].value;
    const password = e.target.elements[1].value;
    const confirmPassword = e.target.elements[2].value;
    
    if (password !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
    }
});

// Profile Setup Handler
document.getElementById('complete-profile').addEventListener('click', async () => {
    const username = document.getElementById('username-input').value.trim();
    const profileImg = document.getElementById('profile-preview').src;
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).set({
            username: username,
            profilePicture: profileImg,
            email: currentUser.email
        });
        showMainInterface();
    } catch (error) {
        alert(error.message);
    }
});