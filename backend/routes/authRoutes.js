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
  let { userid, password } = req.body;
  if (userid) userid = userid.trim();
  const supabase = getSupabase();
  const supabaseAnon = getSupabaseAnon();

  try {
    console.log(`[LOGIN] Attempting login for userid: ${userid}`);

    // Look up the user's actual email from the technicians table
    const { data: techData, error: lookupError } = await supabase
      .from('technicians')
      .select('email')
      .ilike('userid', userid)
      .maybeSingle();

    if (lookupError || !techData) {
      console.log(`[LOGIN] User not found in technicians table: ${userid}`);
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    const loginEmail = techData.email;

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: loginEmail,
      password: password
    });

    if (authError) {
      console.log(`[LOGIN] Supabase auth failed for userid: ${userid} — ${authError.message}`);
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    console.log(`[LOGIN] Login successful for userid: ${userid}`);
    // Return email too — already fetched from DB, useful for profile pre-fill
    const userEmail = loginEmail && loginEmail.endsWith('@soldocs.internal') ? '' : loginEmail;
    res.json({ session: authData.session, user: { userid, email: userEmail } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  let { userid, email, password } = req.body;
  if (userid) userid = userid.trim();
  if (email) email = email.trim().toLowerCase();
  const supabase = getSupabase();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Case-insensitive check in the technicians table
    const { data: existingTech } = await supabase
      .from('technicians')
      .select('userid')
      .ilike('userid', userid)
      .maybeSingle();

    if (existingTech) {
      return res.status(400).json({ error: 'User ID already exists' });
    }

    // 2. Check if email is already used
    const { data: existingEmail } = await supabase
      .from('technicians')
      .select('userid')
      .ilike('email', email)
      .maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 3. Attempt to create the Auth user with the real email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      // ROOT FIX: If user exists in Auth but not in our table, finish the creation
      if (authError.message.includes('already been registered')) {
        console.log(`[SIGNUP] Found ghost user ${email}, repairing record...`);
        
        const { error: repairError } = await supabase
          .from('technicians')
          .insert([{ userid, email, password: '[SUPABASE_AUTH_ACTIVE]' }]);

        if (!repairError) {
          return res.json({ message: 'Signup successful (account recovered).' });
        }
      }
      return res.status(400).json({ error: authError.message });
    }

    // 4. Create the technician record — use upsert so email always gets saved
    console.log(`[SIGNUP] Inserting technician record: userid=${userid}, email=${email}`);
    const { data: insertedData, error: insertError } = await supabase
      .from('technicians')
      .upsert([{ userid, email, password: '[SUPABASE_AUTH_ACTIVE]' }], { onConflict: 'userid' })
      .select();

    if (insertError) {
      console.error('[SIGNUP] Insert/upsert error:', JSON.stringify(insertError));
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    console.log(`[SIGNUP] Technician record saved:`, JSON.stringify(insertedData));
    res.json({ message: 'Signup successful.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  let { userid, newPassword } = req.body;
  if (userid) userid = userid.trim();
  const supabase = getSupabase();

  try {
    // Look up the user's real email from the technicians table
    const { data: techData, error: lookupError } = await supabase
      .from('technicians')
      .select('email')
      .ilike('userid', userid)
      .maybeSingle();

    if (lookupError || !techData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const authUser = users.find(u => u.email === techData.email);

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
  let { userid } = req.params;
  if (userid) userid = userid.trim();
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

    // Hide the internal dummy email from the user if they haven't updated it yet
    if (data.email && data.email.endsWith('@soldocs.internal')) {
      data.email = '';
    }

    res.json(data);
  } catch (error) {
    console.error('[PROFILE GET] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Profile — uses service key to bypass RLS so the update always works
router.put('/profile', async (req, res) => {
  let { userid, company_name, company_address, email, mobile_number, company_logo } = req.body;
  if (userid) userid = userid.trim();
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
