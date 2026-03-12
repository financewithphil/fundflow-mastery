import React, { useState } from 'react';
import { BANKS, BUREAUS, FLOW_SEQUENCE_150K, VELOCITY_RULES, SWEET_NUMBERS } from '../data/banks';

export default function BankExplorer() {
  const [search, setSearch] = useState('');
  const [bureauFilter, setBureauFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [tab, setTab] = useState('explorer'); // explorer | flow | rules

  const allBanks = Object.entries(BANKS).map(([key, bank]) => ({ key, ...bank }));

  const filtered = allBanks.filter(bank => {
    if (search && !bank.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (bureauFilter !== 'all' && bank.bureau !== bureauFilter) return false;
    if (methodFilter !== 'all' && bank.method && !bank.method.some(m => m.toLowerCase().includes(methodFilter.toLowerCase()))) return false;
    return true;
  });

  const groupedByBureau = {
    Experian: filtered.filter(b => b.bureau === 'Experian'),
    Equifax: filtered.filter(b => b.bureau === 'Equifax'),
    TransUnion: filtered.filter(b => b.bureau === 'TransUnion'),
  };

  const renderBankCard = (bank) => (
    <div className="bank-card" key={bank.key}>
      <div className="bank-card-name">{bank.name}</div>
      <div className="bank-card-products">
        {bank.products?.map((p, i) => <div key={i}>{p}</div>)}
      </div>

      {bank.sweetNumbers && Object.keys(bank.sweetNumbers).length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div className="bank-card-detail"><strong>Sweet Numbers:</strong></div>
          {bank.sweetNumbers.bizRevenue && <div className="bank-card-detail">Revenue: {bank.sweetNumbers.bizRevenue}</div>}
          {bank.sweetNumbers.personalIncome && <div className="bank-card-detail">Income: {bank.sweetNumbers.personalIncome}</div>}
          {bank.sweetNumbers.monthlySpend && <div className="bank-card-detail">Monthly Spend: {bank.sweetNumbers.monthlySpend}</div>}
          {bank.sweetNumbers.creditLineRequest && <div className="bank-card-detail">Credit Line: {bank.sweetNumbers.creditLineRequest}</div>}
        </div>
      )}

      {bank.requirements && bank.requirements.length > 0 && (
        <div className="bank-card-detail">
          <strong>Requirements:</strong> {bank.requirements.join('; ')}
        </div>
      )}

      {bank.introAPR && (
        <div className="bank-card-detail"><strong>Intro APR:</strong> {bank.introAPR}</div>
      )}

      {bank.recon && (
        <div className="bank-card-detail"><strong>Recon:</strong> {bank.recon}</div>
      )}

      {bank.notes && (
        <div className="bank-card-detail" style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--text-muted)' }}>
          {bank.notes}
        </div>
      )}

      <div className="bank-card-tags">
        <span className={`badge-bureau badge-${bank.bureau}`}>{bank.bureau}</span>
        {bank.method?.map(m => (
          <span key={m} className={`bank-tag ${m === 'Online' ? 'bank-tag-online' : 'bank-tag-inperson'}`}>
            {m}
          </span>
        ))}
        {bank.introAPR && <span className="bank-tag bank-tag-apr">0% APR</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Explorer</h1>
          <p className="page-subtitle">{allBanks.length} banks across 3 bureaus</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'explorer' ? 'active' : ''}`} onClick={() => setTab('explorer')}>
          Bank Directory
        </button>
        <button className={`tab ${tab === 'flow' ? 'active' : ''}`} onClick={() => setTab('flow')}>
          $150K Flow
        </button>
        <button className={`tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          Velocity Rules
        </button>
      </div>

      {tab === 'explorer' && (
        <>
          {/* Filters */}
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="Search banks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={bureauFilter} onChange={(e) => setBureauFilter(e.target.value)}>
              <option value="all">All Bureaus</option>
              <option value="Experian">Experian</option>
              <option value="Equifax">Equifax</option>
              <option value="TransUnion">TransUnion</option>
            </select>
            <select className="filter-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All Methods</option>
              <option value="online">Online</option>
              <option value="in-person">In-Person</option>
            </select>
          </div>

          {/* Three-column layout */}
          <div className="bank-columns">
            {Object.entries(groupedByBureau).map(([bureau, banks]) => (
              <div key={bureau} className="bureau-column">
                <h3>
                  <span className={`badge-bureau badge-${bureau}`}>{bureau}</span>
                  {' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}>({banks.length})</span>
                </h3>
                {banks.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    No banks match filters
                  </div>
                ) : (
                  banks.map(renderBankCard)
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'flow' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 16, color: 'var(--accent-gold)', fontSize: 20 }}>
              $150K Funding Flow Sequence
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              The optimal application sequence to maximize credit line approvals across all three bureaus.
              Follow this exact order and spacing for best results.
            </p>

            <div className="flow-sequence">
              {FLOW_SEQUENCE_150K.map((step, i) => {
                const bank = BANKS[step.bank];
                return (
                  <React.Fragment key={step.step}>
                    {i > 0 && <div className="flow-arrow">&rarr;</div>}
                    <div className="flow-step">
                      <div className="flow-step-number">{step.step}</div>
                      <div className="flow-step-bank">{bank?.name || step.bank}</div>
                      <div className="flow-step-product">{step.product}</div>
                      <span className={`badge-bureau badge-${step.bureau}`} style={{ marginTop: 6 }}>{step.bureau}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Sweet Numbers Reference */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Sweet Numbers Reference</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Recommended figures to use on applications for optimal approval odds.
            </p>
            <div className="rules-grid">
              <div className="rule-item">
                <span className="rule-label">Gross Annual Revenue</span>
                <span className="rule-value">{SWEET_NUMBERS.grossAnnualRevenue}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Personal Income</span>
                <span className="rule-value">{SWEET_NUMBERS.personalIncome}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Monthly Business Spend</span>
                <span className="rule-value">{SWEET_NUMBERS.monthlyBusinessSpend}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Credit Line Request</span>
                <span className="rule-value">{SWEET_NUMBERS.creditLineRequest}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Employees (Under 2 Years)</span>
                <span className="rule-value">{SWEET_NUMBERS.employees.under2Years}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Employees (Over 2 Years)</span>
                <span className="rule-value">{SWEET_NUMBERS.employees.over2Years}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>Velocity & Inquiry Limits</h3>
            <div className="rules-grid">
              <div className="rule-item">
                <span className="rule-label">Max Inquiries Per Bureau</span>
                <span className="rule-value">{VELOCITY_RULES.maxInquiriesPerBureau}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Max Apps Per Bureau/Day</span>
                <span className="rule-value">{VELOCITY_RULES.maxAppsPerBureauPerDay}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Max Apps Per Client/Day</span>
                <span className="rule-value">{VELOCITY_RULES.maxAppsPerClientPerDay}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Max Apps Per Bureau (30-Day Rolling)</span>
                <span className="rule-value">{VELOCITY_RULES.maxAppsPerBureauRolling30}</span>
              </div>
              <div className="rule-item">
                <span className="rule-label">Max Apps Per Client (30-Day Rolling)</span>
                <span className="rule-value">{VELOCITY_RULES.maxAppsPerClientRolling30}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Cooling Periods</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Required wait times after specific events before reapplying.
            </p>
            <div className="rules-grid">
              {Object.entries(VELOCITY_RULES.coolingPeriods).map(([key, value]) => {
                const labels = {
                  failedRemoval: 'After Failed Inquiry Removal',
                  twoVelocityDeclines: 'After 2 Velocity Declines',
                  threeOrMoreDeclines: 'After 3+ Declines',
                  internalLenderFlags: 'After Internal Lender Flags',
                  majorCreditChanges: 'After Major Credit Changes',
                };
                return (
                  <div className="rule-item" key={key}>
                    <span className="rule-label">{labels[key] || key}</span>
                    <span className="rule-value">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank-Specific Rules */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>Bank-Specific Rules</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Bank</th><th>Bureau</th><th>Rules</th></tr>
                </thead>
                <tbody>
                  {allBanks.filter(b => b.rules).map(bank => (
                    <tr key={bank.key}>
                      <td style={{ fontWeight: 600 }}>{bank.name}</td>
                      <td><span className={`badge-bureau badge-${bank.bureau}`}>{bank.bureau}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {bank.rules.rule524 && <div>5/24 Rule: Decline if 5+ personal cards in 24 months</div>}
                        {bank.rules.maxCards30Days && <div>Max {bank.rules.maxCards30Days} cards in 30 days</div>}
                        {bank.rules.maxCards90Days && <div>Max {bank.rules.maxCards90Days} cards per 90 days</div>}
                        {bank.rules.maxCards2Months && <div>Max {bank.rules.maxCards2Months} cards/2mo, {bank.rules.maxCards12Months}/12mo, {bank.rules.maxCards24Months}/24mo</div>}
                        {bank.rules.noPersonalReporting && <div>Does NOT report business cards on personal credit</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
