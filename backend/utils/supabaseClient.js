import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Initialize Supabase Client
// We prefer SUPABASE_SERVICE_KEY (service role) for backend operations so that
// Row Level Security does NOT block Storage uploads from the server.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Supabase credentials missing in Production environment.');
  }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
