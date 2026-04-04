import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileWord, faCopy } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../services/supabaseClient';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getUser = () => {
  const userStr = sessionStorage.getItem('technician_user');
  return userStr ? JSON.parse(userStr) : null;
};

const Dashboard = () => {
  const [stats, setStats] = useState({ total_docs: 0, total_docx: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = getUser();
        if (!user) return;
        const { data, error } = await supabase.from('reports').select('*').eq('technician_id', user.userid).order('timestamp', { ascending: false });
        
        if (error) {
          throw error;
        }

        if (data) {
          setStats({
            total_docs: data.length,
            total_docx: data.filter(h => h.type === 'DOCX').length,
            recent: data.slice(0, 5)
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon docs">
            <FontAwesomeIcon icon={faCopy} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total_docs}</span>
            <span className="stat-label">Total Generated</span>
          </div>
        </div>
      </div>

      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {stats.recent && stats.recent.length > 0 ? (
            stats.recent.map((doc, index) => (
              <div className="activity-item" key={doc.id || index}>
                <div className={`activity-type-icon ${doc.type?.toLowerCase()}`}>
                  {doc.type}
                </div>
                <div className="activity-main">
                  <div className="activity-text-info">
                    <span className="activity-name">{doc.customer_name || 'Unknown'}</span>
                    <span className="activity-date">
                      {new Date(doc.timestamp).toLocaleDateString()} at {new Date(doc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="activity-actions">
                    {doc.word_url && (
                      <a 
                        href={`${API_URL}${doc.word_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-download docx"
                        title="View Word"
                      >
                        <FontAwesomeIcon icon={faFileWord} /> <span className="btn-text">DOCX</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">No recent activity detected</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
