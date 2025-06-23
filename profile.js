// Profile page logic
const auth = firebase.auth();

// Hamburger menu logic for profile page (copied from support.js)
document.addEventListener('DOMContentLoaded', function() {
  const profileMenuBtn = document.getElementById('profile-menu-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const logoutBtn = document.getElementById('logout-btn');

  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      profileDropdown.style.display = (profileDropdown.style.display === 'none' || !profileDropdown.style.display) ? 'flex' : 'none';
      console.log('Hamburger clicked, dropdown display:', profileDropdown.style.display);
    });

    document.addEventListener('click', function(e) {
      if (!profileDropdown.contains(e.target) && e.target !== profileMenuBtn) {
        profileDropdown.style.display = 'none';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await firebase.auth().signOut();
      window.location.href = 'index.html';
    });
  }
});

// Profile form logic
const profileForm = document.getElementById('profile-form');
const profileUsernameInput = document.getElementById('profile-username-input');
const profileEmailInput = document.getElementById('profile-email-input');
const profileDescriptionInput = document.getElementById('profile-description-input');
const profileAvatar = document.getElementById('profile-avatar');
const avatarUpload = document.getElementById('avatar-upload');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const usernameCooldownMsg = document.getElementById('username-cooldown-msg');

let lastUsernameChange = 0;
const USERNAME_COOLDOWN = 60 * 1000; // 60 seconds

// Redirect to login if not logged in
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  // Load user data
  const snapshot = await db.ref('users/' + user.uid).once('value');
  const data = snapshot.val() || {};
  profileUsernameInput.value = data.username || '';
  profileEmailInput.value = user.email || '';
  profileDescriptionInput.value = data.description || '';
  profileAvatar.src = data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}`;
  lastUsernameChange = data.lastUsernameChange || 0;
  usernameCooldownMsg.textContent = '';
});

changeAvatarBtn.addEventListener('click', () => {
  avatarUpload.click();
});

avatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    profileAvatar.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const newUsername = profileUsernameInput.value.trim();
  const description = profileDescriptionInput.value.trim();
  const now = Date.now();
  if (lastUsernameChange && now - lastUsernameChange < USERNAME_COOLDOWN) {
    const seconds = Math.ceil((USERNAME_COOLDOWN - (now - lastUsernameChange)) / 1000);
    usernameCooldownMsg.textContent = `You can change your username in ${seconds} seconds.`;
    return;
  }
  const avatarUrl = profileAvatar.src;
  await db.ref('users/' + user.uid).update({
    username: newUsername,
    description,
    avatarUrl,
    lastUsernameChange: now
  });
  usernameCooldownMsg.textContent = 'Profile updated!';
  lastUsernameChange = now;
  setTimeout(() => { usernameCooldownMsg.textContent = ''; }, 2000);
});
