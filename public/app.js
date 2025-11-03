import { startRegistration, startAuthentication } from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@2.1.0/dist/bundle/index.js';

const API_BASE = '/.netlify/functions/auth';

// Check if already authenticated
function checkAuth() {
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
  
  if (sessionCookie) {
    showApp();
  }
}

// Show/hide forms
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('appContent').classList.remove('authenticated');
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function showApp() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('appContent').classList.add('authenticated');
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.add('show');
  setTimeout(() => errorEl.classList.remove('show'), 5000);
}

function showSuccess(message) {
  const successEl = document.getElementById('success');
  successEl.textContent = message;
  successEl.classList.add('show');
  setTimeout(() => successEl.classList.remove('show'), 3000);
}

function setLoading(loading) {
  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('buttonText');
  
  if (loading) {
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading"></span>Authenticating...';
  } else {
    btn.disabled = false;
    btnText.textContent = 'Sign in with your device';
  }
}

// Handle registration (first time user)
async function handleRegister(email) {
  try {
    // Step 1: Get registration options
    const registerResponse = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!registerResponse.ok) {
      const error = await registerResponse.json();
      throw new Error(error.error || 'Registration failed');
    }

    const options = await registerResponse.json();

    // Step 2: Start WebAuthn registration
    const credential = await startRegistration(options);

    // Step 3: Verify registration
    const verifyResponse = await fetch(`${API_BASE}/verify-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, credential }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || 'Verification failed');
    }

    const result = await verifyResponse.json();
    
    if (result.verified) {
      showSuccess('Registration successful!');
      showApp();
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error.message || 'Registration failed. Please try again.';
    showError(errorMessage);
    console.error('Full error details:', error);
  }
}

// Handle login (returning user)
async function handleLogin(email) {
  try {
    // Step 1: Get authentication options
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      
      // If user not found, try registration
      if (loginResponse.status === 404) {
        return handleRegister(email);
      }
      
      throw new Error(error.error || 'Login failed');
    }

    const options = await loginResponse.json();

    // Step 2: Start WebAuthn authentication
    const credential = await startAuthentication(options);

    // Step 3: Verify authentication
    const verifyResponse = await fetch(`${API_BASE}/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, credential }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || 'Verification failed');
    }

    const result = await verifyResponse.json();
    
    if (result.verified) {
      showSuccess('Login successful!');
      showApp();
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.message || 'Login failed. Please try again.';
    showError(errorMessage);
    console.error('Full error details:', error);
  }
}

// Handle form submission
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  if (!email) {
    showError('Please enter your email address');
    return;
  }

  setLoading(true);
  showError(''); // Clear any previous errors

  try {
    // Try login first, it will fall back to registration if needed
    await handleLogin(email);
  } finally {
    setLoading(false);
  }
});

// Logout function
window.logout = function() {
  showLogin();
};

// Check authentication on page load
checkAuth();

