import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import WCRForm from './components/WCRForm';
import SignIn from './pages/SignIn';
import './App.css';

import { supabase } from './services/supabaseClient';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('technician_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Initialize session on startup
  React.useEffect(() => {
    const initSession = async () => {
      const savedSession = sessionStorage.getItem('supabase_session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        await supabase.auth.setSession(session);
      }
    };
    initSession();
  }, []);

  const handleLogin = async (userData, session) => {
    sessionStorage.setItem('technician_user', JSON.stringify(userData));
    if (session) {
      sessionStorage.setItem('supabase_session', JSON.stringify(session));
      await supabase.auth.setSession(session);
    }
    setUser(userData);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('technician_user');
    sessionStorage.removeItem('supabase_session');
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) {
    return <SignIn onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout onLogout={handleLogout} />}>
          <Route index element={<Dashboard />} />
          <Route path="form" element={<WCRForm />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
