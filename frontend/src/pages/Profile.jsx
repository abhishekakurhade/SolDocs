import React, { useState, useEffect } from 'react';
import './Profile.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getUser = () => {
  const userStr = sessionStorage.getItem('technician_user');
  return userStr ? JSON.parse(userStr) : null;
};

const Profile = () => {
  const [profile, setProfile] = useState({
    company_name: '',
    company_address: '',
    email: '',
    mobile_number: '',
    address: '',
    site_address: '',
    logo: ''
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
          email: data.email || '',
          mobile_number: data.mobile_number || '',
          address: data.address || '',
          site_address: data.site_address || '',
          logo: data.company_logo || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setProfile(prev => ({ ...prev, logo: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
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
          mobile_number: profile.mobile_number,
          company_logo: profile.logo
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
            <div className="form-section">
              <h2> Company Logo</h2>
              <div className="logo-upload-area">
                <div className="logo-preview">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Company Logo" className="logo-img" />
                  ) : (
                    <div className="no-logo">No Logo Uploaded</div>
                  )}
                </div>
                <div className="upload-controls">
                  <input
                    type="file"
                    id="logo-input"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    hidden
                  />
                  <div className="logo-btns">
                    <label htmlFor="logo-input" className="upload-btn">
                      Upload Logo
                    </label>
                    {profile.logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="remove-logo-btn"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="upload-hint">Recommended: Square PNG or JPG, Max 2MB</p>
                </div>
              </div>
            </div>

            <h2>Company Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleChange}
                  placeholder="Enter your registered company name"
                />
              </div>
              <div className="form-group">
                <label>Company Address</label>
                <input
                  type="text"
                  name="company_address"
                  value={profile.company_address}
                  onChange={handleChange}
                  placeholder="Official company address"
                />
              </div>
              <div className="form-group">
                <label>Company Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="example@company.com"
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="text"
                  name="mobile_number"
                  value={profile.mobile_number}
                  onChange={handleChange}
                  placeholder="Official mobile contact"
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
