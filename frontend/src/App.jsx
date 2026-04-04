import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import WCRForm from './components/WCRForm';
import SignIn from './pages/SignIn';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('technician_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    sessionStorage.setItem('technician_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('technician_user');
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
