import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileWord, faSearch } from '@fortawesome/free-solid-svg-icons';
import './History.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getUser = () => {
  const userStr = sessionStorage.getItem('technician_user');
  return userStr ? JSON.parse(userStr) : null;
};

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user = getUser();
        if (!user) return;
        const { data, error } = await supabase.from('reports').select('*').eq('technician_id', user.userid).order('timestamp', { ascending: false });
        if (error) {
          console.error('Error fetching history:', error);
        } else if (data) {
          setHistory(data);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="loading">Loading history...</div>;

  const filteredHistory = history.filter((entry) => {
    const query = searchQuery.toLowerCase();
    const customerName = (entry.customer_name || '').toLowerCase();
    const consumerNumber = (entry.consumer_number || '').toLowerCase();
    const mobileNumber = (entry.customer_mobile || '').toLowerCase();
    return (
      customerName.includes(query) ||
      consumerNumber.includes(query) ||
      mobileNumber.includes(query)
    );
  });

  return (
    <div className="history-page">
      <header className="page-header">
        <div className="header-top">
          <h1>History</h1>
        </div>
        <div className="search-container">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer name, consumer no, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Customer Details</th>
              <th className="format-header">Format</th>
              <th className="filename-header">Filename</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((entry) => (
                <tr key={entry.id}>
                  <td className="time-cell">
                    {new Date(entry.timestamp).toLocaleDateString()}
                    <span className="time-sub">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="customer-cell">
                    <strong>{entry.customer_name}</strong>
                    <div className="customer-subdetail">Mobile : {entry.customer_mobile || 'N/A'}</div>
                    <div className="customer-subdetail">Aadhar :  {entry.aadhar_number || 'N/A'}</div>
                    <div className="customer-subdetail">Consumer : {entry.consumer_number || 'N/A'}</div>
                  </td>
                  <td className="format-cell">
                    <span className={`format-badge ${entry.type.toLowerCase()}`}>{entry.type}</span>
                  </td>
                  <td className="filename-cell">{entry.filename}</td>
                  <td>
                    <div className="action-buttons">
                      {entry.word_url ? (
                        <a
                          href={`${API_URL}${entry.word_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-link docx"
                          title="View Word"
                        >
                          <FontAwesomeIcon icon={faFileWord} /> <span className="btn-text">DOCX</span>
                        </a>
                      ) : <span className="no-view">N/A</span>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-history">No documents have been generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default History;
