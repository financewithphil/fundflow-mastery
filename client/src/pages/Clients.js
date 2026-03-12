import React, { useState, useEffect, useCallback } from 'react';
import { api, formatCurrency } from '../App';

const EMPTY_CLIENT = {
  first_name: '', last_name: '', email: '', phone: '', address: '', city: '', state: '', zip: '',
  ssn_last4: '', dob: '',
  credit_score_experian: '', credit_score_equifax: '', credit_score_transunion: '',
  inquiries_experian: 0, inquiries_equifax: 0, inquiries_transunion: 0,
  business_name: '', entity_type: '', ein: '', naics_code: '', annual_revenue: '',
  business_state: '', business_address: '', business_city: '', business_zip: '',
  notes: '',
};

export default function Clients({ navigate, context }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Views: list, detail, form
  const [view, setView] = useState('list');
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_CLIENT });
  const [formMode, setFormMode] = useState('add'); // add | edit
  const [saving, setSaving] = useState(false);

  // Detail sub-data
  const [clientDisputes, setClientDisputes] = useState([]);
  const [clientPlans, setClientPlans] = useState([]);
  const [clientSetup, setClientSetup] = useState(null);

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/clients');
      const list = Array.isArray(data) ? data : (data.clients || []);
      setClients(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (context?.action === 'new') {
      openForm('add');
    }
  }, [context]);

  const openForm = (mode, client = null) => {
    setFormMode(mode);
    setFormData(client ? { ...EMPTY_CLIENT, ...client } : { ...EMPTY_CLIENT });
    setView('form');
    setError('');
  };

  const openDetail = async (client) => {
    setSelectedClient(client);
    setView('detail');
    setError('');

    // Load related data
    try {
      const [disputes, plans, setup] = await Promise.all([
        api(`/api/clients/${client.id}/disputes`).catch(() => []),
        api(`/api/clients/${client.id}/plans`).catch(() => []),
        api(`/api/clients/${client.id}/business-setup`).catch(() => null),
      ]);
      setClientDisputes(Array.isArray(disputes) ? disputes : (disputes.disputes || []));
      setClientPlans(Array.isArray(plans) ? plans : (plans.plans || []));
      setClientSetup(setup);
    } catch (_) { /* non-critical */ }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (formMode === 'add') {
        await api('/api/clients', { method: 'POST', body: JSON.stringify(formData) });
      } else {
        await api(`/api/clients/${formData.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      }
      await loadClients();
      setView('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/api/clients/${id}`, { method: 'DELETE' });
      setDeleteModal(null);
      setView('list');
      await loadClients();
    } catch (err) {
      setError(err.message);
    }
  };

  const onChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.business_name || '').toLowerCase().includes(q)
    );
  });

  // ── LIST VIEW ──────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Clients</h1>
            <p className="page-subtitle">{clients.length} total clients</p>
          </div>
          <button className="btn btn-primary" onClick={() => openForm('add')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Client
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="Search by name, email, or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading clients...</span></div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <h3>{search ? 'No matching clients' : 'No clients yet'}</h3>
            <p>{search ? 'Try a different search term.' : 'Add your first client to get started.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Business</th>
                  <th>Credit Scores</th>
                  <th>Inquiries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} onClick={() => openDetail(c)}>
                    <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.email}</td>
                    <td>{c.business_name || <span style={{ color: 'var(--text-muted)' }}>--</span>}</td>
                    <td>
                      <span style={{ color: 'var(--info)' }}>{c.credit_score_experian || '--'}</span>
                      {' / '}
                      <span style={{ color: '#a855f7' }}>{c.credit_score_equifax || '--'}</span>
                      {' / '}
                      <span style={{ color: '#2dd4bf' }}>{c.credit_score_transunion || '--'}</span>
                    </td>
                    <td>
                      {(c.inquiries_experian || 0) + (c.inquiries_equifax || 0) + (c.inquiries_transunion || 0)} total
                    </td>
                    <td>
                      <div className="btn-group" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openForm('edit', c)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteModal(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3 className="modal-title">Confirm Delete</h3>
                <button className="modal-close" onClick={() => setDeleteModal(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <p className="confirm-text">
                  Are you sure you want to delete <span className="confirm-name">{deleteModal.first_name} {deleteModal.last_name}</span>?
                  This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deleteModal.id)}>Delete Client</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────
  if (view === 'form') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">{formMode === 'add' ? 'New Client' : 'Edit Client'}</h1>
          </div>
          <button className="btn btn-secondary" onClick={() => setView('list')}>Back to List</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="card">
            {/* Personal Info */}
            <div className="form-section-title">Personal Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" required value={formData.first_name} onChange={onChange('first_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" required value={formData.last_name} onChange={onChange('last_name')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={formData.email} onChange={onChange('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={formData.phone} onChange={onChange('phone')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={formData.address} onChange={onChange('address')} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={formData.city} onChange={onChange('city')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={formData.state} onChange={onChange('state')} maxLength={2} />
              </div>
              <div className="form-group">
                <label className="form-label">ZIP</label>
                <input className="form-input" value={formData.zip} onChange={onChange('zip')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SSN Last 4</label>
                <input className="form-input" value={formData.ssn_last4} onChange={onChange('ssn_last4')} maxLength={4} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" value={formData.dob} onChange={onChange('dob')} />
              </div>
            </div>

            {/* Credit Scores */}
            <div className="form-section-title">Credit Profile</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Experian Score</label>
                <input className="form-input" type="number" min="300" max="850" value={formData.credit_score_experian} onChange={onChange('credit_score_experian')} />
              </div>
              <div className="form-group">
                <label className="form-label">Equifax Score</label>
                <input className="form-input" type="number" min="300" max="850" value={formData.credit_score_equifax} onChange={onChange('credit_score_equifax')} />
              </div>
              <div className="form-group">
                <label className="form-label">TransUnion Score</label>
                <input className="form-input" type="number" min="300" max="850" value={formData.credit_score_transunion} onChange={onChange('credit_score_transunion')} />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Experian Inquiries</label>
                <input className="form-input" type="number" min="0" value={formData.inquiries_experian} onChange={onChange('inquiries_experian')} />
              </div>
              <div className="form-group">
                <label className="form-label">Equifax Inquiries</label>
                <input className="form-input" type="number" min="0" value={formData.inquiries_equifax} onChange={onChange('inquiries_equifax')} />
              </div>
              <div className="form-group">
                <label className="form-label">TransUnion Inquiries</label>
                <input className="form-input" type="number" min="0" value={formData.inquiries_transunion} onChange={onChange('inquiries_transunion')} />
              </div>
            </div>

            {/* Business Info */}
            <div className="form-section-title">Business Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input className="form-input" value={formData.business_name} onChange={onChange('business_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Entity Type</label>
                <select className="form-select" value={formData.entity_type} onChange={onChange('entity_type')}>
                  <option value="">Select...</option>
                  <option value="LLC">LLC</option>
                  <option value="S-Corp">S-Corp</option>
                  <option value="C-Corp">C-Corp</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Shelf Corp">Shelf Corp</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">EIN</label>
                <input className="form-input" value={formData.ein} onChange={onChange('ein')} placeholder="XX-XXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">NAICS Code</label>
                <input className="form-input" value={formData.naics_code} onChange={onChange('naics_code')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Annual Revenue</label>
                <input className="form-input" type="number" value={formData.annual_revenue} onChange={onChange('annual_revenue')} />
              </div>
              <div className="form-group">
                <label className="form-label">Business State</label>
                <input className="form-input" value={formData.business_state} onChange={onChange('business_state')} maxLength={2} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Business Address</label>
                <input className="form-input" value={formData.business_address} onChange={onChange('business_address')} />
              </div>
              <div className="form-group">
                <label className="form-label">Business City</label>
                <input className="form-input" value={formData.business_city} onChange={onChange('business_city')} />
              </div>
              <div className="form-group">
                <label className="form-label">Business ZIP</label>
                <input className="form-input" value={formData.business_zip} onChange={onChange('business_zip')} />
              </div>
            </div>

            {/* Notes */}
            <div className="form-section-title">Notes</div>
            <div className="form-group">
              <textarea className="form-textarea" rows={4} value={formData.notes} onChange={onChange('notes')} placeholder="General notes about this client..." />
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', padding: '16px 0 0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : (formMode === 'add' ? 'Create Client' : 'Save Changes')}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────
  if (view === 'detail' && selectedClient) {
    const c = selectedClient;
    const getInquiryColor = (count) => {
      if (count >= 3) return 'bureau-danger';
      if (count >= 2) return 'bureau-warn';
      return 'bureau-ok';
    };

    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">{c.first_name} {c.last_name}</h1>
            <p className="page-subtitle">{c.business_name || 'No business on file'}{c.email ? ` \u2022 ${c.email}` : ''}</p>
          </div>
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => setView('list')}>Back to List</button>
            <button className="btn btn-primary" onClick={() => openForm('edit', c)}>Edit Client</button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Bureau Health */}
        <div className="bureau-health">
          <div className="bureau-card">
            <div className="bureau-card-name" style={{ color: '#60a5fa' }}>Experian</div>
            <div className={`bureau-card-count ${getInquiryColor(c.inquiries_experian || 0)}`}>
              {c.inquiries_experian || 0}
            </div>
            <div className="bureau-card-max">of 3 max inquiries</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{c.credit_score_experian || '--'}</div>
          </div>
          <div className="bureau-card">
            <div className="bureau-card-name" style={{ color: '#a855f7' }}>Equifax</div>
            <div className={`bureau-card-count ${getInquiryColor(c.inquiries_equifax || 0)}`}>
              {c.inquiries_equifax || 0}
            </div>
            <div className="bureau-card-max">of 3 max inquiries</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{c.credit_score_equifax || '--'}</div>
          </div>
          <div className="bureau-card">
            <div className="bureau-card-name" style={{ color: '#2dd4bf' }}>TransUnion</div>
            <div className={`bureau-card-count ${getInquiryColor(c.inquiries_transunion || 0)}`}>
              {c.inquiries_transunion || 0}
            </div>
            <div className="bureau-card-max">of 3 max inquiries</div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{c.credit_score_transunion || '--'}</div>
          </div>
        </div>

        <div className="detail-grid">
          {/* Personal Info */}
          <div className="detail-section">
            <div className="detail-section-title">Personal Information</div>
            <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{c.phone || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">DOB</span><span className="detail-value">{c.dob || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">SSN Last 4</span><span className="detail-value">{c.ssn_last4 ? `***${c.ssn_last4}` : '--'}</span></div>
            <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{[c.address, c.city, c.state, c.zip].filter(Boolean).join(', ') || '--'}</span></div>
          </div>

          {/* Business Info */}
          <div className="detail-section">
            <div className="detail-section-title">Business Information</div>
            <div className="detail-row"><span className="detail-label">Business</span><span className="detail-value">{c.business_name || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">Entity</span><span className="detail-value">{c.entity_type || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">EIN</span><span className="detail-value">{c.ein || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">NAICS</span><span className="detail-value">{c.naics_code || '--'}</span></div>
            <div className="detail-row"><span className="detail-label">Revenue</span><span className="detail-value">{c.annual_revenue ? formatCurrency(c.annual_revenue) : '--'}</span></div>
            <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{c.business_state || '--'}</span></div>
          </div>
        </div>

        {/* Disputes */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Disputes ({clientDisputes.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('disputes', { clientId: c.id })}>New Dispute</button>
          </div>
          {clientDisputes.length === 0 ? (
            <div className="empty-state"><p>No disputes for this client.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Type</th><th>Bureau</th><th>Creditor</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {clientDisputes.map((d) => (
                    <tr key={d.id}>
                      <td>{d.dispute_type || d.type}</td>
                      <td><span className={`badge-bureau badge-${d.bureau}`}>{d.bureau}</span></td>
                      <td>{d.creditor_name}</td>
                      <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                      <td>{d.created_at ? new Date(d.created_at).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Funding Plans */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Funding Plans ({clientPlans.length})</h3>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('funding', { clientId: c.id })}>New Plan</button>
          </div>
          {clientPlans.length === 0 ? (
            <div className="empty-state"><p>No funding plans for this client.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Type</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {clientPlans.map((p) => (
                    <tr key={p.id}>
                      <td>{p.plan_type || p.type}</td>
                      <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                      <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Business Setup Progress */}
        {clientSetup && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Business Setup Progress</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => navigate('business', { clientId: c.id })}>View Setup</button>
            </div>
            {clientSetup.steps && (
              <div>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar" style={{ width: `${(clientSetup.steps.filter(s => s.status === 'completed').length / clientSetup.steps.length) * 100}%` }} />
                </div>
                <div className="progress-text">
                  {clientSetup.steps.filter(s => s.status === 'completed').length} of {clientSetup.steps.length} completed
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3 className="card-title">Notes</h3></div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.notes}</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
