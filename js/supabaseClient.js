// Supabase configuration
const supabaseUrl = 'https://qedzitbrwwrxatmpfsvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHppdGJyd3dyeGF0bXBmc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODIyMjEsImV4cCI6MjA3NTQ1ODIyMX0.TSERAKByXVw-up-BXifO6ukMWtJclInoS3LgRm5ZeD8';

// Create a custom storage adapter that uses both localStorage and sessionStorage
const customStorage = {
  getItem: (key) => {
    // Try sessionStorage first (for PKCE verifier), then localStorage
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    // Store in both to ensure accessibility
    window.sessionStorage.setItem(key, value);
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  }
};

// Create and export the Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit', // Use implicit flow instead of PKCE to avoid cross-window verifier issues
    storage: customStorage,
    storageKey: 'supabase.auth.token'
  }
});

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', { event, email: session?.user?.email });
  
  if (event === 'SIGNED_IN' && session?.user) {
    console.log('User signed in:', {
      id: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata
    });

    try {
      // Verify the session is valid
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error verifying user:', error);
        return;
      }
      
      if (!user) {
        console.error('No user found after sign in');
        return;
      }

      console.log('Session verified, sending success message');
      
      // Send success message to opener if we're in a popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth-success',
          email: user.email,
          name: user.user_metadata?.full_name || user.email
        }, window.location.origin);
        
        // Close popup after a brief delay
        setTimeout(() => window.close(), 500);
      }
    } catch (error) {
      console.error('Error handling sign in:', error);
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Session token refreshed');
  }
});