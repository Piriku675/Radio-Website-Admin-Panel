// ═══════════════════════════════════════════════
//  auth.js — login / logout
// ═══════════════════════════════════════════════

import { signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth }         from './firebase.js';
import { toast }        from './utils.js';
import { loadDashboard } from './dashboard.js';

const loginScreen = document.getElementById('login-screen');
const app         = document.getElementById('app');
const loginBtn    = document.getElementById('login-btn');
const errEl       = document.getElementById('login-error');

// Enter key on password field
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
loginBtn.addEventListener('click', doLogin);

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  errEl.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    const msgs = {
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/user-not-found':     'No account found with that email.',
      'auth/wrong-password':     'Incorrect password.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
    };
    errEl.textContent = msgs[e.code] || e.message;
    errEl.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
  toast('Signed out', 'info');
});

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    app.style.display = 'block';
    document.getElementById('nav-user-email').textContent = user.email;
    loadDashboard();
  } else {
    loginScreen.style.display = 'flex';
    app.style.display = 'none';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});
