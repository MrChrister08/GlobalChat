const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let username = '';

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

function setUsername(name) {
  username = name;
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

function addMessageToDOM(msgObj) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<strong>${msgObj.username}:</strong> ${msgObj.text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadMessages() {
  chatMessages.innerHTML = '';
  // Listen for new messages in real time
  db.ref('messages').on('child_added', (snapshot) => {
    const msgObj = snapshot.val();
    addMessageToDOM(msgObj);
  });
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (msg === '' || !username) return;

  // Push message to Firebase
  db.ref('messages').push({
    username: username,
    text: msg,
    timestamp: Date.now()
  });

  chatInput.value = '';
});
