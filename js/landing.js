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
document.addEventListener('DOMContentLoaded', function() {
  loadTheme();
  checkForAuthCallback(); // Check if user is returning from OAuth
  setupPopupMessageListener(); // Listen for messages from OAuth popup
  
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

// ========== OAuth Functions ==========

async function connectWithGmail() {
  try {
    // Check if terms are agreed to
    const termsChecked = document.getElementById('terms').checked;
    if (!termsChecked) {
      alert('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    
    console.log('Starting Gmail OAuth for waitlist...');
    signupMethod = 'gmail';
    localStorage.setItem('waitlist_signup_method', 'gmail');
    
    // Get updates preference
    const wantsUpdates = document.getElementById('updates').checked;
    localStorage.setItem('waitlist_wants_updates', wantsUpdates);
    
    // Mark that we're expecting a popup auth (so popup knows to communicate back)
    localStorage.setItem('waitlist_popup_auth', 'true');
    
    // Build the OAuth URL manually
    const supabaseUrl = 'https://wouziwxgidiuygrxxago.supabase.co';
    
    // Use oauth-callback.html as redirect target
    const redirectTo = `${window.location.origin}/oauth-callback.html`;
    
    // Log the redirect URL so user can add it to Supabase settings
    console.log('====================================');
    console.log('📋 ADD THIS URL TO SUPABASE:');
    console.log(redirectTo);
    console.log('Go to: Supabase → Authentication → URL Configuration → Redirect URLs');
    console.log('====================================');
    
    // Construct Supabase OAuth URL
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?` + 
      `provider=google` +
      `&redirect_to=${encodeURIComponent(redirectTo)}` +
      `&access_type=offline` +
      `&prompt=select_account`;
    
    console.log('Opening OAuth popup:', oauthUrl);
    
    // Open OAuth in a centered popup window
    const width = 500;
    const height = 600;
    const left = Math.round((screen.width - width) / 2);
    const top = Math.round((screen.height - height) / 2);
    
    const popup = window.open(
      oauthUrl,
      'google-oauth-waitlist',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      alert('Popup was blocked. Please allow popups for this site and try again.');
      localStorage.removeItem('waitlist_popup_auth');
      return;
    }
    
  } catch (error) {
    console.error('Error connecting with Gmail:', error);
    alert('An error occurred. Please try again.');
    localStorage.removeItem('waitlist_popup_auth');
  }
}

function connectWithX() {
  alert('Twitter/X integration coming soon! For now, please use Gmail.');
}

// ========== Popup Message Listener ==========

function setupPopupMessageListener() {
  window.addEventListener('message', async (event) => {
    // Only accept messages from our own origin
    if (event.origin !== window.location.origin) return;
    
    if (event.data && event.data.type === 'oauth-success') {
      console.log('Received OAuth success message from popup');
      
      const { email, name } = event.data;
      const method = localStorage.getItem('waitlist_signup_method') || 'gmail';
      const wantsUpdates = localStorage.getItem('waitlist_wants_updates') === 'true';
      
      try {
        // Add to waitlist
        await addToWaitlist(email, name, method, wantsUpdates);
        
        // Clean up
        localStorage.removeItem('waitlist_signup_method');
        localStorage.removeItem('waitlist_wants_updates');
        localStorage.removeItem('waitlist_popup_auth');
        
        // Show success message
        showSuccessMessage(email);
      } catch (error) {
        console.error('Error adding to waitlist:', error);
        alert(`Failed to join waitlist: ${error.message}\n\nCheck console for details.`);
      }
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
      ]);
    
    if (error) {
      console.error('Supabase error details:', error);
      
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

// ========== Manual Waitlist (Fallback) ==========

function joinWaitlist() {
  // This is now just a fallback if they don't use OAuth
  alert('Please connect with Gmail or X to join the waitlist.');
}

