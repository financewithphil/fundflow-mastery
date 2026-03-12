import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency } from '../App';

// ── US States ────────────────────────────────────────────────
const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

// ── Business Setup Step Descriptions (client-facing) ─────────
const STEP_DESCRIPTIONS = {
  'Entity Formation': 'Your business entity is being formed or acquired',
  'Foreign Filing': 'Registering your business in your home state',
  'EIN': 'Your business tax ID number from the IRS',
  'Domain & Email': 'Professional website and email setup',
  'Business Address': 'Virtual business address for official mail',
  'Business Phone': 'Dedicated business phone number',
  'Form 1583': 'USPS mail forwarding authorization — you may need to provide 2 forms of ID',
  'Bank Account': 'Business checking account (Chase and/or Wells Fargo recommended)',
  'Website': 'Professional business website on your domain',
};

// ── Reconsideration Phone Numbers ────────────────────────────
const RECON_PHONES = {
  'Chase': '1-888-609-7805',
  'American Express': '1-800-567-1083',
  'Amex': '1-800-567-1083',
  'US Bank': '1-800-685-7680',
  'Capital One': '1-800-625-7866',
  'Citi': '1-800-695-5171',
  'Citibank': '1-800-695-5171',
  'Bank of America': '1-800-732-9194',
  'Wells Fargo': '1-800-967-9521',
  'Discover': '1-800-347-2683',
  'Barclays': '1-866-408-4064',
};

// ── Score Color Helper ───────────────────────────────────────
function scoreColor(score) {
  if (score >= 740) return 'var(--success)';
  if (score >= 670) return 'var(--warning)';
  return 'var(--danger)';
}

function scoreBg(score) {
  if (score >= 740) return 'var(--success-dim)';
  if (score >= 670) return 'var(--warning-dim)';
  return 'var(--danger-dim)';
}

function capacityColor(count, max = 3) {
  if (count >= max) return 'var(--danger)';
  if (count >= max - 1) return 'var(--warning)';
  return 'var(--success)';
}

