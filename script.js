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

// Initialize Firebase Auth
const auth = firebase.auth();

// PROFILE MENU LOGIC
const profileMenuBtn = document.getElementById('profile-menu-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const profileUsername = document.getElementById('profile-username');
const profileEmail = document.getElementById('profile-email');
const logoutBtn = document.getElementById('logout-btn');

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
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const usernameValue = document.getElementById('signup-username').value.trim();

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    userEmail = email;
    // Save username in database
    await db.ref('users/' + user.uid).set({ username: usernameValue, email });
    setUsername(usernameValue);
  } catch (error) {
    alert(error.message);
  }
});

// LOGIN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    userEmail = email;
    // Get username from database
    const snapshot = await db.ref('users/' + user.uid).once('value');
    setUsername(snapshot.val().username);
  } catch (error) {
    alert(error.message);
  }
});

// PERSISTENCE (Remember device)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// AUTO LOGIN
auth.onAuthStateChanged(async (user) => {
  if (user) {
    userEmail = user.email;
    // Get username from database
    const snapshot = await db.ref('users/' + user.uid).once('value');
    setUsername(snapshot.val().username);
    authModal.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  authModal.style.display = 'flex';
  showLogin();
  loginUsername.focus();
  loadMessages();
});

async function addMessageToDOM(msgObj) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  // Create avatar
  const avatar = document.createElement('img');
  avatar.classList.add('message-avatar');
  
  // Get user's avatar from Firebase
  const snapshot = await db.ref('users').orderByChild('username').equalTo(msgObj.username).once('value');
  const userData = snapshot.val();
  const userKey = userData ? Object.keys(userData)[0] : null;
  
  if (userKey && userData[userKey].avatarUrl) {
    avatar.src = userData[userKey].avatarUrl;
  } else {
    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msgObj.username)}`;
  }
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
  return div;
}

function loadMessages() {
  chatMessages.innerHTML = '';
  
  // Reference to messages
  const messagesRef = db.ref('messages');
  
  // Listen for all messages
  messagesRef
    .orderByChild('timestamp')
    .limitToLast(100)
    .on('value', async (snapshot) => {
      // Clear existing messages
      chatMessages.innerHTML = '';
      
      // Convert to array for sorting
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const msg = {
          id: childSnapshot.key,
          ...childSnapshot.val()
        };
        messages.push(msg);
      });
      
      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Add messages to DOM in order
      for (const msgObj of messages) {
        const messageElement = await addMessageToDOM(msgObj);
        chatMessages.appendChild(messageElement);
      }
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
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

// Modify message sending to ensure proper timestamp
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (msg === '' || !username) return;

  const now = Date.now();

  // Push message to Firebase
  db.ref('messages').push({
    username: username,
    text: msg,
    timestamp: now,
    userId: auth.currentUser ? auth.currentUser.uid : null
  });

  chatInput.value = '';
});
