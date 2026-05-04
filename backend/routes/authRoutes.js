import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Login
router.post('/login', async (req, res) => {
  const { userid, password } = req.body;

  try {
    // 1. Get user email from technicians table
    const { data: tech, error: techError } = await supabase
      .from('technicians')
      .select('email, userid')
      .eq('userid', userid)
      .single();

    if (techError || !tech) {
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    if (!tech.email) {
      return res.status(401).json({ error: 'User does not have an email associated. Please contact support.' });
    }

    // 2. Sign in with Supabase Auth using the resolved email
    // Use anon client for signInWithPassword so we get a regular session
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: tech.email,
      password: password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }

    // Return the session and user data
    res.json({ session: authData.session, user: tech });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { userid, password } = req.body;

  try {
    // 1. Check if userid already exists
    const { data: existingTech } = await supabase
      .from('technicians')
      .select('userid')
      .eq('userid', userid)
      .single();

    if (existingTech) {
      return res.status(400).json({ error: 'User ID already exists' });
    }

    // Generate a dummy email to satisfy Supabase Auth requirement
    const dummyEmail = `${userid.replace(/[^a-zA-Z0-9]/g, '')}@soldocs.internal`;

    // 2. Create user with Supabase Auth Admin (Bypass OTP, auto-confirm)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dummyEmail,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 3. Insert into technicians table
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

  try {
    // 1. Find user in technicians
    const { data: tech } = await supabase
      .from('technicians')
      .select('email')
      .eq('userid', userid)
      .single();

    if (!tech || !tech.email) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Find user in Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    
    if (listError) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const authUser = users.find(u => u.email === tech.email);

    if (!authUser) {
      return res.status(404).json({ error: 'User profile found but authentication record missing.' });
    }

    // 3. Update password via admin API
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
