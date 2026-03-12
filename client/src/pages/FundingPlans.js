import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency } from '../App';

const PLAN_TYPES = [
  { value: 'credit_optimization', label: 'Credit Optimization', description: 'Focus on inquiry removal and score improvement before funding' },
  { value: 'funding_sequence', label: 'Funding Sequence', description: 'Optimal bank application order to maximize approvals' },
  { value: 'full_plan', label: 'Full Plan (Both)', description: 'Complete credit optimization + funding sequence strategy' },
];

export default function FundingPlans({ navigate, context }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(context?.clientId || '');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [planType, setPlanType] = useState('full_plan');
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // Email generation
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailContent, setEmailContent] = useState(null);
  const [emailType, setEmailType] = useState(null);

  // Tabs
  const [tab, setTab] = useState('generate');

  // View plan detail
  const [viewPlan, setViewPlan] = useState(null);

  const loadClients = useCallback(async () => {
    try {
      const data = await api('/api/clients');
      setClients(Array.isArray(data) ? data : (data.clients || []));
    } catch (err) { setError(err.message); }
  }, []);

  const loadPlans = useCallback(async () => {
    if (!selectedClientId) { setPlans([]); return; }
    setLoading(true);
    try {
      const data = await api(`/api/clients/${selectedClientId}/funding-plans`);
      setPlans(Array.isArray(data) ? data : (data.plans || []));
    } catch (_) { setPlans([]); }
    finally { setLoading(false); }
  }, [selectedClientId]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { if (context?.clientId) setSelectedClientId(context.clientId); }, [context]);

  const selectedClient = clients.find(c => String(c.id) === String(selectedClientId));

  const getInquiryColor = (count) => {
    if (count >= 3) return 'bureau-danger';
    if (count >= 2) return 'bureau-warn';
    return 'bureau-ok';
  };

  const handleGenerate = async () => {
    if (!selectedClientId) { setError('Please select a client.'); return; }
    setGenerating(true);
    setError('');
    setSuccess('');
    setGeneratedPlan(null);

    try {
      const result = await api(`/api/clients/${selectedClientId}/generate-plan`, {
        method: 'POST',
        body: JSON.stringify({ planType }),
      });
      setGeneratedPlan(result);
    } catch (err) {
      setError(err.message || 'Failed to generate plan. Make sure the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!generatedPlan) return;
    setSaving(true);
    setError('');
    try {
      // generate-plan already saved as 'draft' — activate it via PUT
      await api(`/api/funding-plans/${generatedPlan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      setSuccess('Plan saved and activated successfully.');
      setGeneratedPlan(null);
      loadPlans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateEmail = async (type) => {
    if (!selectedClientId) return;
    setGeneratingEmail(true);
    setEmailType(type);
    setEmailContent(null);
    setError('');
    try {
      const endpoint = type === 'onboarding'
        ? `/api/clients/${selectedClientId}/generate-onboarding-summary`
        : `/api/clients/${selectedClientId}/generate-brm-email`;

      const result = await api(endpoint, { method: 'POST' });
      setEmailContent(result);
    } catch (err) {
      setError(err.message || `Failed to generate ${type} email.`);
    } finally {
      setGeneratingEmail(false);
    }
  };

  const planContent = generatedPlan?.planContent || generatedPlan?.plan || generatedPlan?.content || (generatedPlan ? JSON.stringify(generatedPlan, null, 2) : '');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Funding Plans</h1>
          <p className="page-subtitle">AI-generated credit optimization and funding strategies</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Client Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Client</label>
          <select
            className="form-select"
            value={selectedClientId}
            onChange={(e) => { setSelectedClientId(e.target.value); setGeneratedPlan(null); setEmailContent(null); setViewPlan(null); }}
          >
            <option value="">-- Select a client --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.businessName ? ` (${c.businessName})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClientId ? (
        <div className="empty-state">
          <h3>Select a client to continue</h3>
          <p>Choose a client from the dropdown to generate funding plans.</p>
        </div>
      ) : (
        <>
          {/* Bureau Health Summary */}
          {selectedClient && (
            <div className="bureau-health">
              <div className="bureau-card">
                <div className="bureau-card-name" style={{ color: '#60a5fa' }}>Experian</div>
                <div className={`bureau-card-count ${getInquiryColor(selectedClient.totalInquiriesExperian || 0)}`}>
                  {selectedClient.totalInquiriesExperian || 0}
                </div>
                <div className="bureau-card-max">of 3 max inquiries</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Score: {selectedClient.creditScoreExperian || '--'}</div>
              </div>
              <div className="bureau-card">
                <div className="bureau-card-name" style={{ color: '#a855f7' }}>Equifax</div>
                <div className={`bureau-card-count ${getInquiryColor(selectedClient.totalInquiriesEquifax || 0)}`}>
                  {selectedClient.totalInquiriesEquifax || 0}
                </div>
                <div className="bureau-card-max">of 3 max inquiries</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Score: {selectedClient.creditScoreEquifax || '--'}</div>
              </div>
              <div className="bureau-card">
                <div className="bureau-card-name" style={{ color: '#2dd4bf' }}>TransUnion</div>
                <div className={`bureau-card-count ${getInquiryColor(selectedClient.totalInquiriesTransunion || 0)}`}>
                  {selectedClient.totalInquiriesTransunion || 0}
                </div>
                <div className="bureau-card-max">of 3 max inquiries</div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Score: {selectedClient.creditScoreTransunion || '--'}</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => { setTab('generate'); setViewPlan(null); }}>
              Generate Plan
            </button>
            <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); setGeneratedPlan(null); }}>
              Saved Plans ({plans.length})
            </button>
            <button className={`tab ${tab === 'emails' ? 'active' : ''}`} onClick={() => setTab('emails')}>
              Email Templates
            </button>
          </div>

          {tab === 'generate' && (
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Plan Type</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {PLAN_TYPES.map(pt => (
                      <label key={pt.value} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                        background: planType === pt.value ? 'var(--accent-gold-dim)' : 'var(--bg-primary)',
                        border: `1px solid ${planType === pt.value ? 'var(--accent-gold)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', cursor: 'pointer', flex: '1 1 200px',
                        transition: 'all 0.2s ease',
                      }}>
                        <input
                          type="radio"
                          name="planType"
                          value={pt.value}
                          checked={planType === pt.value}
                          onChange={(e) => setPlanType(e.target.value)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{pt.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pt.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                  {generating ? <><div className="spinner" /> Generating Plan...</> : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                      Generate Plan
                    </>
                  )}
                </button>
              </div>

              {generatedPlan && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Generated {PLAN_TYPES.find(p => p.value === planType)?.label || 'Plan'}</h3>
                    <div className="btn-group">
                      <button className="btn btn-primary btn-sm" onClick={handleSavePlan} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Plan'}
                      </button>
                    </div>
                  </div>
                  <div className="plan-content">{planContent}</div>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="card">
              {loading ? (
                <div className="loading-container"><div className="spinner spinner-lg" /></div>
              ) : plans.length === 0 ? (
                <div className="empty-state">
                  <h3>No saved plans</h3>
                  <p>Generate and save a plan for {selectedClient?.firstName}.</p>
                </div>
              ) : viewPlan ? (
                <div>
                  <div className="card-header">
                    <h3 className="card-title">{viewPlan.planType || viewPlan.type} Plan</h3>
                    <div className="btn-group">
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewPlan(null)}>Back to List</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span className={`badge badge-${viewPlan.status}`}>{viewPlan.status}</span>
                    {viewPlan.createdAt && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(viewPlan.createdAt).toLocaleDateString()}</span>}
                  </div>
                  <div className="plan-content">{viewPlan.planContent || viewPlan.content || viewPlan.plan || 'No content.'}</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table table-clickable">
                    <thead>
                      <tr><th>Type</th><th>Status</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {plans.map(p => (
                        <tr key={p.id} onClick={() => setViewPlan(p)}>
                          <td style={{ fontWeight: 600 }}>{p.planType || p.type}</td>
                          <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                          <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'emails' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Onboarding Summary</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Generate a welcome email summarizing the client's profile and next steps.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleGenerateEmail('onboarding')}
                    disabled={generatingEmail}
                  >
                    {generatingEmail && emailType === 'onboarding' ? <><div className="spinner" /> Generating...</> : 'Generate Onboarding Email'}
                  </button>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">BRM Introduction</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Generate a Business Relationship Manager introduction email with sweet numbers.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleGenerateEmail('brm')}
                    disabled={generatingEmail}
                  >
                    {generatingEmail && emailType === 'brm' ? <><div className="spinner" /> Generating...</> : 'Generate BRM Email'}
                  </button>
                </div>
              </div>

              {emailContent && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      {emailType === 'onboarding' ? 'Onboarding Summary Email' : 'BRM Introduction Email'}
                    </h3>
                  </div>
                  <div className="plan-content">
                    {emailContent.subject && <div style={{ marginBottom: 12, fontWeight: 600 }}>Subject: {emailContent.subject}</div>}
                    {emailContent.content || emailContent.email || emailContent.body || JSON.stringify(emailContent, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
