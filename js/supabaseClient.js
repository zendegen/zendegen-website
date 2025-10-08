// Supabase configuration
const supabaseUrl = 'https://qedzitbrwwrxatmpfsvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHppdGJyd3dyeGF0bXBmc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODIyMjEsImV4cCI6MjA3NTQ1ODIyMX0.TSERAKByXVw-up-BXifO6ukMWtJclInoS3LgRm5ZeD8';

// Create and export the Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
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