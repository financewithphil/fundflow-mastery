import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency } from '../App';
import { BUSINESS_SETUP_STEPS } from '../data/disputeTemplates';

const STATUS_CYCLE = ['pending', 'in_progress', 'completed'];

const SETUP_COSTS = [
  { name: 'Entity Formation / Shelf Corp', cost: 1000, note: 'Waiters Capital (Minnesota-based)' },
  { name: 'Foreign Filing', cost: 250, note: 'Varies by state' },
  { name: 'EIN Application', cost: 0, note: 'Free via IRS' },
  { name: 'Domain & Email', cost: 25, note: 'GoDaddy (~$25/mo)' },
  { name: 'Business Address', cost: 40, note: 'iPostal1 Prestige (~$39.99/mo)' },
  { name: 'Business Phone', cost: 15, note: 'Call forwarding service' },
  { name: 'Form 1583 Notarization', cost: 25, note: 'Online notarization' },
  { name: 'Business Bank Account', cost: 0, note: 'Free to open' },
  { name: 'Business Website', cost: 50, note: 'Basic site on domain' },
];

export default function BusinessSetup({ navigate, context }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(context?.clientId || '');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initializing, setInitializing] = useState(false);

  // Step notes being edited
  const [editingNotes, setEditingNotes] = useState({});

  const loadClients = useCallback(async () => {
    try {
      const data = await api('/api/clients');
      setClients(Array.isArray(data) ? data : (data.clients || []));
    } catch (err) { setError(err.message); }
  }, []);

  const loadSetup = useCallback(async () => {
    if (!selectedClientId) { setSteps([]); return; }
    setLoading(true);
    try {
      const data = await api(`/api/clients/${selectedClientId}/business-setup`);
      if (data && data.steps) {
        setSteps(data.steps);
      } else if (Array.isArray(data)) {
        setSteps(data);
      } else {
        setSteps([]);
      }
    } catch (_) {
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadSetup(); }, [loadSetup]);
  useEffect(() => { if (context?.clientId) setSelectedClientId(context.clientId); }, [context]);

  const handleInit = async () => {
    if (!selectedClientId) return;
    setInitializing(true);
    setError('');
    try {
      const result = await api(`/api/clients/${selectedClientId}/business-setup/init`, { method: 'POST' });
      if (result.steps) {
        setSteps(result.steps);
      } else {
        // Fallback: use local template
        setSteps(BUSINESS_SETUP_STEPS.map((s, i) => ({ ...s, step_number: i + 1, notes: '' })));
      }
      setSuccess('Business setup initialized successfully.');
    } catch (err) {
      // Fallback: populate from local data
      setSteps(BUSINESS_SETUP_STEPS.map((s, i) => ({ ...s, step_number: i + 1, notes: '' })));
      setSuccess('Loaded default setup steps (backend may be unavailable).');
    } finally {
      setInitializing(false);
    }
  };

  const cycleStatus = async (step) => {
    const currentIdx = STATUS_CYCLE.indexOf(step.status || 'pending');
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    // Optimistic update
    setSteps(prev => prev.map(s =>
      (s.id === step.id || s.step_number === step.step_number)
        ? { ...s, status: nextStatus }
        : s
    ));

    // Persist to backend
    try {
      await api(`/api/clients/${selectedClientId}/business-setup/${step.id || step.step_number}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (_) {
      // Keep optimistic update even if backend fails
    }
  };

  const updateNotes = async (step, notes) => {
    setSteps(prev => prev.map(s =>
      (s.id === step.id || s.step_number === step.step_number)
        ? { ...s, notes }
        : s
    ));

    try {
      await api(`/api/clients/${selectedClientId}/business-setup/${step.id || step.step_number}`, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      });
    } catch (_) { /* silent */ }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length || 9;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const selectedClient = clients.find(c => String(c.id) === String(selectedClientId));

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return 'Pending';
    }
  };

  const getStatusBtnClass = (status) => {
    switch (status) {
      case 'completed': return 'btn btn-sm btn-success';
      case 'in_progress': return 'btn btn-sm' + ' ' + 'btn-secondary';
      default: return 'btn btn-sm btn-secondary';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Setup</h1>
          <p className="page-subtitle">Track entity formation and business infrastructure setup</p>
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
            onChange={(e) => { setSelectedClientId(e.target.value); setSuccess(''); }}
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
          <p>Choose a client to view or initialize their business setup checklist.</p>
        </div>
      ) : loading ? (
        <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading setup...</span></div>
      ) : steps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <h3 style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>No Setup Started</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Initialize the 9-step business setup checklist for {selectedClient?.firstName}.
          </p>
          <button className="btn btn-primary" onClick={handleInit} disabled={initializing}>
            {initializing ? <><div className="spinner" /> Initializing...</> : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Initialize Setup Steps
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">
                Setup Progress
                {selectedClient?.businessName && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — {selectedClient.business_name}</span>}
              </h3>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold)' }}>{progressPct}%</span>
            </div>
            <div className="progress-bar-wrapper">
              <div className="progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="progress-text">{completedCount} of {totalSteps} steps completed</div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 20 }}>
            {steps.map((step, idx) => {
              const stepNum = step.step_number || idx + 1;
              const templateStep = BUSINESS_SETUP_STEPS[idx];
              const name = step.name || templateStep?.name || `Step ${stepNum}`;
              const desc = step.description || templateStep?.description || '';
              const status = step.status || 'pending';

              return (
                <div className="step-item" key={step.id || stepNum}>
                  <div className={`step-number ${status}`}>{stepNum}</div>
                  <div className="step-content">
                    <div className="step-name">{name}</div>
                    <div className="step-desc">{desc}</div>
                    <div className="step-notes">
                      <input
                        className="step-notes-input"
                        placeholder="Add notes..."
                        value={editingNotes[stepNum] !== undefined ? editingNotes[stepNum] : (step.notes || '')}
                        onChange={(e) => setEditingNotes(prev => ({ ...prev, [stepNum]: e.target.value }))}
                        onBlur={() => {
                          if (editingNotes[stepNum] !== undefined) {
                            updateNotes(step, editingNotes[stepNum]);
                            setEditingNotes(prev => { const n = { ...prev }; delete n[stepNum]; return n; });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="step-actions">
                    <span className={`badge badge-${status}`}>{getStatusLabel(status)}</span>
                    <button
                      className={getStatusBtnClass(status)}
                      onClick={() => cycleStatus(step)}
                      title="Click to advance status"
                    >
                      {status === 'pending' && 'Start'}
                      {status === 'in_progress' && 'Complete'}
                      {status === 'completed' && 'Reset'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cost Summary */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Estimated Setup Costs</h3>
            <div className="cost-summary">
              {SETUP_COSTS.map((item, i) => (
                <div className="cost-row" key={i}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{item.note}</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{item.cost === 0 ? 'Free' : formatCurrency(item.cost)}</span>
                </div>
              ))}
              <div className="cost-row total">
                <span>Total Estimated</span>
                <span>{formatCurrency(SETUP_COSTS.reduce((sum, item) => sum + item.cost, 0))}</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Monthly recurring: ~$80/mo (domain hosting + virtual address + phone).
              One-time costs: ~$1,275 (entity + foreign filing + notarization + website).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
