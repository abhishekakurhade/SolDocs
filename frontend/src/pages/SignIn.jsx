import React, { useState, useEffect } from 'react';
import './SignIn.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SignIn({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'otp'
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Ping the backend as soon as the login page loads so it wakes up from sleep
  // (Render free tier spins down after inactivity — this hides the cold-start delay)
  useEffect(() => {
    fetch(`${API_URL}/api/auth/ping`).catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.user, data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, newPassword: password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setMessage('Password reset successful. Please login.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Automatically log the user in
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password })
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        onLogin(loginData.user);
      } else {
        setMessage('Signup successful. Please login.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <main className="auth-main">
        <div className="auth-container">

          <div className="auth-header">
            <div className="top-bar-logo" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <h1 className="brand-logo-text" style={{ fontSize: '3rem', margin: 0, color: '#E87F24', fontFamily: '"ChailceNoggin", sans-serif', fontWeight: 'normal', letterSpacing: '0.05em' }}>SolDocs</h1>
            </div>
          </div>

          <div className="glass-panel auth-card">

            {mode !== 'otp' && (
              <div className="auth-toggle">
                <button
                  className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Login
                </button>
                <button
                  className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => setMode('signup')}
                  type="button"
                >
                  Sign Up
                </button>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="input-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      value={userid}
                      onChange={(e) => setUserid(e.target.value)}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '-0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    style={{ fontSize: '0.75rem', color: '#E87F24', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="primary-gradient-btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="auth-form">
                <div className="input-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      value={userid}
                      onChange={(e) => setUserid(e.target.value)}
                      placeholder="Enter Company Name"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="password-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button type="submit" className="primary-gradient-btn" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="input-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <input 
                      type="text" 
                      value={userid} 
                      onChange={(e) => setUserid(e.target.value)} 
                      placeholder="Enter your company name" 
                      required 
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="password-input"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      required 
                    />
                    <button 
                      type="button" 
                      className="toggle-password-btn" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="password-input"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="••••••••" 
                      required 
                    />
                    <button 
                      type="button" 
                      className="toggle-password-btn" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button type="submit" className="primary-gradient-btn" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button type="button" className="text-btn" onClick={() => setMode('login')} style={{ marginTop: '1rem' }}>
                  Back to Login
                </button>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default SignIn;
