import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faHome, faHistory, faUser, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../services/supabaseClient';
import './Layout.css';

const getUser = () => {
  const userStr = sessionStorage.getItem('technician_user');
  return userStr ? JSON.parse(userStr) : null;
};

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 768);
  const [profile, setProfile] = useState(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarCollapsed(true);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = getUser();
        if (!user) return;
        const { data, error } = await supabase.from('technicians').select('*').eq('userid', user.userid).single();
        if (data && !error) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile in Layout:', err);
      }
    };
    fetchProfile();

    // Refresh logo interval if changed on another tab
    const interval = setInterval(fetchProfile, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
        ></div>
      )}

      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}>
          {!isSidebarCollapsed ? (
            <h1 className="brand-logo-text-sidebar">SolDocs</h1>
          ) : (
            <h1 className="brand-logo-mini">S</h1>
          )}
          <button className="toggle-btn" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <FontAwesomeIcon icon={isSidebarCollapsed ? faBars : faTimes} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FontAwesomeIcon icon={faHome} className="icon" />
            {!isSidebarCollapsed && <span className="label">Dashboard</span>}
          </NavLink>
          <NavLink to="/form" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FontAwesomeIcon icon={faFileAlt} className="icon" />
            {!isSidebarCollapsed && <span className="label">WCR Form</span>}
          </NavLink>
          <NavLink to="/history" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FontAwesomeIcon icon={faHistory} className="icon" />
            {!isSidebarCollapsed && <span className="label">History</span>}
          </NavLink>
          <NavLink to="/profile" onClick={handleNavClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FontAwesomeIcon icon={faUser} className="icon" />
            {!isSidebarCollapsed && <span className="label">Profile</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          {/* {!isSidebarCollapsed && <div className="version">v2.0.0</div>} */}
        </div>
      </aside>
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>
        <header className="top-bar">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <FontAwesomeIcon icon={faBars} />
          </button>

          <div className="top-bar-logo">
            <h1 className="brand-logo-text">SolDocs</h1>
          </div>

          <div className="top-bar-right">
            {profile?.company_logo && (
              <img src={profile.company_logo} alt="Company Logo" className="navbar-company-logo" />
            )}
          </div>
        </header>
        <div className="content-scroll-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
