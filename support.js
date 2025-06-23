// Support page logic
const auth = firebase.auth();

// Redirect to login if not logged in
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'index.html';
  }
});

document.getElementById('support-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Support message sent!');
  document.getElementById('support-message').value = '';
});

// Hamburger menu logic for support page
const profileMenuBtn = document.getElementById('profile-menu-btn');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');

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
  await firebase.auth().signOut();
  window.location.href = 'index.html';
});
