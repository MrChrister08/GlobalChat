const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let username = '';

const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const usernameSubmit = document.getElementById('username-submit');

function setUsername(name) {
  username = name;
  usernameModal.style.display = 'none';
  chatInput.disabled = false;
  chatInput.focus();
}

// Prevent sending messages until username is set
chatInput.disabled = true;

usernameSubmit.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (name) setUsername(name);
});

usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (name) setUsername(name);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  usernameModal.style.display = 'flex';
  usernameInput.focus();
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
