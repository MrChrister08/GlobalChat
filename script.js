const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let username = '';
let userEmail = '';

// AUTH MODAL LOGIC
const authModal = document.getElementById('auth-modal');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginUsername = document.getElementById('login-username');
const signupUsername = document.getElementById('signup-username');
const signupEmailError = document.getElementById('signup-email-error');
const usernameStatus = document.getElementById('username-status');

// Initialize Firebase Auth
const auth = firebase.auth();

// User avatar cache for faster loading
const avatarCache = new Map();
// Message cache for instant loading
const MESSAGE_CACHE_KEY = 'globalChat_messages';
const MESSAGE_CACHE_TIMESTAMP_KEY = 'globalChat_messages_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Security and rate limiting
const RATE_LIMIT_DURATION = 2000; // 2 seconds between messages
let lastMessageTime = 0;

// Load messages immediately - as early as possible
// loadMessages();

// PROFILE MENU LOGIC
const profileMenuBtn = document.getElementById('profile-menu-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');

// Add references for verification message and button
const verifyEmailMessage = document.getElementById('verify-email-message');
const resendVerificationBtn = document.getElementById('resend-verification-btn');

// Input validation and sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

function validateUsername(username) {
  if (typeof username !== 'string') return false;
  const clean = username.trim();
  return clean.length >= 3 && clean.length <= 30 && /^[a-zA-Z0-9_]+$/.test(clean);
}

function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email.trim());
}

function checkRateLimit() {
  const now = Date.now();
  if (now - lastMessageTime < RATE_LIMIT_DURATION) {
    return false;
  }
  lastMessageTime = now;
  return true;
}

function getCachedMessages() {
  try {
    const cached = localStorage.getItem(MESSAGE_CACHE_KEY);
    const timestamp = localStorage.getItem(MESSAGE_CACHE_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  return null;
}

function setCachedMessages(messages) {
  try {
    localStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(messages));
    localStorage.setItem(MESSAGE_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.log('Cache write error:', error);
  }
}

function updateProfileMenu(name, email) {
  if (profileUsername) {
    profileUsername.textContent = name || 'Username';
    profileEmail.textContent = email || 'Email';
  } else {
    // show placeholder or prompt user to set username
  }
}

profileMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'flex' : 'none';
});

document.addEventListener('click', (e) => {
  if (!profileDropdown.contains(e.target) && e.target !== profileMenuBtn) {
    profileDropdown.style.display = 'none';
  }
});

logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  username = '';
  userEmail = '';
  updateProfileMenu('', '');
  chatInput.disabled = true;
  authModal.style.display = 'flex';
  profileDropdown.style.display = 'none';
});

function setUsername(name) {
  username = name;
  updateProfileMenu(username, userEmail);
  authModal.style.display = 'none';
  chatInput.disabled = false;
  chatInput.focus();
}

// Prevent sending messages until username is set
chatInput.disabled = true;

function showLogin() {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.style.display = '';
  signupForm.style.display = 'none';
}
function showSignup() {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.style.display = '';
  loginForm.style.display = 'none';
}
loginTab.addEventListener('click', showLogin);
signupTab.addEventListener('click', showSignup);

// SIGN UP
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = sanitizeInput(document.getElementById('signup-email').value);
  const password = document.getElementById('signup-password').value;
  const usernameValue = sanitizeInput(document.getElementById('signup-username').value);

  // Validate inputs
  if (!validateEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (password.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }
  if (!validateUsername(usernameValue)) {
    alert('Username must be 3-30 characters, letters, numbers, and underscores only.');
    return;
  }

  try {
    // Check if username is already taken
    const snapshot = await db.ref('users').orderByChild('username').equalTo(usernameValue).once('value');
    if (snapshot.exists()) {
      alert('Username is already taken.');
      return;
    }

    // Create the user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    userEmail = email;

    // Save username to database
    await db.ref('users/' + user.uid).set({
      username: usernameValue,
      email,
      createdAt: Date.now()
    });

    // Send verification email and sign out
    try {
      await user.sendEmailVerification();
      console.log('Verification email sent to:', user.email);
    } catch (err) {
      console.error('Error sending verification email:', err);
      alert('Failed to send verification email: ' + err.message);
    }
    verifyEmailMessage.textContent = 'A verification email has been sent to your address. Please verify your email to continue.';
    verifyEmailMessage.style.display = 'block';
    resendVerificationBtn.style.display = 'block';
    chatInput.disabled = true;
    await auth.signOut();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      alert('Email is already in use.');
    } else if (error.code === 'auth/invalid-email') {
      alert('Invalid email address.');
    } else if (error.code === 'auth/weak-password') {
      alert('Password must be at least 6 characters long.');
    } else {
      alert(error.message);
    }
  }
});

