// Example production client configuration.
// Use only the publishable/anon key in browser code.
// Keep service-role/secret keys on the server.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Email/password signup:
export async function signUp(email, password, fullName) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
}

// Login:
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

// Logout:
export async function signOut() {
  return supabase.auth.signOut();
}
