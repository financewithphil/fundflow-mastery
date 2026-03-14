import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../App';
import { DISPUTE_TYPES, BUREAU_ADDRESSES, LETTER_TEMPLATES } from '../data/disputeTemplates';

const DISPUTE_TYPE_KEYS = Object.keys(DISPUTE_TYPES);

export default function DisputeLetters({ navigate, context }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(context?.clientId || '');
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [disputeType, setDisputeType] = useState('hardInquiry');
  const [bureau, setBureau] = useState('Experian');
  const [creditorName, setCreditorName] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Generated letter
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // View: form | preview
  const [view, setView] = useState('form');

  // Tab: generate | history
  const [tab, setTab] = useState('generate');

  // Preview an existing dispute
  const [previewDispute, setPreviewDispute] = useState(null);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await api('/api/clients');
      const list = Array.isArray(data) ? data : (data.clients || []);
      setClients(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    if (!selectedClientId) {
      setDisputes([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api(`/api/clients/${selectedClientId}/disputes`);
      const list = Array.isArray(data) ? data : (data.disputes || []);
      setDisputes(list);
    } catch (err) {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  useEffect(() => {
    if (context?.clientId) setSelectedClientId(context.clientId);
  }, [context]);

  const handleGenerate = async () => {
    if (!selectedClientId) { setError('Please select a client first.'); return; }
    if (!creditorName) { setError('Creditor name is required.'); return; }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        type: disputeType,
        bureau,
        creditorName,
        inquiryDate,
        accountNumber,
        amount,
        reason,
      };

      const result = await api(`/api/clients/${selectedClientId}/generate-dispute`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setGeneratedLetter(result);
      setView('preview');
    } catch (err) {
      // Fallback: generate locally from template
      const client = clients.find(c => String(c.id) === String(selectedClientId));
      const template = LETTER_TEMPLATES[disputeType];
      const bureauInfo = BUREAU_ADDRESSES[bureau];

      if (template && client) {
        let letter = template.body
          .replace(/\[CLIENT_NAME\]/g, `${client.firstName} ${client.lastName}`)
          .replace(/\[CLIENT_ADDRESS\]/g, client.address || '[Address]')
          .replace(/\[CLIENT_CITY_STATE_ZIP\]/g, [client.city, client.state, client.zip].filter(Boolean).join(', ') || '[City, State ZIP]')
          .replace(/\[DATE\]/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
          .replace(/\[BUREAU_NAME\]/g, bureauInfo?.name || bureau)
          .replace(/\[BUREAU_ADDRESS\]/g, bureauInfo?.address || '[Bureau Address]')
          .replace(/\[BUREAU\]/g, bureau)
          .replace(/\[SSN_LAST4\]/g, client.ssn_last4 || 'XXXX')
          .replace(/\[DOB\]/g, client.dob || '[DOB]')
          .replace(/\[CREDITOR_NAME\]/g, creditorName)
          .replace(/\[INQUIRY_DATE\]/g, inquiryDate || '[Date]')
          .replace(/\[ACCOUNT_NUMBER\]/g, accountNumber || '[Account Number]')
          .replace(/\[AMOUNT\]/g, amount || '[Amount]')
          .replace(/\[ORIGINAL_CREDITOR\]/g, creditorName)
          .replace(/\[DISPUTE_REASON\]/g, reason || 'I believe this information is inaccurate.')
          .replace(/\[LATE_DATES\]/g, inquiryDate || '[Dates]')
          .replace(/\[REPORTED_STATUS\]/g, 'Late')
          .replace(/\[DISPUTE_DATE\]/g, new Date().toLocaleDateString())
          .replace(/\[DISPUTE_DESCRIPTION\]/g, `an unauthorized ${DISPUTE_TYPES[disputeType]?.name?.toLowerCase() || 'item'} by ${creditorName}`)
          .replace(/\[ADDITIONAL_DETAILS\]/g, reason || '')
          .replace(/\[PHONE\]/g, client.phone || '[Phone]')
          .replace(/\[EMAIL\]/g, client.email || '[Email]')
          .replace(/\[DESCRIPTION\]/g, reason || 'unauthorized activity on my credit report')
          .replace(/\[BUREAUS_DISPUTED\]/g, bureau);

        setGeneratedLetter({
          letter_content: letter,
          subject: template.subject,
          dispute_type: disputeType,
          bureau,
          creditor_name: creditorName,
        });
        setView('preview');
      } else {
        setError(err.message || 'Failed to generate dispute letter.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedLetter) return;
    setSaving(true);
    setError('');
    try {
      await api(`/api/clients/${selectedClientId}/disputes`, {
        method: 'POST',
        body: JSON.stringify({
          type: generatedLetter.dispute_type || generatedLetter.type || disputeType,
          bureau: generatedLetter.bureau || bureau,
          creditorName: generatedLetter.creditor_name || generatedLetter.creditorName || creditorName,
          inquiryDate,
          accountNumber,
          amount,
          letterContent: generatedLetter.letter_content || generatedLetter.letterContent || generatedLetter.letter || generatedLetter.content,
          status: 'draft',
        }),
      });
      setSuccess('Dispute saved successfully.');
      setView('form');
      setGeneratedLetter(null);
      loadDisputes();
      // Reset form
      setCreditorName('');
      setInquiryDate('');
      setAccountNumber('');
      setAmount('');
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedClient = clients.find(c => String(c.id) === String(selectedClientId));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispute Letters</h1>
          <p className="page-subtitle">Generate and manage credit dispute letters</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Client selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Client</label>
          <select
            className="form-select"
            value={selectedClientId}
            onChange={(e) => { setSelectedClientId(e.target.value); setView('form'); setGeneratedLetter(null); }}
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
          <p>Choose a client from the dropdown above to generate dispute letters or view history.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => { setTab('generate'); setPreviewDispute(null); }}>
              Generate Letter
            </button>
            <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); setView('form'); }}>
              History ({disputes.length})
            </button>
          </div>

          {tab === 'generate' && view === 'form' && (
            <div className="card">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dispute Type</label>
                  <select className="form-select" value={disputeType} onChange={(e) => setDisputeType(e.target.value)}>
                    {DISPUTE_TYPE_KEYS.map(key => (
                      <option key={key} value={key}>{DISPUTE_TYPES[key].name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {DISPUTE_TYPES[disputeType]?.description}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Bureau</label>
                  <select className="form-select" value={bureau} onChange={(e) => setBureau(e.target.value)}>
                    <option value="Experian">Experian</option>
                    <option value="Equifax">Equifax</option>
                    <option value="TransUnion">TransUnion</option>
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {BUREAU_ADDRESSES[bureau]?.address}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Creditor / Company Name *</label>
                  <input className="form-input" value={creditorName} onChange={(e) => setCreditorName(e.target.value)} placeholder="e.g. Chase, Capital One" />
                </div>
                <div className="form-group">
                  <label className="form-label">Inquiry / Event Date</label>
                  <input className="form-input" type="date" value={inquiryDate} onChange={(e) => setInquiryDate(e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="If applicable" />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$0.00" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Additional Details</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this item being disputed? Any supporting details..."
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !creditorName}>
                  {generating ? <><div className="spinner" /> Generating...</> : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'generate' && view === 'preview' && generatedLetter && (
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <h3 className="card-title">
                    {generatedLetter.subject || DISPUTE_TYPES[disputeType]?.name || 'Dispute Letter'}
                  </h3>
                  <div className="btn-group">
                    <button className="btn btn-secondary btn-sm" onClick={() => setView('form')}>Back to Form</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                      Print
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Dispute'}
                    </button>
                  </div>
                </div>
                <div className="letter-preview">
                  {generatedLetter.letter_content || generatedLetter.letter || generatedLetter.content || 'No content generated.'}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="card">
              {loading ? (
                <div className="loading-container"><div className="spinner spinner-lg" /><span>Loading disputes...</span></div>
              ) : disputes.length === 0 ? (
                <div className="empty-state">
                  <h3>No disputes yet</h3>
                  <p>Generate your first dispute letter for {selectedClient?.firstName}.</p>
                </div>
              ) : previewDispute ? (
                <div>
                  <div className="card-header">
                    <h3 className="card-title">{DISPUTE_TYPES[previewDispute.type]?.name || previewDispute.type || previewDispute.dispute_type} — {previewDispute.creditorName || previewDispute.creditor_name}</h3>
                    <div className="btn-group">
                      <button className="btn btn-secondary btn-sm" onClick={() => setPreviewDispute(null)}>Back to List</button>
                      <button className="btn btn-secondary btn-sm" onClick={handlePrint}>Print</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span className={`badge-bureau badge-${previewDispute.bureau}`}>{previewDispute.bureau}</span>
                    {' '}
                    <span className={`badge badge-${previewDispute.status}`}>{previewDispute.status}</span>
                  </div>
                  <div className="letter-preview">
                    {previewDispute.letterContent || previewDispute.letter_content || previewDispute.content || 'No letter content saved.'}
                  </div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table table-clickable">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Bureau</th>
                        <th>Creditor</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.map((d) => (
                        <tr key={d.id} onClick={() => setPreviewDispute(d)}>
                          <td>{DISPUTE_TYPES[d.type]?.name || d.type || d.dispute_type || '--'}</td>
                          <td><span className={`badge-bureau badge-${d.bureau}`}>{d.bureau}</span></td>
                          <td>{d.creditorName || d.creditor_name || '--'}</td>
                          <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                          <td>{(d.createdAt || d.created_at) ? new Date(d.createdAt || d.created_at).toLocaleDateString() : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
