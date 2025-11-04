const API_BASE = '/.netlify/functions';
let googleClientId = '';

// Check if already authenticated
function checkAuth() {
  const cookies = document.cookie.split(';');
  const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
  
  if (sessionCookie) {
    // Try to get user info from session
    showApp();
  }
}

// Show/hide forms
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('appContent').classList.remove('authenticated');
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function showApp(userData = null) {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('appContent').classList.add('authenticated');
  
  if (userData) {
    document.getElementById('userName').textContent = userData.name || 'Welcome back!';
    document.getElementById('userEmail').textContent = userData.user || '';
    if (userData.picture) {
      document.getElementById('userAvatar').src = userData.picture;
    }
  }
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
  const btn = document.getElementById('googleSignInBtn');
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span>Authenticating...';
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    `;
  }
}

// Initialize Google Sign-In
async function initializeGoogleSignIn() {
  // Get client ID from environment or config
  // For now, we'll need to get it from a config endpoint or set it directly
  // You'll need to set GOOGLE_CLIENT_ID in Netlify environment variables
  
  // Wait for Google API to load
  await new Promise((resolve) => {
    if (window.google) {
      resolve();
    } else {
      window.addEventListener('load', resolve);
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle);
          resolve();
        }
      }, 100);
    }
  });

  // Get client ID from server config endpoint
  try {
    const configResponse = await fetch(`${API_BASE}/config`);
    if (configResponse.ok) {
      const config = await configResponse.json();
      googleClientId = config.clientId;
      console.log('Google Client ID loaded:', googleClientId ? 'Yes' : 'No');
    } else {
      const errorText = await configResponse.text();
      console.error('Config response error:', configResponse.status, errorText);
      throw new Error(`Could not get Google Client ID: ${configResponse.status}`);
    }
  } catch (error) {
    console.error('Error getting config:', error);
    showError('Configuration error. Please check server settings. Error: ' + error.message);
    return;
  }

  if (!googleClientId) {
    showError('Google Sign-In not configured. Please set GOOGLE_CLIENT_ID environment variable in Netlify.');
    return;
  }

  // Initialize Google Sign-In
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleSignIn,
  });
}

// Handle Google Sign-In callback
async function handleGoogleSignIn(response) {
  try {
    setLoading(true);
    showError(''); // Clear any previous errors

    console.log('Google Sign-In response received');

    // Verify the token with our backend
    const verifyResponse = await fetch(`${API_BASE}/verify-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const result = await verifyResponse.json();
    
    if (result.verified) {
      showSuccess('Login successful!');
      showApp({
        name: result.name,
        user: result.user,
        picture: result.picture
      });
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    showError(error.message || 'Authentication failed. Please try again.');
  } finally {
    setLoading(false);
  }
}

// Sign in with Google button click
window.signInWithGoogle = function() {
  if (!googleClientId) {
    showError('Google Sign-In not initialized. Please refresh the page.');
    return;
  }

  google.accounts.id.prompt();
};

// Logout function
window.logout = function() {
  google.accounts.id.disableAutoSelect();
  showLogin();
};

// Initialize when page loads
window.addEventListener('load', async () => {
  await initializeGoogleSignIn();
  checkAuth();
});
