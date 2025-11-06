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
  // Skip auth check for public documentation pages
  const publicPages = ['/docs.html', '/help.html', '/guide.html', '/migration-plan.html', '/migration-plan'];
  const currentPath = window.location.pathname;
  if (publicPages.some(page => currentPath.includes(page))) {
    return; // Don't run auth checks on docs pages
  }

  // Development mode: allow bypassing auth on localhost
  const urlParams = new URLSearchParams(window.location.search);
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isDev && urlParams.get('dev') === 'true') {
    // Set up fake auth for development
    const devUser = {
      name: 'Dev User',
      user: 'dev@local.test',
      picture: 'https://ui-avatars.com/api/?name=Dev+User&background=10B981&color=fff'
    };
    localStorage.setItem('yarny_auth', btoa('dev@local.test:' + Date.now()));
    localStorage.setItem('yarny_user', JSON.stringify(devUser));

    // Redirect to editor if on login page
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      window.location.href = '/editor.html';
    }
    return;
  }

  // Don't auto-redirect if this is a logout action
  if (urlParams.get('logout') === 'true' || urlParams.get('force') === 'true') {
    // Aggressively clear everything on force logout
    if (urlParams.get('force') === 'true') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(';').forEach(c => {
        const cookieName = c.split('=')[0].trim();
        if (cookieName) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        }
      });
      
      // Disable Google auto-select
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.disableAutoSelect();
          window.google.accounts.id.cancel();
        } catch (e) {}
      }
    }
    
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
      googleClientId = (config.clientId || '').trim(); // Trim whitespace

      if (!googleClientId) {
        console.error('Client ID is empty after parsing');
        showError('Google Client ID is empty. Please check Netlify environment variables.');
        return;
      }

      // Log first and last few characters for debugging (don't log full ID)
      const preview = googleClientId.length > 20
        ? googleClientId.substring(0, 10) + '...' + googleClientId.substring(googleClientId.length - 5)
        : '***';
      console.log('Google Client ID loaded:', 'Yes (length:', googleClientId.length + ', preview:', preview + ')');
    } else {
      // On localhost/dev, functions might not be available. Show a gentle warning
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const errorMsg = `Config endpoint error: ${configResponse.status}`;
      console.warn(errorMsg);

      if (!isDev) {
        // On production, this is an error
        throw new Error(errorMsg);
      }
      // On dev, continue - user can use dev mode
    }
  } catch (error) {
    console.error('Error getting config:', error);

    // On localhost, this is expected when functions aren't available
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isDev) {
      showError('Configuration error. Please check server settings. Error: ' + error.message);
      return;
    }
  }

  // If we don't have a client ID, we'll skip Google Sign-In initialization
  // Users can still use dev mode on localhost
  if (!googleClientId) {
    console.warn('Google Sign-In not configured. Use dev mode on localhost or set GOOGLE_CLIENT_ID environment variable for production.');
    return;
  }

  // Initialize Google Sign-In with FedCM support
  try {
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true, // Intelligent Tracking Prevention support
      use_fedcm_for_prompt: true, // Enable FedCM
    });

    // Render a Google Sign-In button that overlays our custom button
    // This ensures users can always log in, even if not already signed in to Google
    // The Google-rendered button will always show the account selector/login screen
    const setupGoogleButtonOverlay = () => {
      const customButton = document.getElementById('googleSignInBtn');
      if (!customButton) {
        // Retry after a short delay if button not found yet
        setTimeout(setupGoogleButtonOverlay, 100);
        return;
      }

      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'googleSignInButtonContainer';
      
      // Position the Google button to overlay our custom button
      const updatePosition = () => {
        const rect = customButton.getBoundingClientRect();
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.top = rect.top + 'px';
        buttonContainer.style.left = rect.left + 'px';
        buttonContainer.style.width = rect.width + 'px';
        buttonContainer.style.height = rect.height + 'px';
      };
      
      updatePosition();
      buttonContainer.style.opacity = '0'; // Make it invisible but still clickable
      buttonContainer.style.pointerEvents = 'auto'; // Make sure it's clickable
      buttonContainer.style.zIndex = '1000'; // Above our custom button
      buttonContainer.style.overflow = 'hidden'; // Ensure iframe doesn't overflow
      buttonContainer.style.cursor = 'pointer'; // Show pointer cursor
      
      document.body.appendChild(buttonContainer);

      // Render the Google button - this will always show account selector when clicked
      // We'll style it to match our custom button size
      const rect = customButton.getBoundingClientRect();
      google.accounts.id.renderButton(
        buttonContainer,
        {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: rect.width, // Match custom button width
        }
      );

      // Wait for the button to render (it's async), then update position
      const checkButtonRendered = setInterval(() => {
        if (buttonContainer.querySelector('iframe') || buttonContainer.querySelector('div[role="button"]')) {
          clearInterval(checkButtonRendered);
          updatePosition(); // Update position once button is rendered
        }
      }, 100);

      // Clear interval after 5 seconds if button still not rendered
      setTimeout(() => clearInterval(checkButtonRendered), 5000);

      // Store reference to button container for later use
      window.googleSignInButtonContainer = buttonContainer;
      
      // Update position if window is resized or scrolled
      const updatePositionHandler = () => updatePosition();
      window.addEventListener('resize', updatePositionHandler);
      window.addEventListener('scroll', updatePositionHandler, true);
      
      // Store cleanup function
      buttonContainer._cleanup = () => {
        window.removeEventListener('resize', updatePositionHandler);
        window.removeEventListener('scroll', updatePositionHandler, true);
      };
    };

    // Start setting up the overlay
    setupGoogleButtonOverlay();

    console.log('Google Sign-In initialized with FedCM support');
  } catch (error) {
    console.error('Error initializing Google Sign-In:', error);
    showError('Failed to initialize Google Sign-In. Please refresh the page.');
  }
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
window.signInWithGoogle = function(event) {
  if (!googleClientId) {
    // On localhost, suggest using dev mode
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      showError('Google Sign-In not available locally. Click "Enter Dev Mode" below to test.');
    } else {
      showError('Google Sign-In not initialized. Please refresh the page.');
    }
    return;
  }

  // The Google button overlay should be positioned over our custom button
  // If the overlay is set up correctly, clicks should naturally go to it
  // However, since our custom button has an onclick handler, we need to prevent
  // default behavior and manually trigger the overlay
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const buttonContainer = document.getElementById('googleSignInButtonContainer') || window.googleSignInButtonContainer;
  
  if (buttonContainer) {
    // Try to simulate a click at the center of the overlay
    // This will trigger the Google button's click handler
    const rect = buttonContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create a synthetic click event at the center of the overlay
    const syntheticClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });
    
    // Dispatch the event on the container
    buttonContainer.dispatchEvent(syntheticClick);
    
    // Also try dispatching on the iframe if it exists
    const iframe = buttonContainer.querySelector('iframe');
    if (iframe) {
      try {
        iframe.dispatchEvent(syntheticClick);
        // Also try the native click method
        iframe.click();
      } catch (e) {
        // Cross-origin restrictions may prevent this, which is fine
        // The container click should work
      }
    }
    
    // If the button hasn't been rendered yet, fall back to prompt()
    setTimeout(() => {
      if (!buttonContainer.querySelector('iframe') && !buttonContainer.querySelector('div[role="button"]')) {
        console.warn('Google button not rendered yet, falling back to prompt()');
        google.accounts.id.prompt();
      }
    }, 200);
  } else {
    // Fallback: try prompt() if container not found
    console.warn('Google button container not found, falling back to prompt()');
    google.accounts.id.prompt();
  }
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
