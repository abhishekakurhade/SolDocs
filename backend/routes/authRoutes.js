import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const router = express.Router();

// Log env var status at startup to help debug production issues
console.log('[AUTH] Env check:',
  'SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING',
  '| SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ SET' : '❌ MISSING',
  '| SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING'
);

// Cached client instances — created once after env vars are loaded
let _supabase = null;
let _supabaseAnon = null;
const getSupabase = () => {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _supabase;
};
const getSupabaseAnon = () => {
  if (!_supabaseAnon) _supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  return _supabaseAnon;
};

// Ping endpoint — lets the frontend warm up the backend before login
router.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});

// Login
router.post('/login', async (req, res) => {
  const { userid, password } = req.body;
  const supabaseAnon = getSupabaseAnon();

  try {
    console.log(`[LOGIN] Attempting login for userid: ${userid}`);

    // Derive the internal email directly — same formula used at signup.
    // This avoids a DB round-trip just to look up the email.
    const internalEmail = `${userid.replace(/[^a-zA-Z0-9]/g, '')}@soldocs.internal`;

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: internalEmail,
      password: password
    });

    if (authError) {
      console.log(`[LOGIN] Supabase auth failed for userid: ${userid} — ${authError.message}`);
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    console.log(`[LOGIN] Login successful for userid: ${userid}`);
    res.json({ session: authData.session, user: { userid } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { userid, password } = req.body;
  const supabase = getSupabase();

  try {
    const { data: existingTech } = await supabase
      .from('technicians')
      .select('userid')
      .eq('userid', userid)
      .single();

    if (existingTech) {
      return res.status(400).json({ error: 'User ID already exists' });
    }

    // Supabase Auth requires an email internally — we derive one from the userid.
    // It is never shown to the user and not stored in the technicians table.
    const internalEmail = `${userid.replace(/[^a-zA-Z0-9]/g, '')}@soldocs.internal`;

    const { error: authError } = await supabase.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { error: insertError } = await supabase
      .from('technicians')
      .insert([{ userid }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    res.json({ message: 'Signup successful.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { userid, newPassword } = req.body;
  const supabase = getSupabase();

  try {
    // Derive the internal email — no DB lookup needed
    const internalEmail = `${userid.replace(/[^a-zA-Z0-9]/g, '')}@soldocs.internal`;

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const authUser = users.find(u => u.email === internalEmail);

    if (!authUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Profile — fetches technician profile using service key
router.get('/profile/:userid', async (req, res) => {
  const { userid } = req.params;
  if (!userid) {
    return res.status(400).json({ error: 'userid is required' });
  }

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('userid', userid)
      .single();

    if (error) {
      console.error('[PROFILE GET] Supabase error:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch profile' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('[PROFILE GET] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile — uses service key to bypass RLS so the update always works
router.put('/profile', async (req, res) => {
  const { userid, company_name, company_address, email, mobile_number, company_logo } = req.body;
  if (!userid) {
    return res.status(400).json({ error: 'userid is required' });
  }

  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('technicians')
      .update({ company_name, company_address, email, mobile_number, company_logo })
      .eq('userid', userid);

    if (error) {
      console.error('[PROFILE UPDATE] Supabase error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[PROFILE UPDATE] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
