// Supabase configuration
const supabaseUrl = 'https://wouziwxgidiuygrxxago.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdXppd3hnaWRpdXlncnh4YWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzQzNDAsImV4cCI6MjA3NTExMDM0MH0.esqjsJPZ79s7E9TzAyd8tPlx8fjFtwEgsHZdBataodI';

// Create and export the Supabase client
export const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});