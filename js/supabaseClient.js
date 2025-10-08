// Supabase configuration
// Waitlist-specific Supabase project
const supabaseUrl = 'https://qedzitbrwwrxatmpfsvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHppdGJyd3dyeGF0bXBmc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODIyMjEsImV4cCI6MjA3NTQ1ODIyMX0.TSERAKByXVw-up-BXifO6ukMWtJclInoS3LgRm5ZeD8';

// Create and export the Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email);
  
  if (event === 'SIGNED_IN' && session?.user) {
    // Send success message to opener if we're in a popup
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth-success',
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email
      }, 'https://zendegen.app');
      
      // Close popup after a brief delay
      setTimeout(() => window.close(), 500);
    }
  }
});