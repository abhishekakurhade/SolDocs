import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import './SignIn.css';

function SignIn({ onLogin }) {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('userid', userid)
        .eq('password', password)
        .single();

      if (error || !data) {
        setError('Invalid User ID or Password.');
        setLoading(false);
        return;
      }

      onLogin(data);
    } catch (err) {
      setError('An error occurred during login. Please try again.');
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
        </form>

        
      </div>
    </div>
  );
}

export default SignIn;
