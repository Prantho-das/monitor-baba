import { createClient } from '@supabase/supabase-js';

// Fallback to valid-format placeholders during build time to prevent build-time pre-rendering crashes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Create server client using authorization header token
export const createServerClient = (req?: Request) => {
  let token = '';

  if (req) {
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // If token is present, instantiate client on behalf of the user
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });
  }

  // Fallback to anonymous client
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
};

// Admin client with service role for background scripts & cron
export const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
