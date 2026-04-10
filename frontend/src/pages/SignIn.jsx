import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import './SignIn.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Wake up the backend server (Render free tier goes to sleep after inactivity)
const wakeUpBackend = () => {
  fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(30000) })
    .then(() => console.log('✅ Backend is awake'))
    .catch(() => console.warn('⚠️ Backend wake-up ping failed (may still be starting)'));
};

function SignIn({ onLogin }) {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('');  // 'waking' | 'ready' | ''

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 🚀 Immediately wake up the backend (runs in background, parallel to login)
    // This ensures the WCR page server is ready before the user navigates there
    setServerStatus('waking');
    wakeUpBackend();
    setTimeout(() => setServerStatus('ready'), 8000); // optimistically mark ready after 8s

    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('userid', userid)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Invalid User ID or Password.');
        setServerStatus('');
        setLoading(false);
        return;
      }

      onLogin(data);
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setServerStatus('');
      console.error(err);
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-logo">SolDocs</div>
        <h2 className="signin-title">Welcome Back</h2>
        <p className="signin-subtitle">Sign in to your account</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="userid">User ID</label>
            <input
              id="userid"
              type="text"
              className="form-input"
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {serverStatus === 'waking' && (
            <div className="server-status waking">
              <span className="status-dot"></span>
              Connecting to server...
            </div>
          )}
          {serverStatus === 'ready' && (
            <div className="server-status ready">
              <span className="status-dot"></span>
              Server ready ✓
            </div>
          )}
        </form>

        
      </div>
    </div>
  );
}

export default SignIn;