// Resend verification email logic
resendVerificationBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      await user.sendEmailVerification();
      console.log('Verification email resent to:', user.email);
      verifyEmailMessage.textContent = 'Verification email resent! Please check your inbox.';
    } catch (err) {
      console.error('Error resending verification email:', err);
      verifyEmailMessage.textContent = 'Failed to resend verification email: ' + err.message;
    }
  } else {
    verifyEmailMessage.textContent = 'Please log in to resend verification email.';
  }
});

// LOGIN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = sanitizeInput(document.getElementById('login-email').value);
  const password = document.getElementById('login-password').value;

  if (!validateEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      verifyEmailMessage.textContent = 'Please verify your email address to access the chat.';
      verifyEmailMessage.style.display = 'block';
      resendVerificationBtn.style.display = 'block';
      chatInput.disabled = true;
      return;
    }
    userEmail = email;
    // Get username from database
    const snapshot = await db.ref('users/' + user.uid).once('value');
    setUsername(snapshot.val().username);
    window.location.reload(); // Refresh after login
  } catch (error) {
    alert(error.message);
  }
});

// PERSISTENCE (Remember device)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// AUTO LOGIN
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (!user.emailVerified) {
      verifyEmailMessage.textContent = 'Please verify your email address to access the chat.';
      verifyEmailMessage.style.display = 'block';
      resendVerificationBtn.style.display = 'block';
      chatInput.disabled = true;
      return;
    }
    verifyEmailMessage.style.display = 'none';
    resendVerificationBtn.style.display = 'none';
    userEmail = user.email;
    // Get username from database
    const snapshot = await db.ref('users/' + user.uid).once('value');
    setUsername(snapshot.val().username);
    authModal.style.display = 'none';
    // Load messages only after authentication and verification
    loadMessages();
  } else {
    // User is not authenticated, show login modal
    authModal.style.display = 'flex';
    showLogin();
    loginUsername.focus();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  // Messages are already loading, no need to call loadMessages again
});

async function addMessageToDOM(msgObj) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  // Create avatar with default fallback first
  const avatar = document.createElement('img');
  avatar.classList.add('message-avatar');
  avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msgObj.username)}`;
  avatar.alt = `${msgObj.username}'s avatar`;
  
  // Create message content with timestamp
  const content = document.createElement('div');
  content.classList.add('message-content');
  content.innerHTML = `
    <strong>${msgObj.username}:</strong> ${msgObj.text}
    <div class="message-timestamp">${new Date(msgObj.timestamp).toLocaleString()}</div>
  `;
  
  div.appendChild(avatar);
  div.appendChild(content);
  
  // Load custom avatar in background (non-blocking)
  loadAvatarInBackground(msgObj.username, avatar);
  
  return div;
}

async function loadAvatarInBackground(username, avatarElement) {
  // Check cache first
  if (avatarCache.has(username)) {
    avatarElement.src = avatarCache.get(username);
    return;
  }
  
  try {
    const snapshot = await db.ref('users').orderByChild('username').equalTo(username).once('value');
    const userData = snapshot.val();
    const userKey = userData ? Object.keys(userData)[0] : null;
    
    if (userKey && userData[userKey].avatarUrl) {
      avatarCache.set(username, userData[userKey].avatarUrl);
      avatarElement.src = userData[userKey].avatarUrl;
    }
  } catch (error) {
    // Keep default avatar if there's an error
    console.log('Avatar load error:', error);
  }
}