// ── Client Login Screen ──────────────────────────────────────
function ClientLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/client-auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.success && data.clientId) {
        sessionStorage.setItem('ffm_client_auth', JSON.stringify({
          clientId: data.clientId,
          name: data.name || 'Client',
        }));
        onLogin(data.clientId, data.name || 'Client');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pin-screen">
      <div className="pin-card" style={{ maxWidth: 440 }}>
        <div className="pin-logo">
          <div className="pin-logo-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1>Fund Flow Mastery</h1>
          <p className="pin-subtitle">Client Portal</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="form-input"
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="form-input"
              required
            />
          </div>
          {error && <div className="pin-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !email || !password} style={{ marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Client Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── My Profile Tab ───────────────────────────────────────────
function ProfileTab({ clientId }) {
  const [profile, setProfile] = useState(null);
  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api(`/api/portal/profile/${clientId}`).catch(() => null),
      api(`/api/portal/business-setup/${clientId}`).catch(() => null),
    ]).then(([profileData, setupData]) => {
      setProfile(profileData);
      setSetup(setupData);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [clientId]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading your profile...</span></div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!profile) return <div className="empty-state"><h3>Profile not found</h3><p>Please contact your team for assistance.</p></div>;

  const bureaus = ['Experian', 'Equifax', 'TransUnion'];
  const creditScoreMap = {
    Experian: profile.creditScoreExperian,
    Equifax: profile.creditScoreEquifax,
    TransUnion: profile.creditScoreTransUnion,
  };
  const inquiryMap = {
    Experian: profile.totalInquiriesExperian,
    Equifax: profile.totalInquiriesEquifax,
    TransUnion: profile.totalInquiriesTransUnion,
  };

  const setupSteps = Array.isArray(setup) ? setup : (setup?.steps || []);
  const completedSteps = setupSteps.filter(s => s.status === 'completed').length;
  const totalSteps = setupSteps.length || 9;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div>
      {/* Credit Scores */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Credit Scores</h3>
        </div>
        <div className="cp-scores-grid">
          {bureaus.map((bureau) => {
            const score = creditScoreMap[bureau] || 0;
            return (
              <div key={bureau} className="credit-score-card">
                <div className="score-ring" style={{ borderColor: scoreColor(score), background: scoreBg(score) }}>
                  <span className="score-ring-value" style={{ color: scoreColor(score) }}>{score || '--'}</span>
                </div>
                <div className="score-bureau-name">{bureau}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inquiry Capacity */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Inquiry Capacity</h3>
        </div>
        <div className="cp-scores-grid">
          {bureaus.map((bureau) => {
            const count = inquiryMap[bureau] || 0;
            const max = 3;
            return (
              <div key={bureau} className="bureau-card">
                <div className="bureau-card-name" style={{ color: `var(--badge-${bureau})` }}>{bureau}</div>
                <div className="bureau-card-count" style={{ color: capacityColor(count, max) }}>{count}</div>
                <div className="bureau-card-max">of {max} max inquiries</div>
                <div className="cp-capacity-bar">
                  <div className="cp-capacity-fill" style={{ width: `${Math.min((count / max) * 100, 100)}%`, background: capacityColor(count, max) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Info */}
      <div className="detail-grid" style={{ marginBottom: 24 }}>
        <div className="detail-section">
          <div className="detail-section-title">Personal Information</div>
          <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{profile.email || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{profile.phone || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{profile.address || '--'}</span></div>
        </div>

        {/* Business Profile */}
        <div className="detail-section">
          <div className="detail-section-title">Business Profile</div>
          <div className="detail-row"><span className="detail-label">Business Name</span><span className="detail-value">{profile.businessName || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Entity Type</span><span className="detail-value">{profile.entityType || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">EIN</span><span className="detail-value">{profile.ein || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">NAICS</span><span className="detail-value">{profile.naicsCode || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{profile.bizState || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Business Address</span><span className="detail-value">{profile.bizAddress || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Domain</span><span className="detail-value">{profile.bizDomain || '--'}</span></div>
          <div className="detail-row"><span className="detail-label">Website</span><span className="detail-value">{profile.bizWebsite || '--'}</span></div>
        </div>
      </div>

      {/* Business Setup Checklist */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Business Setup Checklist</h3>
          <span className="card-subtitle">{completedSteps} of {totalSteps} steps complete</span>
        </div>
        <div className="progress-bar-wrapper" style={{ marginBottom: 20 }}>
          <div className="progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="progress-text" style={{ marginBottom: 16, marginTop: -12 }}>{progressPct}% complete</div>
        {setupSteps.map((step, i) => {
          const statusIcon = step.status === 'completed' ? '\u2713' : step.status === 'in_progress' ? '\u25CF' : '\u25CB';
          const statusClass = step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'in-progress' : '';
          const desc = STEP_DESCRIPTIONS[step.stepName] || STEP_DESCRIPTIONS[step.name] || step.description || '';
          return (
            <div key={i} className="step-item">
              <div className={`step-number ${statusClass}`}>{step.status === 'completed' ? statusIcon : i + 1}</div>
              <div className="step-content">
                <div className="step-name">{step.stepName || step.name}</div>
                <div className="step-desc">{desc}</div>
                {step.notes && <div className="step-desc" style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--text-secondary)' }}>{step.notes}</div>}
              </div>
              <div className="step-actions">
                <span className={`badge badge-${step.status?.replace('_', '-') || 'pending'}`}>{(step.status || 'pending').replace('_', ' ')}</span>
              </div>
            </div>
          );
        })}
        {setupSteps.length === 0 && (
          <div className="empty-state" style={{ padding: 24 }}>
            <p>Your business setup checklist will appear here once your team sets it up.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Funding Plan Tab ─────────────────────────────────────────
function FundingPlanTab({ clientId }) {
  const [plan, setPlan] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api(`/api/portal/funding-plan/${clientId}`).catch(() => null),
      api(`/api/portal/applications/${clientId}`).catch(() => []),
    ]).then(([planData, appData]) => {
      setPlan(planData);
      setApplications(Array.isArray(appData) ? appData : (appData?.applications || []));
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [clientId]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading funding plan...</span></div>;
  if (error) return <div className="error-message">{error}</div>;

  // Group applications
  const planned = applications.filter(a => a.status === 'planned');
  const submitted = applications.filter(a => a.status === 'pending' || a.status === 'submitted');
  const completed = applications.filter(a => a.status === 'approved' || a.status === 'denied');

  // Summary stats
  const approvedApps = applications.filter(a => a.status === 'approved');
  const totalApproved = approvedApps.reduce((sum, a) => sum + (a.approvedAmount || 0), 0);
  const approvalRate = completed.length > 0 ? Math.round((approvedApps.length / completed.length) * 100) : 0;
  const bureauCounts = {};
  applications.forEach(a => { const b = a.bureau || 'Unknown'; bureauCounts[b] = (bureauCounts[b] || 0) + 1; });

  const getReconPhone = (bankName) => {
    if (!bankName) return null;
    for (const [key, phone] of Object.entries(RECON_PHONES)) {
      if (bankName.toLowerCase().includes(key.toLowerCase())) return phone;
    }
    return null;
  };

  return (
    <div>
      {/* Funding Plan Display */}
      {plan && plan.planContent ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Your Funding Plan</h3>
            {plan.status && <span className={`badge badge-${plan.status}`}>{plan.status}</span>}
          </div>
          <div className="plan-content">{plan.planContent}</div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="empty-state" style={{ padding: 24 }}>
            <h3>Funding Plan in Progress</h3>
            <p>Your personalized funding plan is being prepared by your team. Check back soon.</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {applications.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon gold">$</div>
            <div className="stat-info">
              <div className="stat-value">{formatCurrency(totalApproved)}</div>
              <div className="stat-label">Total Approved</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">{approvalRate}%</div>
            <div className="stat-info">
              <div className="stat-value">{approvedApps.length}/{completed.length}</div>
              <div className="stat-label">Approval Rate</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">#</div>
            <div className="stat-info">
              <div className="stat-value">{applications.length}</div>
              <div className="stat-label">Total Applications</div>
            </div>
          </div>
        </div>
      )}

      {/* Bureau Breakdown */}
      {Object.keys(bureauCounts).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(bureauCounts).map(([bureau, count]) => (
            <span key={bureau} className={`badge badge-bureau badge-${bureau}`}>{bureau}: {count}</span>
          ))}
        </div>
      )}

      {/* Application Tracker */}
      <h3 className="form-section-title">Application Tracker</h3>

      {/* Planned */}
      {planned.length > 0 && (
        <div className="app-group">
          <h4 className="app-group-title">Planned</h4>
          <div className="app-cards">
            {planned.map((app, i) => (
              <div key={i} className="app-card">
                <div className="app-card-header">
                  <span className="app-card-bank">{app.bankName || app.bank || 'Unknown'}</span>
                  <span className="badge badge-pending">Planned</span>
                </div>
                <div className="app-card-details">
                  {app.product && <span className="app-card-detail">Product: {app.product}</span>}
                  {app.bureau && <span className={`badge badge-bureau badge-${app.bureau}`}>{app.bureau}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted / Pending */}
      {submitted.length > 0 && (
        <div className="app-group">
          <h4 className="app-group-title">Submitted</h4>
          <div className="app-cards">
            {submitted.map((app, i) => (
              <div key={i} className="app-card app-card-pending">
                <div className="app-card-header">
                  <span className="app-card-bank">{app.bankName || app.bank || 'Unknown'}</span>
                  <span className="badge badge-in-progress">Pending</span>
                </div>
                <div className="app-card-details">
                  {app.product && <span className="app-card-detail">Product: {app.product}</span>}
                  {app.bureau && <span className={`badge badge-bureau badge-${app.bureau}`}>{app.bureau}</span>}
                  {app.dateApplied && <span className="app-card-detail">Submitted: {new Date(app.dateApplied).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="app-group">
          <h4 className="app-group-title">Completed</h4>
          <div className="app-cards">
            {completed.map((app, i) => {
              const isDenied = app.status === 'denied';
              const reconPhone = isDenied ? getReconPhone(app.bankName || app.bank) : null;
              return (
                <div key={i}>
                  <div className={`app-card ${isDenied ? 'app-card-denied' : 'app-card-approved'}`}>
                    <div className="app-card-header">
                      <span className="app-card-bank">{app.bankName || app.bank || 'Unknown'}</span>
                      <span className={`badge badge-${app.status}`}>{app.status}</span>
                    </div>
                    <div className="app-card-details">
                      {app.product && <span className="app-card-detail">Product: {app.product}</span>}
                      {app.bureau && <span className={`badge badge-bureau badge-${app.bureau}`}>{app.bureau}</span>}
                      {app.dateApplied && <span className="app-card-detail">Date: {new Date(app.dateApplied).toLocaleDateString()}</span>}
                      {app.status === 'approved' && app.approvedAmount && (
                        <span className="app-card-detail app-card-amount">Approved: {formatCurrency(app.approvedAmount)}</span>
                      )}
                    </div>
                  </div>
                  {isDenied && (
                    <div className="recon-card">
                      <h4 className="recon-card-title">Reconsideration</h4>
                      {reconPhone && (
                        <div className="recon-phone">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <span>{reconPhone}</span>
                        </div>
                      )}
                      <div className="recon-steps">
                        <ol>
                          <li>Call the reconsideration line within 30 days.</li>
                          <li>Ask why you were denied.</li>
                          <li>Provide additional information if requested.</li>
                          <li>Ask them to reconsider your application.</li>
                        </ol>
                      </div>
                      {app.nextSteps && (
                        <div className="recon-notes">
                          <strong>Recommended Next Steps:</strong>
                          <p>{app.nextSteps}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div className="empty-state" style={{ padding: 32 }}>
          <h3>No Applications Yet</h3>
          <p>Your application tracker will populate as your funding plan progresses.</p>
        </div>
      )}
    </div>
  );
}

// ── Credit Changes Tab ───────────────────────────────────────
function CreditChangesTab({ clientId }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api(`/api/portal/credit-changes/${clientId}`)
      .then((data) => setChanges(Array.isArray(data) ? data : (data.changes || [])))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading credit changes...</span></div>;
  if (error) return <div className="error-message">{error}</div>;

  if (!changes.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">&#128200;</div>
          <h3>No Credit Changes Recorded Yet</h3>
          <p>Your team is monitoring your credit profile. Changes will appear here as they are tracked.</p>
        </div>
      </div>
    );
  }

  // Group by month
  const grouped = {};
  changes.forEach((c) => {
    const d = new Date(c.changeDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(c);
  });

  const sortedKeys = Object.keys(grouped).sort().reverse();

  return (
    <div>
      {sortedKeys.map((key) => (
        <div key={key} style={{ marginBottom: 32 }}>
          <h3 className="form-section-title">{grouped[key].label}</h3>
          <div className="timeline">
            {grouped[key].items.map((change, i) => {
              const delta = (change.newScore || 0) - (change.previousScore || 0);
              const isPositive = delta > 0;
              const isNeutral = delta === 0;
              const arrowColor = isNeutral ? 'var(--text-muted)' : isPositive ? 'var(--success)' : 'var(--danger)';
              const arrowChar = isNeutral ? '--' : isPositive ? '\u2191' : '\u2193';
              return (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" style={{ background: arrowColor }} />
                  <div className="timeline-content">
                    <div className="timeline-date">{new Date(change.changeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="timeline-main">
                      <span className={`badge badge-bureau badge-${change.bureau}`}>{change.bureau}</span>
                      <span className="timeline-score-change">
                        {change.previousScore || '--'} <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>&rarr;</span> {change.newScore || '--'}
                      </span>
                      <span className="timeline-delta" style={{ color: arrowColor }}>
                        {arrowChar} {isNeutral ? '0' : `${isPositive ? '+' : ''}${delta}`}
                      </span>
                    </div>
                    {change.factor && <div className="timeline-factor"><strong>Factor:</strong> {change.factor}</div>}
                    {change.action && <div className="timeline-action"><strong>Action:</strong> {change.action}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bank Locator Tab ─────────────────────────────────────────
function BankLocatorTab() {
  const [state, setState] = useState('');
  const [bureauFilter, setBureauFilter] = useState('All');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!state) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data = await api('/api/bank-locator', {
        method: 'POST',
        body: JSON.stringify({ state, bureauFilter: bureauFilter === 'All' ? undefined : bureauFilter }),
      });
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to search banks');
    } finally {
      setLoading(false);
    }
  };

  // Group results by bureau
  const groupedBanks = {};
  if (results?.banks) {
    results.banks.forEach((bank) => {
      const bureau = bank.bureau || 'Other';
      if (!groupedBanks[bureau]) groupedBanks[bureau] = [];
      groupedBanks[bureau].push(bank);
    });
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Find Banks in Your State</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">State</label>
            <select
              className="form-select state-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">Select a state...</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Bureau Filter</label>
            <select
              className="form-select"
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
            >
              <option value="All">All Bureaus</option>
              <option value="Experian">Experian</option>
              <option value="Equifax">Equifax</option>
              <option value="TransUnion">TransUnion</option>
            </select>
          </div>
          <div className="form-group">
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={!state || loading}
              style={{ marginBottom: 16 }}
            >
              {loading ? 'Searching...' : 'Find Banks'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-container"><div className="spinner spinner-lg" /><span>Searching banks...</span></div>}

      {results && !loading && (
        <>
          {/* Suggested Sequence */}
          {results.sequence && results.sequence.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">Suggested Application Sequence</h3>
              </div>
              <div className="flow-sequence">
                {results.sequence.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="flow-arrow">&rarr;</div>}
                    <div className="flow-step">
                      <div className="flow-step-number">{i + 1}</div>
                      <div className="flow-step-bank">{item.bank || item.name}</div>
                      <div className="flow-step-product">{item.product || ''}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Results Grouped by Bureau */}
          {Object.keys(groupedBanks).length > 0 ? (
            <div className="bank-columns" style={{ gridTemplateColumns: Object.keys(groupedBanks).length >= 3 ? 'repeat(3, 1fr)' : `repeat(${Object.keys(groupedBanks).length}, 1fr)` }}>
              {Object.entries(groupedBanks).map(([bureau, banks]) => (
                <div key={bureau} className="bureau-column">
                  <h3><span className={`badge badge-bureau badge-${bureau}`}>{bureau}</span> ({banks.length})</h3>
                  {banks.map((bank, i) => (
                    <div key={i} className="bank-result-card">
                      <div className="bank-card-name">{bank.name}</div>
                      {bank.products && <div className="bank-card-products">{Array.isArray(bank.products) ? bank.products.join(', ') : bank.products}</div>}
                      {bank.apr && <div className="bank-card-detail"><strong>0% APR:</strong> {bank.apr}</div>}
                      {bank.applicationMethod && <div className="bank-card-detail"><strong>Apply:</strong> {bank.applicationMethod}</div>}
                      <div className="bank-card-tags">
                        {bank.applicationMethod?.toLowerCase().includes('online') && <span className="bank-tag bank-tag-online">Online</span>}
                        {bank.applicationMethod?.toLowerCase().includes('branch') && <span className="bank-tag bank-tag-inperson">In-Branch</span>}
                        {bank.apr && <span className="bank-tag bank-tag-apr">0% APR</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Banks Found</h3>
              <p>No banks matched your search criteria. Try a different state or bureau filter.</p>
            </div>
          )}

          <div className="card" style={{ marginTop: 24, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Visit <a href="https://bankbranchlocator.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)' }}>bankbranchlocator.com</a> to find branch locations near you.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Client Portal Component ─────────────────────────────
export default function ClientPortal({ onSignOut }) {
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Check sessionStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('ffm_client_auth') || 'null');
      if (stored && stored.clientId) {
        setClientId(stored.clientId);
        setClientName(stored.name || 'Client');
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogin = useCallback((id, name) => {
    setClientId(id);
    setClientName(name);
  }, []);

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem('ffm_client_auth');
    setClientId(null);
    setClientName('');
    if (onSignOut) onSignOut();
  }, [onSignOut]);

  // If not logged in, show login
  if (!clientId) {
    return <ClientLogin onLogin={handleLogin} />;
  }

  const TABS = [
    { id: 'profile', label: 'My Profile' },
    { id: 'funding', label: 'Funding Plan' },
    { id: 'credit', label: 'Credit Changes' },
    { id: 'banks', label: 'Bank Locator' },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab clientId={clientId} />;
      case 'funding': return <FundingPlanTab clientId={clientId} />;
      case 'credit': return <CreditChangesTab clientId={clientId} />;
      case 'banks': return <BankLocatorTab />;
      default: return <ProfileTab clientId={clientId} />;
    }
  };

  return (
    <div className="client-portal">
      {/* Header */}
      <header className="client-header">
        <div className="client-header-brand">
          <div className="brand-icon" style={{ width: 36, height: 36 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <span className="brand-name" style={{ fontSize: 16 }}>Fund Flow Mastery</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>Client Portal</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Welcome, <strong style={{ color: 'var(--accent-gold)' }}>{clientName}</strong></span>
          <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="client-welcome">
        <h2>Welcome back, {clientName}</h2>
        <p>Track your business credit journey and funding progress below.</p>
      </div>

      {/* Tabs */}
      <div className="client-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`client-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="client-tab-content">
        {renderTab()}
      </div>
    </div>
  );
}
