// Import Supabase client
import { supabase } from './supabaseClient.js';

// Track which method user chose (gmail or x)
let signupMethod = null;

// Theme toggle functionality
function toggleTheme() {
  const body = document.body;
  const toggle = document.getElementById('theme-toggle');
  
  body.classList.toggle('dark-mode');
  toggle.classList.toggle('dark-mode');
  
  // Save preference to localStorage
  const isDarkMode = body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
}

// Load saved theme preference
function loadTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').classList.add('dark-mode');
  }
}

  // Initialize theme on page load
  document.addEventListener('DOMContentLoaded', async function() {
    loadTheme();
    
    // Check if we're returning from OAuth
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('code');
    
    if (hasAuthTokens) {
      console.log('Detected OAuth redirect, processing session...');
      
      // Wait a moment for Supabase to process the session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Session obtained:', session.user.email);
        
        // Store user info
        localStorage.setItem('waitlist_user_email', session.user.email);
        localStorage.setItem('waitlist_user_name', session.user.user_metadata?.full_name || session.user.email);
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        // Show next steps
        showNextSteps();
      } else if (error) {
        console.error('Session error:', error);
        alert('Authentication failed. Please try again.');
      }
    }
    
    checkForAuthCallback(); // Check if user is returning from OAuth
    setupPopupMessageListener(); // Listen for messages from OAuth popup
    setupFlowListeners(); // Setup the multi-step flow
    checkExistingConnection(); // Check if user already connected
  
  // Add event listener for theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Add event listeners for connect buttons
  const gmailButton = document.querySelector('.connect-gmail');
  if (gmailButton) {
    gmailButton.addEventListener('click', (e) => {
      e.preventDefault();
      connectWithGmail();
    });
  }
  
  const xButton = document.querySelector('.connect-x');
  if (xButton) {
    xButton.addEventListener('click', (e) => {
      e.preventDefault();
      connectWithX();
    });
  }
  
  // Add event listener for join waitlist button
  const joinButton = document.getElementById('join-waitlist-button');
  if (joinButton) {
    joinButton.addEventListener('click', joinWaitlist);
  }
});

// Check if user already has a connection stored (e.g., after page refresh)
function checkExistingConnection() {
  const email = localStorage.getItem('waitlist_user_email');
  if (email) {
    showNextSteps();
  }
}

// ========== Multi-Step Flow Setup ==========

function setupFlowListeners() {
  // Listen for checkbox changes
  const termsCheckbox = document.getElementById('terms');
  const updatesCheckbox = document.getElementById('updates');
  const joinButton = document.getElementById('join-waitlist-button');
  
  function checkCheckboxes() {
    if (termsCheckbox && joinButton) {
      // Enable button only if terms is checked (updates is optional)
      if (termsCheckbox.checked) {
        joinButton.disabled = false;
        joinButton.style.opacity = '1';
        joinButton.style.cursor = 'pointer';
      } else {
        joinButton.disabled = true;
        joinButton.style.opacity = '0.5';
        joinButton.style.cursor = 'not-allowed';
      }
    }
  }
  
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', checkCheckboxes);
  }
  if (updatesCheckbox) {
    updatesCheckbox.addEventListener('change', checkCheckboxes);
  }
}

