const API_BASE = '/.netlify/functions';
let googleClientId = '';

// Session expiration: 48 hours in milliseconds
const SESSION_DURATION_MS = 48 * 60 * 60 * 1000;

// Check if token is expired (token format: base64(email:timestamp))
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // Decode base64 token (browser-compatible)
    const decoded = atob(token);
    const parts = decoded.split(':');
    
    if (parts.length !== 2) return true;
    
    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) return true;
    
    // Check if token is within 48 hours
    const now = Date.now();
    const age = now - timestamp;
    
    return age > SESSION_DURATION_MS;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

// Check if already authenticated
function checkAuth() {
  // Don't auto-redirect if this is a logout action
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('logout') === 'true') {
    // Clean up the URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return; // Stay on login page
  }
  
  // Check localStorage first (faster)
  const localStorageAuth = localStorage.getItem('yarny_auth');
  
  // Validate localStorage token if present
  if (localStorageAuth && !isTokenExpired(localStorageAuth)) {
    // Redirect to stories page if already authenticated
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      window.location.href = '/stories.html';
    }
    return;
  } else if (localStorageAuth && isTokenExpired(localStorageAuth)) {
    // Clear expired token
    localStorage.removeItem('yarny_auth');
    localStorage.removeItem('yarny_user');
  }
  
  // Also check cookie
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth='));
  
  if (authCookie) {
    const cookieValue = authCookie.split('=')[1].trim();
    if (!isTokenExpired(cookieValue)) {
      // Redirect to stories page if already authenticated
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.location.href = '/stories.html';
      }
    } else {
      // Clear expired cookie
      document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }
  
  // Check for HttpOnly session cookie by making a request to verify
  // If session cookie exists and is valid, it will redirect
  // If not, we'll stay on the login page
}

// Show/hide forms
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('appContent').classList.remove('authenticated');
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  localStorage.removeItem('yarny_auth');
  localStorage.removeItem('yarny_user');
}

function showApp(userData = null) {
  // Redirect to editor page after authentication
  window.location.href = '/editor.html';
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
      // Store auth token in localStorage as backup
      if (result.token) {
        localStorage.setItem('yarny_auth', result.token);
        localStorage.setItem('yarny_user', JSON.stringify({
          name: result.name,
          user: result.user,
          picture: result.picture
        }));
      }
      
      showSuccess('Login successful!');
      
      // Small delay to ensure cookies are set before redirect
      setTimeout(() => {
        // Redirect to stories page instead of editor
        window.location.href = '/stories.html';
      }, 300);
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
window.logout = async function() {
  // Disable Google auto-select
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  
  // Clear all auth data from localStorage
  localStorage.removeItem('yarny_auth');
  localStorage.removeItem('yarny_user');
  localStorage.removeItem('yarny_current_story');
  
  // Call server-side logout to clear HttpOnly cookies
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include' // Important: include cookies in the request
    });
  } catch (error) {
    console.error('Logout request failed:', error);
    // Continue with logout anyway
  }
  
  // Clear client-side cookies as backup
  const cookieOptions = '; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  document.cookie = 'session=' + cookieOptions;
  document.cookie = 'auth=' + cookieOptions;
  document.cookie = 'drive_auth_state=' + cookieOptions;
  
  // Redirect to login page with a flag to prevent auto-redirect
  window.location.href = '/?logout=true';
};

// Initialize when page loads
window.addEventListener('load', async () => {
  await initializeGoogleSignIn();
  checkAuth();
});
