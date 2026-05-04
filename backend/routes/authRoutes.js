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

// Lazy initialization — avoids crash if env vars load after module import
const getSupabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const getSupabaseAnon = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Login
router.post('/login', async (req, res) => {
  const { userid, password } = req.body;
  const supabase = getSupabase();
  const supabaseAnon = getSupabaseAnon();

  try {
    console.log(`[LOGIN] Attempting login for userid: ${userid}`);

    const { data: tech, error: techError } = await supabase
      .from('technicians')
      .select('email, userid')
      .eq('userid', userid)
      .single();

    if (techError || !tech) {
      console.log(`[LOGIN] User not found in technicians table. userid: ${userid}, error: ${techError?.message}`);
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    console.log(`[LOGIN] Found user in technicians. email: ${tech.email}`);

    if (!tech.email) {
      console.log(`[LOGIN] User has no email. userid: ${userid}`);
      return res.status(401).json({ error: 'User does not have an email associated. Please contact support.' });
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: tech.email,
      password: password
    });

    if (authError) {
      console.log(`[LOGIN] Supabase auth failed for ${tech.email}: ${authError.message}`);
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    console.log(`[LOGIN] Login successful for userid: ${userid}`);
    res.json({ session: authData.session, user: tech });
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

    const dummyEmail = `${userid.replace(/[^a-zA-Z0-9]/g, '')}@soldocs.internal`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { error: insertError } = await supabase
      .from('technicians')
      .insert([
        { userid, email: dummyEmail, password: 'encrypted_in_auth' }
      ]);

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
    const { data: tech } = await supabase
      .from('technicians')
      .select('email')
      .eq('userid', userid)
      .single();

    if (!tech || !tech.email) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const authUser = users.find(u => u.email === tech.email);

    if (!authUser) {
      return res.status(404).json({ error: 'User profile found but authentication record missing.' });
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

export default router;