function showNextSteps() {
  // OAuth completed - user can now proceed with the flow
  // All elements are already visible, no need to show/hide
  console.log('OAuth completed successfully - user can now complete the waitlist signup');
  
  // Update the Gmail button to show connected state
  const email = localStorage.getItem('waitlist_user_email');
  if (email) {
    const gmailButton = document.querySelector('.connect-gmail');
    if (gmailButton) {
      gmailButton.classList.add('connected');
      gmailButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        ${email}
      `;
      gmailButton.disabled = true;
      gmailButton.style.cursor = 'default';
    }
  }
}

// ========== OAuth Functions ==========

async function connectWithGmail() {
  try {
    console.log('Starting Gmail OAuth via Supabase...');
    console.log('Current origin:', window.location.origin);
    
    signupMethod = 'gmail';
    localStorage.setItem('waitlist_signup_method', 'gmail');
    localStorage.setItem('waitlist_popup_auth', 'true');
    
    // Use Supabase's Google provider
    console.log('Calling Supabase signInWithOAuth...');
    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    // Let Supabase handle everything - it will redirect the current tab
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Redirect back to the main page
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });
    
    console.log('Supabase OAuth response:', { data, error });
    
    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }
    
    if (!data?.url) {
      console.error('No OAuth URL received from Supabase');
      throw new Error('No OAuth URL received from Supabase');
    }
    
    console.log('Received OAuth URL:', data.url);
    
    // Open the auth URL in a centered popup
    const width = 500;
    const height = 600;
    const left = Math.round((screen.width - width) / 2);
    const top = Math.round((screen.height - height) / 2);
    
    const popup = window.open(
      data.url,
      'google-oauth-waitlist',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      console.error('Popup was blocked');
      throw new Error('Popup was blocked. Please allow popups for this site.');
    }
    
    console.log('Gmail OAuth popup opened via Supabase...');
  } catch (error) {
    console.error('Failed to connect with Gmail:', error);
    alert(`Failed to connect with Gmail: ${error.message}\n\nPlease check console for details.`);
  }
}

async function connectWithX() {
  try {
    console.log('Starting X OAuth via Supabase...');
    
    signupMethod = 'x';
    localStorage.setItem('waitlist_signup_method', 'x');
    
    // Let Supabase handle everything - it will redirect the current tab
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: window.location.origin, // Redirect back to the main page
        scopes: 'users.read'
      }
    });
    
    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to connect with X:', error);
    alert(`Failed to connect with X: ${error.message}`);
  }
}

// ========== Popup Message Listener ==========

function setupPopupMessageListener() {
  window.addEventListener('message', async (event) => {
    // Accept messages from both www and non-www
    const validOrigins = ['https://zendegen.app', 'https://www.zendegen.app'];
    if (!validOrigins.includes(event.origin)) {
      return; // Silently ignore messages from other origins (e.g., browser extensions)
    }
    
    if (event.data && event.data.type === 'oauth-success') {
      console.log('Received OAuth success message from popup');
      
      const { email, name } = event.data;
      
      // Store user info for later (when they click Join Waitlist)
      localStorage.setItem('waitlist_user_email', email);
      localStorage.setItem('waitlist_user_name', name || '');
      
      // Show next steps (follow buttons, checkboxes, join button)
      showNextSteps();
    } else if (event.data && event.data.type === 'oauth-error') {
      console.error('Received OAuth error from popup:', event.data.error);
      alert(`Authentication failed: ${event.data.error}`);
    }
  });
}

// ========== Auth Callback Handler ==========

async function checkForAuthCallback() {
  // Check if we have OAuth tokens in the URL
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  
  if (accessToken) {
    console.log('Auth callback detected');
    
    // Check if we're in a popup (opened from main page)
    const isPopup = localStorage.getItem('waitlist_popup_auth') === 'true' && window.opener;
    
    try {
      // Get user info from token
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('Failed to get user:', error);
        if (isPopup && window.opener) {
          window.opener.postMessage({ 
            type: 'oauth-error', 
            error: 'Authentication failed' 
          }, window.location.origin);
          window.close();
        } else {
          alert('Authentication failed. Please try again.');
          window.location.hash = '';
        }
        return;
      }
      
      console.log('User authenticated:', user.email);
      
      // Sign out immediately (we don't need to keep them signed in)
      await supabase.auth.signOut();
      
      if (isPopup && window.opener) {
        // We're in a popup - send message to parent and close
        console.log('Sending success message to parent window');
        window.opener.postMessage({ 
          type: 'oauth-success',
          email: user.email,
          name: user.user_metadata?.full_name || null
        }, window.location.origin);
        
        // Close popup after a brief delay
        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        // We're in the main window - process directly
        const method = localStorage.getItem('waitlist_signup_method') || 'gmail';
        const wantsUpdates = localStorage.getItem('waitlist_wants_updates') === 'true';
        
        await addToWaitlist(user.email, user.user_metadata?.full_name || null, method, wantsUpdates);
        
        // Clean up
        localStorage.removeItem('waitlist_signup_method');
        localStorage.removeItem('waitlist_wants_updates');
        
        // Clear URL hash
        window.location.hash = '';
        
        // Show success message
        showSuccessMessage(user.email);
      }
      
    } catch (error) {
      console.error('Error processing auth callback:', error);
      if (isPopup && window.opener) {
        window.opener.postMessage({ 
          type: 'oauth-error', 
          error: error.message 
        }, window.location.origin);
        window.close();
      } else {
        alert('An error occurred while joining the waitlist. Please try again.');
        window.location.hash = '';
      }
    }
  }
}

// ========== Waitlist Functions ==========

async function addToWaitlist(email, name, source, wantsUpdates) {
  try {
    console.log('Adding to waitlist:', { email, name, source, wantsUpdates });
    
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email,
          name: name,
          source: source,
          wants_updates: wantsUpdates
        }
      ])
      .select(); // Add select to return the inserted data
    
    console.log('Insert result:', { data, error });
    
    if (error) {
      console.error('Supabase error details:', error);
      console.error('Error code:', error.code);
      console.error('Error hint:', error.hint);
      console.error('Error details:', error.details);
      
      // Check if it's a duplicate email error
      if (error.code === '23505') {
        console.log('Email already in waitlist');
        showSuccessMessage(email, true); // true = already joined
        return;
      }
      
      // Provide more helpful error messages
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error('Waitlist table does not exist in Supabase. Please create it using the SQL in README.md');
      }
      
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        throw new Error('Permission denied. Please check RLS policies in Supabase.');
      }
      
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log('Successfully added to waitlist:', data);
    
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    throw error;
  }
}

function showSuccessMessage(email, alreadyJoined = false) {
  const modal = document.querySelector('.waitlist-modal');
  if (!modal) return;
  
  const message = alreadyJoined 
    ? `You're already on the waitlist! We'll notify you at ${email} when we launch.`
    : `Success! You've joined the waitlist. We'll notify you at ${email} when we launch.`;
  
  modal.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
      <h1 class="waitlist-title">You're In!</h1>
      <p class="waitlist-subtitle">${message}</p>
      <button class="join-button" onclick="window.location.reload()">
        Join with Another Email
      </button>
    </div>
  `;
}

// ========== Join Waitlist ==========

async function joinWaitlist() {
  try {
    console.log('Join waitlist button clicked');
    
    // Get stored user info from OAuth
    const email = localStorage.getItem('waitlist_user_email');
    const name = localStorage.getItem('waitlist_user_name');
    const method = localStorage.getItem('waitlist_signup_method') || 'gmail';
    
    console.log('User info:', { email, name, method });
    
    if (!email) {
      alert('Please connect with Gmail or X first.');
      return;
    }
    
    // Check if terms are agreed to
    const termsChecked = document.getElementById('terms').checked;
    if (!termsChecked) {
      alert('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    
    // Get updates preference
    const wantsUpdates = document.getElementById('updates').checked;
    
    console.log('Calling addToWaitlist...');
    // Add to waitlist
    await addToWaitlist(email, name, method, wantsUpdates);
    
    console.log('addToWaitlist completed successfully');
    
    // Clean up
    localStorage.removeItem('waitlist_user_email');
    localStorage.removeItem('waitlist_user_name');
    localStorage.removeItem('waitlist_signup_method');
    localStorage.removeItem('waitlist_wants_updates');
    localStorage.removeItem('waitlist_popup_auth');
    
    console.log('Showing success message...');
    // Show success message
    showSuccessMessage(email);
    
  } catch (error) {
    console.error('Error joining waitlist:', error);
    alert(`Failed to join waitlist: ${error.message}\n\nCheck console for details.`);
  }
}

