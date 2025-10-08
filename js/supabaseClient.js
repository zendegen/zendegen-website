// Supabase configuration
// Waitlist-specific Supabase project
const supabaseUrl = 'https://qedzitbrwwrxatmpfsvy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZHppdGJyd3dyeGF0bXBmc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODIyMjEsImV4cCI6MjA3NTQ1ODIyMX0.TSERAKByXVw-up-BXifO6ukMWtJclInoS3LgRm5ZeD8';

// Create and export the Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});