function loadMessages() {
  chatMessages.innerHTML = '';
  
  // Try to load from cache first for instant display
  const cachedMessages = getCachedMessages();
  if (cachedMessages && cachedMessages.length > 0) {
    displayMessagesInstantly(cachedMessages);
  }
  
  // Reference to messages
  const messagesRef = db.ref('messages');
  
  // Get fresh messages from Firebase
  messagesRef
    .orderByChild('timestamp')
    .limitToLast(25)
    .once('value')
    .then((snapshot) => {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      // Sort by timestamp in reverse order (newest first) for loading efficiency
      messages.sort((a, b) => b.timestamp - a.timestamp);
      
      // Reverse the array to display oldest first (traditional chat layout)
      messages.reverse();
      
      // Cache the fresh messages
      setCachedMessages(messages);
      
      // Only update DOM if we didn't have cached messages or if there are new messages
      if (!cachedMessages || cachedMessages.length === 0) {
        displayMessagesInstantly(messages);
      } else {
        // Check if there are new messages and update only the new ones
        const lastCachedTimestamp = cachedMessages[cachedMessages.length - 1].timestamp;
        const newMessages = messages.filter(msg => msg.timestamp > lastCachedTimestamp);
        
        if (newMessages.length > 0) {
          // Add only new messages to the bottom
          newMessages.forEach(msgObj => {
            const messageElement = createMessageElementInstantly(msgObj);
            chatMessages.appendChild(messageElement);
          });
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }
      
      // Set up real-time listener for future messages
      const lastTimestamp = messages.length > 0 ? messages[messages.length - 1].timestamp : 0;
      
      messagesRef
        .orderByChild('timestamp')
        .startAfter(lastTimestamp)
        .on('child_added', async (snapshot) => {
          const msgObj = {
            id: snapshot.key,
            ...snapshot.val()
          };
          
          // Add to cache
          const currentCache = getCachedMessages() || [];
          currentCache.push(msgObj);
          if (currentCache.length > 25) {
            currentCache.shift(); // Remove oldest message to keep 25 limit
          }
          setCachedMessages(currentCache);
          
          const messageElement = await addMessageToDOM(msgObj);
          chatMessages.appendChild(messageElement);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    });
}

function displayMessagesInstantly(messages) {
  // Create all message elements instantly (no async)
  const messageElements = messages.map(msgObj => createMessageElementInstantly(msgObj));
  
  // Add all messages to DOM in one batch operation
  const fragment = document.createDocumentFragment();
  messageElements.forEach(element => {
    fragment.appendChild(element);
  });
  chatMessages.appendChild(fragment);
  
  // Scroll to bottom to show newest messages
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createMessageElementInstantly(msgObj) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  // Create avatar with default fallback instantly
  const avatar = document.createElement('img');
  avatar.classList.add('message-avatar');
  avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msgObj.username)}`;
  avatar.alt = `${msgObj.username}'s avatar`;
  
  // Create message content with timestamp instantly (XSS protected)
  const content = document.createElement('div');
  content.classList.add('message-content');
  
  // Create username element
  const usernameSpan = document.createElement('strong');
  usernameSpan.textContent = msgObj.username + ': ';
  
  // Create message text element
  const messageText = document.createElement('span');
  messageText.textContent = msgObj.text;
  
  // Create timestamp element
  const timestamp = document.createElement('div');
  timestamp.classList.add('message-timestamp');
  timestamp.textContent = new Date(msgObj.timestamp).toLocaleString();
  
  content.appendChild(usernameSpan);
  content.appendChild(messageText);
  content.appendChild(timestamp);
  
  div.appendChild(avatar);
  div.appendChild(content);
  
  // Load custom avatar in background (completely non-blocking)
  setTimeout(() => loadAvatarInBackground(msgObj.username, avatar), 0);
  
  return div;
}

// Add timestamp to message style
const style = document.createElement('style');
style.textContent = `
  .message-timestamp {
    font-size: 0.8em;
    color: #666;
    margin-top: 2px;
  }
`;
document.head.appendChild(style);

// Modify message sending to ensure proper timestamp and security
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const rawMsg = chatInput.value;
  const msg = sanitizeInput(rawMsg);
  
  if (msg === '' || !username) return;

  // Rate limiting
  if (!checkRateLimit()) {
    alert('Please wait 2 seconds between messages.');
    return;
  }

  // Additional validation
  if (msg.length > 1000) {
    alert('Message too long. Please keep messages under 1000 characters.');
    return;
  }

  const now = Date.now();

  // Push message to Firebase with security measures
  db.ref('messages').push({
    username: username,
    text: msg,
    timestamp: now,
    userId: auth.currentUser ? auth.currentUser.uid : null
  }).catch(error => {
    console.error('Message send error:', error);
    alert('Failed to send message. Please try again.');
  });

  chatInput.value = '';
});
