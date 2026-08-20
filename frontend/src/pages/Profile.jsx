import React, { useState, useEffect } from 'react';
import './Profile.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getUser = () => {
  const userStr = sessionStorage.getItem('technician_user');
  return userStr ? JSON.parse(userStr) : null;
};

// Get email stored at login time as a fallback
const getSessionEmail = () => {
  const user = getUser();
  return (user && user.email) ? user.email : '';
};

const Profile = () => {
  const [profile, setProfile] = useState({
    company_name: '',
    company_address: '',
    email: getSessionEmail(),   // seed from login session immediately
    mobile_number: '',
    address: '',
    site_address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = getUser();
        if (!user) return;
        const res = await fetch(`${API_URL}/api/auth/profile/${encodeURIComponent(user.userid)}`);
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setProfile({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          // Use DB email if set; fall back to session email (from signup)
          email: data.email || getSessionEmail(),
          mobile_number: data.mobile_number || '',
          address: data.address || '',
          site_address: data.site_address || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Strip non-numeric characters for mobile number
    if (name === 'mobile_number') {
      value = value.replace(/\D/g, '');
    }

    setProfile(prev => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Validate mobile number: exactly 10 digits
    if (profile.mobile_number && !/^\d{10}$/.test(profile.mobile_number)) {
      setMessage('Error: Mobile Number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    try {
      const user = getUser();
      if (!user) throw new Error('Not logged in');

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: user.userid,
          company_name: profile.company_name,
          company_address: profile.company_address,
          email: profile.email,
          mobile_number: profile.mobile_number
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      setMessage('Profile updated successfully! ');
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage(`Error updating profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>Company Profile</h1>
      </header>

      <div className="profile-card">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h2>Company Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name <span className="required-mark">*</span></label>
                <input
                  type="text"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleChange}
                  placeholder="Enter your registered company name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Address <span className="required-mark">*</span></label>
                <input
                  type="text"
                  name="company_address"
                  value={profile.company_address}
                  onChange={handleChange}
                  placeholder="Official company address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Email <span className="required-mark">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="example@company.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number <span className="required-mark">*</span></label>
                <input
                  type="text"
                  name="mobile_number"
                  value={profile.mobile_number}
                  onChange={handleChange}
                  placeholder="Enter 10-digit mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="\d{10}"
                  required
                />
              </div>
            </div>
          </div>

          {message && <div className={`message-alert ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}

          <div className="profile-actions">
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
