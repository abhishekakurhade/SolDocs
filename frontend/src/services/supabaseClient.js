import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase env vars missing! REACT_APP_SUPABASE_URL:', supabaseUrl, '| REACT_APP_SUPABASE_ANON_KEY:', supabaseKey ? '[SET]' : '[MISSING]');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);
