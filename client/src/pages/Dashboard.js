import React, { useState, useEffect } from 'react';
import { api, formatCurrency } from '../App';

export default function Dashboard({ navigate }) {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, activityData] = await Promise.all([
        api('/api/dashboard/stats').catch(() => null),
        api('/api/dashboard/activity').catch(() => null),
      ]);

      if (statsData) {
        setStats(statsData);
      } else {
        // Fallback: load clients and compute stats manually
        const clients = await api('/api/clients').catch(() => []);
        const clientList = Array.isArray(clients) ? clients : (clients.clients || []);
        const disputes = await api('/api/disputes').catch(() => []);
        const disputeList = Array.isArray(disputes) ? disputes : (disputes.disputes || []);

        setStats({
          totalClients: clientList.length,
          activeDisputes: disputeList.filter(d => d.status !== 'completed' && d.status !== 'denied').length,
          totalApprovedFunding: 0,
          pendingApplications: 0,
        });
      }

      if (activityData && Array.isArray(activityData)) {
        setRecentActivity(activityData);
      } else if (activityData && activityData.activity) {
        setRecentActivity(activityData.activity);
      }
    } catch (err) {
      setError(err.message);
      setStats({ totalClients: 0, activeDisputes: 0, totalApprovedFunding: 0, pendingApplications: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  const s = stats || { totalClients: 0, activeDisputes: 0, totalApprovedFunding: 0, pendingApplications: 0 };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome to Fund Flow Mastery</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{s.totalClients}</div>
            <div className="stat-label">Total Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{s.activeDisputes}</div>
            <div className="stat-label">Active Disputes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(s.totalApprovedFunding)}</div>
            <div className="stat-label">Approved Funding</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{s.pendingApplications || 0}</div>
            <div className="stat-label">Pending Applications</div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="btn-group" style={{ flexDirection: 'column' }}>
            <button className="btn btn-primary" onClick={() => navigate('clients', { action: 'new' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Client
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('disputes')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Generate Dispute Letter
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('funding')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Create Funding Plan
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('banks')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /></svg>
              Explore Banks
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('business')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              Business Setup
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="empty-state">
              <p>No recent activity. Start by adding a client.</p>
            </div>
          ) : (
            <ul className="activity-list">
              {recentActivity.slice(0, 8).map((item, i) => (
                <li key={i} className="activity-item">
                  <div className={`activity-dot ${item.type === 'dispute' ? 'blue' : item.type === 'funding' ? 'green' : 'gold'}`} />
                  <div>
                    <div className="activity-text">{item.description || item.text || item.message}</div>
                    <div className="activity-time">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.time || ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
