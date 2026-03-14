const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3001;
const APP_PIN = process.env.APP_PIN || '1234';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'fundflow.db');
let db;

async function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    phone TEXT,
    ssn_last4 TEXT,
    dob TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    creditScoreExperian INTEGER,
    creditScoreEquifax INTEGER,
    creditScoreTransUnion INTEGER,
    totalInquiriesExperian INTEGER DEFAULT 0,
    totalInquiriesEquifax INTEGER DEFAULT 0,
    totalInquiriesTransUnion INTEGER DEFAULT 0,
    businessName TEXT,
    entityType TEXT,
    ein TEXT,
    naicsCode TEXT,
    bizRevenue REAL,
    personalIncome REAL,
    bizState TEXT,
    bizAddress TEXT,
    bizCity TEXT,
    bizZip TEXT,
    bizPhone TEXT,
    bizEmail TEXT,
    bizDomain TEXT,
    bizWebsite TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    type TEXT CHECK(type IN ('hardInquiry','latePayment','collection','cfpb','ftc')),
    bureau TEXT,
    creditorName TEXT,
    accountNumber TEXT,
    inquiryDate TEXT,
    amount REAL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','responded','resolved')),
    letterContent TEXT,
    responseNotes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS funding_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    planType TEXT CHECK(planType IN ('credit_optimization','funding_sequence','full','full_plan')),
    planContent TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','completed')),
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    bankKey TEXT,
    bankName TEXT,
    bureau TEXT,
    product TEXT,
    method TEXT,
    dateApplied TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','waitlist')),
    approvedAmount REAL,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS business_setup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    stepId TEXT,
    stepName TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    notes TEXT,
    completedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS client_logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    lastLogin TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS credit_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientId INTEGER NOT NULL,
    changeDate TEXT,
    bureau TEXT CHECK(bureau IN ('Experian','Equifax','TransUnion')),
    previousScore INTEGER,
    newScore INTEGER,
    scoreDelta INTEGER,
    factor TEXT,
    factorType TEXT CHECK(factorType IN ('positive','negative','neutral')),
    action TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  persistDb();
  console.log('Database initialized');
}

function persistDb() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database:', err.message);
  }
}

// Helpers to run sql.js queries and return JS objects
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length ? rows[0] : null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  persistDb();
  // sql.js uses getRowsModified() for affected rows; for lastId use exec
  try {
    const result = db.exec("SELECT last_insert_rowid() AS id");
    const raw = result[0]?.values[0]?.[0];
    return { lastId: typeof raw === 'bigint' ? Number(raw) : (raw || 0) };
  } catch (e) {
    return { lastId: 0 };
  }
}

// ---------------------------------------------------------------------------
// Claude AI Helper
// ---------------------------------------------------------------------------
async function callClaude(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Please set the ANTHROPIC_API_KEY environment variable to enable AI features. ' +
      'You can get an API key from https://console.anthropic.com/'
    );
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return message.content[0].text;
}

// ---------------------------------------------------------------------------
// Bank Database (comprehensive reference for AI prompts)
// ---------------------------------------------------------------------------
const BANK_DATABASE = `
=== COMPREHENSIVE BANK & LENDER DATABASE FOR BUSINESS FUNDING ===

--- TIER 1: STARTER CARDS (No/Limited Business History) ---

Chase Ink Business Unlimited:
- Bureau: Experian (primary), sometimes Equifax
- Product: Business Credit Card, 1.5% cash back
- Requirements: 680+ personal FICO, 1+ year in business (flexible), $5K+ revenue
- Sweet Numbers: $7,500 / $10,000 / $15,000 starting limits
- Velocity: Wait 30 days between Chase apps. 5/24 rule applies (no more than 5 new cards in 24 months)
- Notes: Best first business card. Recon line: 888-338-2586

Chase Ink Business Cash:
- Bureau: Experian (primary)
- Product: Business Credit Card, 5% categories
- Requirements: 680+ personal FICO, 1+ year in business
- Sweet Numbers: $7,500 / $10,000 / $15,000
- Velocity: Same 5/24 and 30-day rule as above
- Notes: Apply after Ink Unlimited if going Chase-first strategy

Chase Ink Business Preferred:
- Bureau: Experian (primary)
- Product: Business Credit Card, 3x points
- Requirements: 700+ personal FICO, established business preferred
- Sweet Numbers: $10,000 / $15,000 / $20,000
- Velocity: 5/24 rule, 30-day spacing
- Notes: $95 annual fee. Higher limits typical.

American Express Blue Business Cash:
- Bureau: Experian (soft pull for pre-approval, hard pull Experian)
- Product: Business Credit Card, 2% cash back up to $50K
- Requirements: 660+ personal FICO, any business age
- Sweet Numbers: $10,000 / $15,000 / $25,000
- Velocity: 2/90 rule (max 2 Amex cards per 90 days), no 5/24 equivalent
- Notes: Check pre-approval at americanexpress.com/pre-approved first

American Express Blue Business Plus:
- Bureau: Experian
- Product: Business Credit Card, 2x MR points
- Requirements: 660+ personal FICO
- Sweet Numbers: $10,000 / $15,000 / $25,000
- Velocity: 2/90 rule
- Notes: No annual fee, great MR earner

American Express Business Gold:
- Bureau: Experian
- Product: Business Charge Card, 4x categories
- Requirements: 680+ personal FICO
- Sweet Numbers: No preset spending limit (NPSL)
- Velocity: 2/90 for credit cards (charge cards don't count)
- Notes: $375 AF. NPSL doesn't report utilization.

Capital One Spark Cash Plus:
- Bureau: TransUnion, Experian, Equifax (triple pull)
- Product: Business Charge Card, 2% unlimited
- Requirements: 680+ personal FICO, $50K+ revenue preferred
- Sweet Numbers: NPSL
- Velocity: 6-month spacing recommended
- Notes: Triple bureau pull — apply strategically. No preset limit.

Capital One Spark 1.5%:
- Bureau: TransUnion, Experian, Equifax (triple pull)
- Product: Business Credit Card
- Requirements: 670+ FICO
- Sweet Numbers: $5,000 / $10,000 / $15,000
- Velocity: 6-month spacing
- Notes: Easier approval than Spark Cash Plus

US Bank Business Triple Cash:
- Bureau: TransUnion (primary), sometimes Equifax
- Product: Business Credit Card, 3% categories
- Requirements: 680+ personal FICO, limited recent inquiries
- Sweet Numbers: $5,000 / $7,500 / $10,000
- Velocity: Very inquiry-sensitive — keep TU under 3 inquiries in 12 months
- Notes: Sensitive to new accounts. Best when TU is clean.

Wells Fargo Business Platinum:
- Bureau: Experian (primary)
- Product: Business Credit Card
- Requirements: 680+ personal FICO, existing WF relationship helps
- Sweet Numbers: $5,000 / $10,000 / $15,000
- Velocity: Moderate sensitivity
- Notes: Existing banking relationship significantly improves approval

Bank of America Business Advantage:
- Bureau: Experian (primary), sometimes TransUnion
- Product: Business Credit Card, customizable rewards
- Requirements: 680+ personal FICO
- Sweet Numbers: $5,000 / $9,000 / $15,000
- Velocity: Moderate, 3-month spacing recommended
- Notes: Preferred Rewards relationship helps

--- TIER 2: GROWTH (6+ months business credit history) ---

Navy Federal Business Credit Card:
- Bureau: TransUnion (usually)
- Product: Business Credit Card
- Requirements: 650+ personal FICO, military/DOD affiliation
- Sweet Numbers: $15,000 / $25,000 / $35,000
- Velocity: Generous approvals for members
- Notes: Highest starting limits in the game. Must be NFCU member.

PenFed Business Credit Card:
- Bureau: TransUnion
- Product: Business Credit Card
- Requirements: 670+ personal FICO
- Sweet Numbers: $10,000 / $20,000 / $25,000
- Velocity: Moderate
- Notes: Credit union, anyone can join

--- TIER 3: CREDIT LINES & LOANS ---

Fundbox Business Line of Credit:
- Bureau: Soft pull (Experian for monitoring)
- Product: Business Line of Credit up to $150K
- Requirements: 600+ personal FICO, 6+ months in business, $100K+ annual revenue
- Sweet Numbers: $25,000 / $50,000 / $100,000
- Notes: Fast approval, weekly payments

Bluevine Business Line of Credit:
- Bureau: Soft pull initial, Experian hard pull if approved
- Product: Business Line of Credit up to $250K
- Requirements: 625+ personal FICO, 12+ months in business, $120K+ revenue
- Sweet Numbers: $25,000 / $50,000 / $100,000
- Notes: Revolving line, interest only on drawn amount

Kabbage (American Express Business Blueprint):
- Bureau: Soft pull
- Product: Business Line of Credit up to $250K
- Requirements: 640+ FICO, 12+ months, $36K+ revenue
- Sweet Numbers: $10,000 / $25,000 / $50,000
- Notes: Now part of Amex, monthly fee model

--- VELOCITY RULES (CRITICAL) ---
- Maximum 3 hard inquiries per bureau per rolling 6 months for optimal approval odds
- Maximum 6 hard inquiries per bureau per rolling 12 months (absolute ceiling)
- Space applications 30 days apart minimum (same bureau)
- Chase 5/24: No more than 5 new personal + business cards across ALL issuers in 24 months
- Amex 2/90: Max 2 new Amex credit cards per 90 days
- Capital One: 6-month spacing, triple pull — use strategically
- US Bank: Very inquiry-sensitive on TransUnion, keep clean

--- $150K FUNDING FLOW SEQUENCE ---
Phase 1 (Month 1-2): Foundation
  1. Chase Ink Unlimited ($10-15K) — Experian pull
  2. Amex Blue Business Cash ($10-25K) — Experian pull (check pre-approval first)
  3. Wait 30 days

Phase 2 (Month 2-3): Expansion
  4. Chase Ink Cash ($10-15K) — Experian pull
  5. Amex Blue Business Plus ($10-25K) — Experian pull
  6. US Bank Triple Cash ($5-10K) — TransUnion pull (only if TU is clean)

Phase 3 (Month 4-5): Growth
  7. Wells Fargo Business Platinum ($10-15K) — Experian pull
  8. Bank of America Business Advantage ($9-15K) — Experian pull
  9. Capital One Spark ($10-15K) — Triple pull (save for last)

Phase 4 (Month 6+): Credit Lines
  10. Fundbox LOC ($25-100K) — Soft pull
  11. Bluevine LOC ($25-100K) — Soft pull initial
  12. Amex Business Gold (NPSL) — Charge card, no utilization impact

Total Potential: $150K-$400K+ in available credit

--- AUTHORIZED USER (AU) TRADELINE STRATEGY ---
- Add client as AU on aged accounts (5+ years, low utilization, perfect payment)
- Best AU accounts: Chase, Amex, Discover (report to all 3 bureaus)
- AU tradelines take 30-60 days to appear on credit report
- Can boost score 20-50 points depending on current profile
- Remove before applying if lender counts AU accounts in 5/24

--- CREDIT UTILIZATION TARGETS ---
- Ideal: 1-9% utilization per card AND overall
- Report date hack: Pay down before statement closes
- AZEO strategy: All Zero Except One (one card reports small balance, rest zero)
- Chase and Amex report statement balance, not real-time balance
`;

// ---------------------------------------------------------------------------
// Dispute Letter System Prompt
// ---------------------------------------------------------------------------
const DISPUTE_SYSTEM_PROMPT = `You are an expert credit repair specialist and consumer rights advocate. You generate professional, legally-grounded dispute letters based on the Fair Credit Reporting Act (FCRA), Fair Debt Collection Practices Act (FDCPA), and other consumer protection laws.

KEY LAWS AND REGULATIONS:
- FCRA Section 611: Right to dispute inaccurate information. CRAs must investigate within 30 days.
- FCRA Section 623: Furnisher obligations to investigate disputes forwarded by CRAs.
- FCRA Section 605: Time limits on reporting (7 years for most negatives, 10 years for bankruptcies).
- FCRA Section 609: Right to disclosure of all information in consumer's file.
- FCRA Section 604: Permissible purposes for accessing credit reports.
- FDCPA Section 809: Debt validation rights — 30 days to dispute after initial communication.
- FCRA Section 616 & 617: Civil liability for willful and negligent noncompliance.
- Metro 2 Compliance: All furnishers must report in Metro 2 format; any deviation is disputable.
- E-OSCAR limitations: Automated dispute system often fails to convey full consumer statements.
- CFPB Complaint Process: File with Consumer Financial Protection Bureau for escalation.
- FTC Complaint Process: File with Federal Trade Commission for pattern violations.

DISPUTE STRATEGIES BY TYPE:
1. Hard Inquiry Disputes: Challenge unauthorized access under FCRA 604. Demand proof of permissible purpose.
2. Late Payment Disputes: Challenge reporting accuracy, demand proof of billing statements, challenge if goodwill adjustment possible.
3. Collection Disputes: Demand debt validation under FDCPA 809. Challenge chain of title, original creditor documentation, SOL expiration.
4. CFPB Complaints: Escalation strategy when CRA fails to investigate properly. Reference prior dispute dates.
5. FTC Complaints: For systemic violations, repeated failures to investigate, or furnisher noncompliance.

LETTER FORMAT:
- Professional, formal tone
- Include client name, address, SSN last 4, DOB at top
- Reference specific account/inquiry details
- Cite specific FCRA/FDCPA sections
- Include clear demand (remove, correct, validate)
- Set 30-day response deadline
- Mention intent to file complaints with CFPB/FTC/state AG if not resolved
- Include "certified mail, return receipt requested" notation

Generate the complete dispute letter ready to print and send. Make it persuasive but professional.`;

// ---------------------------------------------------------------------------
// Funding Plan System Prompt
// ---------------------------------------------------------------------------
const FUNDING_PLAN_SYSTEM_PROMPT = `You are an expert business funding strategist and credit optimization consultant. You create personalized, actionable funding plans based on each client's unique credit profile, business details, and goals.

Your plans should be specific, data-driven, and sequenced properly to maximize approvals while minimizing credit impact.

${BANK_DATABASE}

PLAN TYPES:
1. credit_optimization: Focus on improving credit scores, reducing utilization, removing negatives, AU strategy, and CLI strategies.
2. funding_sequence: Specific bank-by-bank application sequence with timing, expected limits, and bureau management.
3. full: Comprehensive plan combining both credit optimization AND funding sequence.

FORMAT YOUR RESPONSE AS STRUCTURED, ACTIONABLE STEPS with specific timelines, expected outcomes, and contingency plans. Include dollar amount estimates for each funding source.`;

// ---------------------------------------------------------------------------
// Auth Route
// ---------------------------------------------------------------------------
app.post('/api/auth', (req, res) => {
  const { pin } = req.body;
  if (pin === APP_PIN) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Invalid PIN' });
});

// ---------------------------------------------------------------------------
// Client CRUD
// ---------------------------------------------------------------------------
app.get('/api/clients', (_req, res) => {
  try {
    const clients = dbAll('SELECT * FROM clients ORDER BY updatedAt DESC');
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const c = req.body;
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO clients (firstName, lastName, email, phone, ssn_last4, dob, address, city, state, zip,
        creditScoreExperian, creditScoreEquifax, creditScoreTransUnion,
        totalInquiriesExperian, totalInquiriesEquifax, totalInquiriesTransUnion,
        businessName, entityType, ein, naicsCode, bizRevenue, personalIncome,
        bizState, bizAddress, bizCity, bizZip, bizPhone, bizEmail, bizDomain, bizWebsite, notes,
        createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.firstName || null, c.lastName || null, c.email || null, c.phone || null,
        c.ssn_last4 || null, c.dob || null, c.address || null, c.city || null,
        c.state || null, c.zip || null,
        c.creditScoreExperian || null, c.creditScoreEquifax || null, c.creditScoreTransUnion || null,
        c.totalInquiriesExperian || 0, c.totalInquiriesEquifax || 0, c.totalInquiriesTransUnion || 0,
        c.businessName || null, c.entityType || null, c.ein || null, c.naicsCode || null,
        c.bizRevenue || null, c.personalIncome || null,
        c.bizState || null, c.bizAddress || null, c.bizCity || null, c.bizZip || null,
        c.bizPhone || null, c.bizEmail || null, c.bizDomain || null, c.bizWebsite || null,
        c.notes || null, now, now,
      ]
    );
    // Fetch the newly created client — fallback to MAX(id) if lastId fails
    let client = dbGet('SELECT * FROM clients WHERE id = ?', [lastId]);
    if (!client) {
      client = dbGet('SELECT * FROM clients ORDER BY id DESC LIMIT 1');
    }
    res.status(201).json(client || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const c = req.body;
    const now = new Date().toISOString();
    dbRun(
      `UPDATE clients SET
        firstName=?, lastName=?, email=?, phone=?, ssn_last4=?, dob=?,
        address=?, city=?, state=?, zip=?,
        creditScoreExperian=?, creditScoreEquifax=?, creditScoreTransUnion=?,
        totalInquiriesExperian=?, totalInquiriesEquifax=?, totalInquiriesTransUnion=?,
        businessName=?, entityType=?, ein=?, naicsCode=?, bizRevenue=?, personalIncome=?,
        bizState=?, bizAddress=?, bizCity=?, bizZip=?, bizPhone=?, bizEmail=?, bizDomain=?, bizWebsite=?,
        notes=?, updatedAt=?
       WHERE id=?`,
      [
        c.firstName ?? existing.firstName, c.lastName ?? existing.lastName,
        c.email ?? existing.email, c.phone ?? existing.phone,
        c.ssn_last4 ?? existing.ssn_last4, c.dob ?? existing.dob,
        c.address ?? existing.address, c.city ?? existing.city,
        c.state ?? existing.state, c.zip ?? existing.zip,
        c.creditScoreExperian ?? existing.creditScoreExperian,
        c.creditScoreEquifax ?? existing.creditScoreEquifax,
        c.creditScoreTransUnion ?? existing.creditScoreTransUnion,
        c.totalInquiriesExperian ?? existing.totalInquiriesExperian,
        c.totalInquiriesEquifax ?? existing.totalInquiriesEquifax,
        c.totalInquiriesTransUnion ?? existing.totalInquiriesTransUnion,
        c.businessName ?? existing.businessName, c.entityType ?? existing.entityType,
        c.ein ?? existing.ein, c.naicsCode ?? existing.naicsCode,
        c.bizRevenue ?? existing.bizRevenue, c.personalIncome ?? existing.personalIncome,
        c.bizState ?? existing.bizState, c.bizAddress ?? existing.bizAddress,
        c.bizCity ?? existing.bizCity, c.bizZip ?? existing.bizZip,
        c.bizPhone ?? existing.bizPhone, c.bizEmail ?? existing.bizEmail,
        c.bizDomain ?? existing.bizDomain, c.bizWebsite ?? existing.bizWebsite,
        c.notes ?? existing.notes, now, req.params.id,
      ]
    );
    const updated = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    dbRun('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const clients = dbAll('SELECT * FROM clients');
    const disputes = dbAll('SELECT * FROM disputes');
    const apps = dbAll('SELECT * FROM applications');
    const plans = dbAll('SELECT * FROM funding_plans');

    const activeDisputes = disputes.filter(d => d.status !== 'completed' && d.status !== 'resolved').length;
    const approvedApps = apps.filter(a => a.status === 'approved');
    const totalApprovedFunding = approvedApps.reduce((sum, a) => sum + (a.approvedAmount || 0), 0);
    const pendingApplications = apps.filter(a => a.status === 'pending').length;

    res.json({
      totalClients: clients.length,
      activeDisputes,
      totalApprovedFunding,
      pendingApplications,
      totalApplications: apps.length,
      approvedCount: approvedApps.length,
      deniedCount: apps.filter(a => a.status === 'denied').length,
      activePlans: plans.filter(p => p.status === 'active').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/activity', (req, res) => {
  try {
    const recentClients = dbAll('SELECT id, firstName, lastName, createdAt FROM clients ORDER BY createdAt DESC LIMIT 5');
    const recentApps = dbAll('SELECT a.*, c.firstName, c.lastName FROM applications a LEFT JOIN clients c ON a.clientId = c.id ORDER BY a.createdAt DESC LIMIT 5');
    const recentDisputes = dbAll('SELECT d.*, c.firstName, c.lastName FROM disputes d LEFT JOIN clients c ON d.clientId = c.id ORDER BY d.createdAt DESC LIMIT 5');
    const recentChanges = dbAll('SELECT cc.*, c.firstName, c.lastName FROM credit_changes cc LEFT JOIN clients c ON cc.clientId = c.id ORDER BY cc.createdAt DESC LIMIT 5');

    const activity = [];

    recentClients.forEach(c => activity.push({
      type: 'client', description: `New client added: ${c.firstName} ${c.lastName}`,
      created_at: c.createdAt
    }));

    recentApps.forEach(a => {
      const status = a.status === 'approved' ? `Approved $${(a.approvedAmount || 0).toLocaleString()}` : a.status.charAt(0).toUpperCase() + a.status.slice(1);
      activity.push({
        type: 'funding', description: `${a.firstName} ${a.lastName} — ${a.bankName} ${a.product}: ${status}`,
        created_at: a.createdAt
      });
    });

    recentDisputes.forEach(d => activity.push({
      type: 'dispute', description: `${d.firstName} ${d.lastName} — ${d.type} dispute (${d.bureau}): ${d.status}`,
      created_at: d.createdAt
    }));

    recentChanges.forEach(cc => {
      const delta = (cc.scoreDelta > 0 ? '+' : '') + cc.scoreDelta;
      activity.push({
        type: 'credit', description: `${cc.firstName} ${cc.lastName} — ${cc.bureau} score ${delta} (${cc.previousScore} → ${cc.newScore})`,
        created_at: cc.createdAt
      });
    });

    activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(activity.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
app.get('/api/clients/:id/disputes', (req, res) => {
  try {
    const disputes = dbAll('SELECT * FROM disputes WHERE clientId = ? ORDER BY createdAt DESC', [req.params.id]);
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/disputes', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const d = req.body;
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO disputes (clientId, type, bureau, creditorName, accountNumber, inquiryDate, amount, status, letterContent, responseNotes, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.params.id, d.type || null, d.bureau || null, d.creditorName || null,
        d.accountNumber || null, d.inquiryDate || null, d.amount || null,
        d.status || 'draft', d.letterContent || null, d.responseNotes || null,
        now, now,
      ]
    );
    let dispute = dbGet('SELECT * FROM disputes WHERE id = ?', [lastId]);
    if (!dispute) dispute = dbGet('SELECT * FROM disputes WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(dispute || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/disputes/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Dispute not found' });

    const d = req.body;
    const now = new Date().toISOString();
    dbRun(
      `UPDATE disputes SET type=?, bureau=?, creditorName=?, accountNumber=?, inquiryDate=?, amount=?, status=?, letterContent=?, responseNotes=?, updatedAt=?
       WHERE id=?`,
      [
        d.type ?? existing.type, d.bureau ?? existing.bureau,
        d.creditorName ?? existing.creditorName, d.accountNumber ?? existing.accountNumber,
        d.inquiryDate ?? existing.inquiryDate, d.amount ?? existing.amount,
        d.status ?? existing.status, d.letterContent ?? existing.letterContent,
        d.responseNotes ?? existing.responseNotes, now, req.params.id,
      ]
    );
    const updated = dbGet('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/disputes/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Dispute not found' });
    dbRun('DELETE FROM disputes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Dispute deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Generate Dispute Letter (AI)
// ---------------------------------------------------------------------------
app.post('/api/clients/:id/generate-dispute', async (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const {
      type, bureau, creditorName, inquiryDate, accountNumber,
      amount, originalCreditor, disputeReason, additionalDetails,
    } = req.body;

    const userPrompt = `Generate a dispute letter for the following client and dispute details:

CLIENT INFORMATION:
- Name: ${client.firstName} ${client.lastName}
- Address: ${client.address || 'N/A'}, ${client.city || ''}, ${client.state || ''} ${client.zip || ''}
- SSN Last 4: ${client.ssn_last4 || 'XXXX'}
- DOB: ${client.dob || 'N/A'}

DISPUTE DETAILS:
- Type: ${type}
- Bureau: ${bureau}
- Creditor/Company Name: ${creditorName}
- Account Number: ${accountNumber || 'N/A'}
- Inquiry/Account Date: ${inquiryDate || 'N/A'}
- Amount: ${amount ? '$' + amount : 'N/A'}
- Original Creditor: ${originalCreditor || 'N/A'}
- Dispute Reason: ${disputeReason || 'Inaccurate information'}
- Additional Details: ${additionalDetails || 'None'}

CREDIT SCORES:
- Experian: ${client.creditScoreExperian || 'N/A'}
- Equifax: ${client.creditScoreEquifax || 'N/A'}
- TransUnion: ${client.creditScoreTransUnion || 'N/A'}

Please generate a complete, ready-to-send dispute letter appropriate for the dispute type. Address it to the correct bureau or entity.`;

    const letterContent = await callClaude(DISPUTE_SYSTEM_PROMPT, userPrompt);

    // Save the dispute
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO disputes (clientId, type, bureau, creditorName, accountNumber, inquiryDate, amount, status, letterContent, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [req.params.id, type, bureau, creditorName, accountNumber, inquiryDate, amount, 'draft', letterContent, now, now]
    );

    let dispute = dbGet('SELECT * FROM disputes WHERE id = ?', [lastId]);
    if (!dispute) dispute = dbGet('SELECT * FROM disputes WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(dispute || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Funding Plans
// ---------------------------------------------------------------------------
app.get('/api/clients/:id/funding-plans', (req, res) => {
  try {
    const plans = dbAll('SELECT * FROM funding_plans WHERE clientId = ? ORDER BY createdAt DESC', [req.params.id]);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual plan creation (for seeding or direct entry)
app.post('/api/clients/:id/funding-plans', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const { planType, content, status } = req.body;
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO funding_plans (clientId, planType, planContent, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?)`,
      [req.params.id, planType || 'full_plan', content || '', status || 'active', now, now]
    );
    let plan = dbGet('SELECT * FROM funding_plans WHERE id = ?', [lastId]);
    if (!plan) plan = dbGet('SELECT * FROM funding_plans WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(plan || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/generate-plan', async (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { planType } = req.body;
    if (!['credit_optimization', 'funding_sequence', 'full', 'full_plan'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid planType. Must be credit_optimization, funding_sequence, or full_plan.' });
    }

    // Get existing applications for context
    const applications = dbAll('SELECT * FROM applications WHERE clientId = ? ORDER BY dateApplied DESC', [req.params.id]);

    const appSummary = applications.length
      ? applications.map(a => `${a.bankName} (${a.bureau}) — ${a.status}, applied ${a.dateApplied}${a.approvedAmount ? ', approved $' + a.approvedAmount : ''}`).join('\n')
      : 'No applications yet.';

    const userPrompt = `Create a ${planType.replace(/_/g, ' ')} plan for this client:

CLIENT PROFILE:
- Name: ${client.firstName} ${client.lastName}
- Email: ${client.email || 'N/A'}
- Phone: ${client.phone || 'N/A'}
- Personal Income: ${client.personalIncome ? '$' + client.personalIncome.toLocaleString() : 'N/A'}

CREDIT SCORES:
- Experian: ${client.creditScoreExperian || 'N/A'}
- Equifax: ${client.creditScoreEquifax || 'N/A'}
- TransUnion: ${client.creditScoreTransUnion || 'N/A'}

INQUIRY COUNTS:
- Experian: ${client.totalInquiriesExperian || 0}
- Equifax: ${client.totalInquiriesEquifax || 0}
- TransUnion: ${client.totalInquiriesTransUnion || 0}

BUSINESS DETAILS:
- Business Name: ${client.businessName || 'N/A'}
- Entity Type: ${client.entityType || 'N/A'}
- EIN: ${client.ein || 'N/A'}
- NAICS Code: ${client.naicsCode || 'N/A'}
- Revenue: ${client.bizRevenue ? '$' + client.bizRevenue.toLocaleString() : 'N/A'}
- State: ${client.bizState || 'N/A'}
- Website: ${client.bizWebsite || 'N/A'}

EXISTING APPLICATIONS:
${appSummary}

Generate a detailed, personalized ${planType.replace(/_/g, ' ')} plan with specific action items, timelines, expected outcomes, and dollar amounts.`;

    const planContent = await callClaude(FUNDING_PLAN_SYSTEM_PROMPT, userPrompt);

    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO funding_plans (clientId, planType, planContent, status, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?)`,
      [req.params.id, planType, planContent, 'draft', now, now]
    );

    let plan = dbGet('SELECT * FROM funding_plans WHERE id = ?', [lastId]);
    if (!plan) plan = dbGet('SELECT * FROM funding_plans WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(plan || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/funding-plans/:id', (req, res) => {
  try {
    const plan = dbGet('SELECT * FROM funding_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const { status, planContent } = req.body;
    const now = new Date().toISOString();
    dbRun(
      'UPDATE funding_plans SET status = ?, planContent = ?, updatedAt = ? WHERE id = ?',
      [status ?? plan.status, planContent ?? plan.planContent, now, req.params.id]
    );
    const updated = dbGet('SELECT * FROM funding_plans WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
app.get('/api/clients/:id/applications', (req, res) => {
  try {
    const apps = dbAll('SELECT * FROM applications WHERE clientId = ? ORDER BY dateApplied DESC', [req.params.id]);
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/applications', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const a = req.body;
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      `INSERT INTO applications (clientId, bankKey, bankName, bureau, product, method, dateApplied, status, approvedAmount, notes, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.params.id, a.bankKey || null, a.bankName || null, a.bureau || null,
        a.product || null, a.method || null, a.dateApplied || now,
        a.status || 'pending', a.approvedAmount || null, a.notes || null, now,
      ]
    );
    let application = dbGet('SELECT * FROM applications WHERE id = ?', [lastId]);
    if (!application) application = dbGet('SELECT * FROM applications WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(application || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/applications/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const a = req.body;
    dbRun(
      `UPDATE applications SET bankKey=?, bankName=?, bureau=?, product=?, method=?, dateApplied=?, status=?, approvedAmount=?, notes=?
       WHERE id=?`,
      [
        a.bankKey ?? existing.bankKey, a.bankName ?? existing.bankName,
        a.bureau ?? existing.bureau, a.product ?? existing.product,
        a.method ?? existing.method, a.dateApplied ?? existing.dateApplied,
        a.status ?? existing.status, a.approvedAmount ?? existing.approvedAmount,
        a.notes ?? existing.notes, req.params.id,
      ]
    );
    const updated = dbGet('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Application not found' });
    dbRun('DELETE FROM applications WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/funding-plans/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM funding_plans WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    dbRun('DELETE FROM funding_plans WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id/application-stats', (req, res) => {
  try {
    const clientId = req.params.id;
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const apps = dbAll('SELECT * FROM applications WHERE clientId = ?', [clientId]);

    const totalApps = apps.length;
    const approved = apps.filter(a => a.status === 'approved');
    const approvedCount = approved.length;
    const totalApprovedAmount = approved.reduce((sum, a) => sum + (a.approvedAmount || 0), 0);

    // Apps by bureau
    const appsByBureau = {};
    for (const a of apps) {
      if (a.bureau) {
        // Handle triple-pull banks (comma-separated bureaus)
        const bureaus = a.bureau.split(',').map(b => b.trim());
        for (const b of bureaus) {
          appsByBureau[b] = (appsByBureau[b] || 0) + 1;
        }
      }
    }

    // Rolling 30-day inquiry count per bureau
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentApps = apps.filter(a => a.dateApplied && a.dateApplied >= thirtyDaysAgo);
    const recentByBureau = {};
    for (const a of recentApps) {
      if (a.bureau) {
        const bureaus = a.bureau.split(',').map(b => b.trim());
        for (const b of bureaus) {
          recentByBureau[b] = (recentByBureau[b] || 0) + 1;
        }
      }
    }

    // Remaining capacity: max 3 per bureau overall caution threshold, max 6 per bureau rolling 30 days
    const bureauList = ['Experian', 'Equifax', 'TransUnion'];
    const remainingCapacity = {};
    for (const b of bureauList) {
      const totalForBureau = appsByBureau[b] || 0;
      const recentForBureau = recentByBureau[b] || 0;
      remainingCapacity[b] = {
        total: totalForBureau,
        last30Days: recentForBureau,
        remainingBeforeCaution: Math.max(0, 3 - totalForBureau),
        remaining30Day: Math.max(0, 6 - recentForBureau),
      };
    }

    res.json({
      totalApps,
      approvedCount,
      totalApprovedAmount,
      appsByBureau,
      remainingCapacity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Business Setup
// ---------------------------------------------------------------------------
const BUSINESS_SETUP_STEPS = [
  { stepId: 'entity', stepName: 'Form Business Entity (LLC/Corp)' },
  { stepId: 'foreignFiling', stepName: 'Foreign Filing (if applicable)' },
  { stepId: 'ein', stepName: 'Obtain EIN from IRS' },
  { stepId: 'domain', stepName: 'Register Business Domain' },
  { stepId: 'address', stepName: 'Get Business Address (virtual or physical)' },
  { stepId: 'phone', stepName: 'Set Up Business Phone Number' },
  { stepId: 'form1583', stepName: 'Complete USPS Form 1583 (for virtual address)' },
  { stepId: 'bankAccount', stepName: 'Open Business Bank Account' },
  { stepId: 'website', stepName: 'Build Business Website' },
];

app.get('/api/clients/:id/business-setup', (req, res) => {
  try {
    const steps = dbAll('SELECT * FROM business_setup WHERE clientId = ? ORDER BY id ASC', [req.params.id]);
    res.json(steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add individual business setup step
app.post('/api/clients/:id/business-setup', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const { stepName, status, notes } = req.body;
    const now = new Date().toISOString();
    const { lastId } = dbRun(
      'INSERT INTO business_setup (clientId, stepName, status, notes, createdAt) VALUES (?,?,?,?,?)',
      [req.params.id, stepName || null, status || 'pending', notes || null, now]
    );
    let step = dbGet('SELECT * FROM business_setup WHERE id = ?', [lastId]);
    if (!step) step = dbGet('SELECT * FROM business_setup WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(step || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize all 9 setup steps at once
app.post('/api/clients/:id/business-setup/init', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Check if steps already exist
    const existing = dbAll('SELECT * FROM business_setup WHERE clientId = ?', [req.params.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Business setup steps already initialized for this client' });
    }

    const now = new Date().toISOString();
    for (const step of BUSINESS_SETUP_STEPS) {
      dbRun(
        'INSERT INTO business_setup (clientId, stepId, stepName, status, createdAt) VALUES (?,?,?,?,?)',
        [req.params.id, step.stepId, step.stepName, 'pending', now]
      );
    }

    const steps = dbAll('SELECT * FROM business_setup WHERE clientId = ? ORDER BY id ASC', [req.params.id]);
    res.status(201).json(steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/business-setup/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM business_setup WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Business setup step not found' });

    const s = req.body;
    const completedAt = s.status === 'completed' ? (s.completedAt || new Date().toISOString()) : existing.completedAt;

    dbRun(
      'UPDATE business_setup SET status=?, notes=?, completedAt=? WHERE id=?',
      [
        s.status ?? existing.status,
        s.notes ?? existing.notes,
        completedAt,
        req.params.id,
      ]
    );
    const updated = dbGet('SELECT * FROM business_setup WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Generate Onboarding Summary (AI)
// ---------------------------------------------------------------------------
app.post('/api/clients/:id/generate-onboarding-summary', async (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const disputes = dbAll('SELECT * FROM disputes WHERE clientId = ?', [req.params.id]);
    const apps = dbAll('SELECT * FROM applications WHERE clientId = ?', [req.params.id]);
    const steps = dbAll('SELECT * FROM business_setup WHERE clientId = ?', [req.params.id]);

    const systemPrompt = `You are a professional business funding consultant writing a post-onboarding summary email to a client. The email should be warm, professional, and actionable.

Format as the "Client Next-Steps Email Template":
1. Greeting with client's first name
2. Summary of what was discussed/set up during onboarding
3. Current credit score overview
4. Immediate action items (numbered, with deadlines)
5. Upcoming milestones and timeline
6. Contact information and next meeting scheduling
7. Professional sign-off

Make it specific to their situation — reference actual scores, business details, and planned steps.`;

    const userPrompt = `Generate a post-onboarding summary email for:

CLIENT: ${client.firstName} ${client.lastName}
Email: ${client.email || 'N/A'}
Phone: ${client.phone || 'N/A'}

CREDIT SCORES:
- Experian: ${client.creditScoreExperian || 'N/A'}
- Equifax: ${client.creditScoreEquifax || 'N/A'}
- TransUnion: ${client.creditScoreTransUnion || 'N/A'}

INQUIRIES:
- Experian: ${client.totalInquiriesExperian || 0}
- Equifax: ${client.totalInquiriesEquifax || 0}
- TransUnion: ${client.totalInquiriesTransUnion || 0}

BUSINESS:
- Name: ${client.businessName || 'Not yet formed'}
- Entity Type: ${client.entityType || 'N/A'}
- EIN: ${client.ein ? 'Obtained' : 'Pending'}
- Revenue: ${client.bizRevenue ? '$' + client.bizRevenue.toLocaleString() : 'N/A'}
- Personal Income: ${client.personalIncome ? '$' + client.personalIncome.toLocaleString() : 'N/A'}

ACTIVE DISPUTES: ${disputes.length}
APPLICATIONS FILED: ${apps.length}
BUSINESS SETUP STEPS: ${steps.filter(s => s.status === 'completed').length}/${steps.length} completed

Generate the complete email ready to send.`;

    const emailContent = await callClaude(systemPrompt, userPrompt);
    res.json({ emailContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Generate BRM Email (AI)
// ---------------------------------------------------------------------------
app.post('/api/clients/:id/generate-brm-email', async (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const apps = dbAll('SELECT * FROM applications WHERE clientId = ? AND status = ?', [req.params.id, 'approved']);
    const totalApproved = apps.reduce((sum, a) => sum + (a.approvedAmount || 0), 0);

    const systemPrompt = `You are a business funding consultant drafting a Business Relationship Manager (BRM) introduction email. This email introduces the client to a bank's BRM for a more personalized banking relationship and potential higher credit limits or business lending.

The email should:
1. Be professionally formatted
2. Introduce the client and their business
3. Highlight the client's financial strengths (credit scores, revenue, existing banking relationships)
4. Reference specific "sweet numbers" — the ideal credit limits and deposit amounts that make BRMs take notice
5. Request a meeting or call to discuss expanded banking services
6. Include all relevant business details

Sweet Numbers for BRM Meetings:
- $10,000+ in business checking deposits signals serious business
- $25,000+ in total deposits across accounts triggers relationship pricing
- $50,000+ in approved business credit shows creditworthiness
- $100,000+ in annual revenue qualifies for most business lending programs

${BANK_DATABASE}`;

    const userPrompt = `Generate a BRM introduction email for:

CLIENT: ${client.firstName} ${client.lastName}
Business: ${client.businessName || 'N/A'}
Entity Type: ${client.entityType || 'N/A'}
EIN: ${client.ein || 'N/A'}
NAICS: ${client.naicsCode || 'N/A'}
Revenue: ${client.bizRevenue ? '$' + client.bizRevenue.toLocaleString() : 'N/A'}
Personal Income: ${client.personalIncome ? '$' + client.personalIncome.toLocaleString() : 'N/A'}
Business Address: ${client.bizAddress || ''}, ${client.bizCity || ''}, ${client.bizState || ''} ${client.bizZip || ''}
Business Phone: ${client.bizPhone || 'N/A'}
Business Email: ${client.bizEmail || 'N/A'}
Website: ${client.bizWebsite || 'N/A'}

CREDIT SCORES:
- Experian: ${client.creditScoreExperian || 'N/A'}
- Equifax: ${client.creditScoreEquifax || 'N/A'}
- TransUnion: ${client.creditScoreTransUnion || 'N/A'}

EXISTING APPROVED CREDIT: $${totalApproved.toLocaleString()} across ${apps.length} accounts
${apps.map(a => `- ${a.bankName}: $${(a.approvedAmount || 0).toLocaleString()} (${a.product || 'credit card'})`).join('\n')}

Generate the complete BRM introduction email ready to customize and send.`;

    const emailContent = await callClaude(systemPrompt, userPrompt);
    res.json({ emailContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// File Upload (PDF credit reports)
// ---------------------------------------------------------------------------
app.post('/api/upload/credit-report', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
      message: 'Credit report uploaded successfully. PDF parsing can be added with pdf-parse library.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Client Portal Auth
// ---------------------------------------------------------------------------
app.post('/api/client-auth', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const login = dbGet('SELECT * FROM client_logins WHERE email = ?', [email]);
    if (!login || login.passwordHash !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Update lastLogin
    dbRun('UPDATE client_logins SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), login.id]);

    const client = dbGet('SELECT * FROM clients WHERE id = ?', [login.clientId]);
    res.json({
      success: true,
      clientId: login.clientId,
      firstName: client ? client.firstName : null,
      lastName: client ? client.lastName : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Admin: Manage Client Logins
// ---------------------------------------------------------------------------
app.post('/api/clients/:id/create-login', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if login already exists for this client
    const existing = dbGet('SELECT * FROM client_logins WHERE clientId = ?', [req.params.id]);
    if (existing) {
      return res.status(400).json({ error: 'Login already exists for this client. Use PUT to update.' });
    }

    const now = new Date().toISOString();
    const { lastId } = dbRun(
      'INSERT INTO client_logins (clientId, email, passwordHash, createdAt) VALUES (?,?,?,?)',
      [req.params.id, email, password, now]
    );

    let login = dbGet('SELECT * FROM client_logins WHERE id = ?', [lastId]);
    if (!login) login = dbGet('SELECT * FROM client_logins WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(login ? { id: login.id, clientId: login.clientId, email: login.email, createdAt: login.createdAt } : { success: true });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id/update-login', (req, res) => {
  try {
    const login = dbGet('SELECT * FROM client_logins WHERE clientId = ?', [req.params.id]);
    if (!login) return res.status(404).json({ error: 'No login found for this client' });

    const { email, password } = req.body;
    dbRun(
      'UPDATE client_logins SET email = ?, passwordHash = ? WHERE clientId = ?',
      [email ?? login.email, password ?? login.passwordHash, req.params.id]
    );

    const updated = dbGet('SELECT * FROM client_logins WHERE clientId = ?', [req.params.id]);
    res.json({ id: updated.id, clientId: updated.clientId, email: updated.email });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id/login-info', (req, res) => {
  try {
    const login = dbGet('SELECT * FROM client_logins WHERE clientId = ?', [req.params.id]);
    if (!login) {
      return res.json({ hasLogin: false, email: null, lastLogin: null });
    }
    res.json({ hasLogin: true, email: login.email, lastLogin: login.lastLogin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Client Portal Routes
// ---------------------------------------------------------------------------
app.get('/api/portal/profile/:clientId', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.clientId]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/business-setup/:clientId', (req, res) => {
  try {
    const steps = dbAll('SELECT * FROM business_setup WHERE clientId = ? ORDER BY id ASC', [req.params.clientId]);
    res.json(steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/funding-plan/:clientId', (req, res) => {
  try {
    const plan = dbGet(
      "SELECT * FROM funding_plans WHERE clientId = ? AND status = 'active' ORDER BY createdAt DESC LIMIT 1",
      [req.params.clientId]
    );
    if (!plan) {
      // Fall back to the latest plan of any status
      const latestPlan = dbGet(
        'SELECT * FROM funding_plans WHERE clientId = ? ORDER BY createdAt DESC LIMIT 1',
        [req.params.clientId]
      );
      return res.json(latestPlan || null);
    }
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/applications/:clientId', async (req, res) => {
  try {
    const apps = dbAll('SELECT * FROM applications WHERE clientId = ? ORDER BY dateApplied DESC', [req.params.clientId]);

    // For denied applications, generate AI next steps
    const appsWithNextSteps = [];
    for (const app of apps) {
      if (app.status === 'denied') {
        try {
          const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.clientId]);
          const nextSteps = await callClaude(
            `You are a business funding consultant. A client's application was denied. Provide 3-5 brief, specific next steps they should take. Be concise — each step should be 1-2 sentences max. Consider the bank's known requirements, the client's credit profile, and timing strategies.

${BANK_DATABASE}`,
            `Application denied:
- Bank: ${app.bankName || 'Unknown'}
- Bureau: ${app.bureau || 'Unknown'}
- Product: ${app.product || 'Business Credit Card'}
- Date Applied: ${app.dateApplied || 'Unknown'}
- Notes: ${app.notes || 'None'}

Client Credit Scores:
- Experian: ${client ? client.creditScoreExperian || 'N/A' : 'N/A'}
- Equifax: ${client ? client.creditScoreEquifax || 'N/A' : 'N/A'}
- TransUnion: ${client ? client.creditScoreTransUnion || 'N/A' : 'N/A'}

Inquiries:
- Experian: ${client ? client.totalInquiriesExperian || 0 : 0}
- Equifax: ${client ? client.totalInquiriesEquifax || 0 : 0}
- TransUnion: ${client ? client.totalInquiriesTransUnion || 0 : 0}

What should the client do next?`
          );
          appsWithNextSteps.push({ ...app, aiNextSteps: nextSteps });
        } catch (_aiErr) {
          appsWithNextSteps.push({ ...app, aiNextSteps: null });
        }
      } else {
        appsWithNextSteps.push({ ...app, aiNextSteps: null });
      }
    }

    res.json(appsWithNextSteps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/credit-changes/:clientId', (req, res) => {
  try {
    const changes = dbAll('SELECT * FROM credit_changes WHERE clientId = ? ORDER BY changeDate DESC', [req.params.clientId]);
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Credit Changes (Admin)
// ---------------------------------------------------------------------------
app.get('/api/clients/:id/credit-changes', (req, res) => {
  try {
    const changes = dbAll('SELECT * FROM credit_changes WHERE clientId = ? ORDER BY changeDate DESC', [req.params.id]);
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/credit-changes', (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const c = req.body;
    const scoreDelta = (c.newScore || 0) - (c.previousScore || 0);
    const now = new Date().toISOString();

    const { lastId } = dbRun(
      `INSERT INTO credit_changes (clientId, changeDate, bureau, previousScore, newScore, scoreDelta, factor, factorType, action, notes, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.params.id, c.changeDate || now, c.bureau || null,
        c.previousScore || null, c.newScore || null, scoreDelta,
        c.factor || null, c.factorType || null, c.action || null,
        c.notes || null, now,
      ]
    );

    let change = dbGet('SELECT * FROM credit_changes WHERE id = ?', [lastId]);
    if (!change) change = dbGet('SELECT * FROM credit_changes WHERE clientId = ? ORDER BY id DESC LIMIT 1', [req.params.id]);
    res.status(201).json(change || { id: lastId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/credit-changes/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM credit_changes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Credit change not found' });

    const c = req.body;
    const newPrev = c.previousScore ?? existing.previousScore;
    const newNew = c.newScore ?? existing.newScore;
    const scoreDelta = (newNew || 0) - (newPrev || 0);

    dbRun(
      `UPDATE credit_changes SET changeDate=?, bureau=?, previousScore=?, newScore=?, scoreDelta=?, factor=?, factorType=?, action=?, notes=?
       WHERE id=?`,
      [
        c.changeDate ?? existing.changeDate, c.bureau ?? existing.bureau,
        newPrev, newNew, scoreDelta,
        c.factor ?? existing.factor, c.factorType ?? existing.factorType,
        c.action ?? existing.action, c.notes ?? existing.notes,
        req.params.id,
      ]
    );

    const updated = dbGet('SELECT * FROM credit_changes WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/credit-changes/:id', (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM credit_changes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Credit change not found' });
    dbRun('DELETE FROM credit_changes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Credit change deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI: Generate Corrective Actions
// ---------------------------------------------------------------------------
app.post('/api/clients/:id/generate-corrective-actions', async (req, res) => {
  try {
    const client = dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { bureau, previousScore, newScore, factor } = req.body;
    if (!bureau || previousScore == null || newScore == null || !factor) {
      return res.status(400).json({ error: 'bureau, previousScore, newScore, and factor are required' });
    }

    const scoreDelta = newScore - previousScore;

    const systemPrompt = `You are an expert credit repair and optimization specialist. Generate specific, actionable corrective actions and mitigation strategies based on a credit score change.

CREDIT REPAIR BEST PRACTICES:
1. Dispute inaccuracies with bureaus under FCRA Section 611 — always verify data accuracy first
2. Reduce credit utilization below 30% (ideally under 10%) — use AZEO strategy (All Zero Except One)
3. Become an authorized user on aged accounts (5+ years, low utilization, perfect payment history)
4. Request credit limit increases (CLIs) on existing cards — soft pull CLIs preferred (Amex, Chase)
5. Pay collections and charge-offs — negotiate pay-for-delete or settlement letters
6. Don't close old accounts — average age of accounts matters
7. Limit new hard inquiries — space applications 30+ days apart, max 3 per bureau per 6 months
8. Set up automatic payments to prevent future late payments
9. Use a credit monitoring service to catch issues early
10. Consider a goodwill letter for one-time late payments on otherwise perfect accounts
11. Rapid rescore through mortgage broker if time-sensitive (2-3 business days)
12. Balance transfer to reduce high-utilization cards
13. Report rent/utilities to bureaus for additional positive tradelines

FORMAT: Return a JSON object with this structure:
{
  "analysis": "Brief analysis of what the score change means",
  "correctiveActions": [
    { "priority": 1, "action": "Specific action", "expectedImpact": "Expected point improvement", "timeline": "How long" }
  ],
  "mitigationStrategies": [
    { "strategy": "Specific mitigation", "detail": "How to implement" }
  ]
}`;

    const userPrompt = `A client's credit score changed. Generate corrective actions and mitigation strategies.

CLIENT: ${client.firstName} ${client.lastName}
BUREAU: ${bureau}
PREVIOUS SCORE: ${previousScore}
NEW SCORE: ${newScore}
SCORE DELTA: ${scoreDelta > 0 ? '+' : ''}${scoreDelta}
FACTOR (what changed): ${factor}

CURRENT SCORES:
- Experian: ${client.creditScoreExperian || 'N/A'}
- Equifax: ${client.creditScoreEquifax || 'N/A'}
- TransUnion: ${client.creditScoreTransUnion || 'N/A'}

CURRENT INQUIRIES:
- Experian: ${client.totalInquiriesExperian || 0}
- Equifax: ${client.totalInquiriesEquifax || 0}
- TransUnion: ${client.totalInquiriesTransUnion || 0}

Generate specific corrective actions and mitigation strategies for this score change.`;

    const aiResponse = await callClaude(systemPrompt, userPrompt);

    // Try to parse as JSON, fall back to raw text
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch (_parseErr) {
      parsed = { raw: aiResponse };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Bank Locator (AI)
// ---------------------------------------------------------------------------
app.post('/api/bank-locator', async (req, res) => {
  try {
    const { state, bureauFilter } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'state is required' });
    }

    const systemPrompt = `You are an expert business funding strategist. Generate a comprehensive list of banks available in a given state that offer 0% intro rate business credit cards and lines of credit. Group them by which credit bureau they pull from.

${BANK_DATABASE}

IMPORTANT INSTRUCTIONS:
1. Include all banks from the database above that operate in the requested state
2. Add additional regional/local banks, credit unions, and community banks you know about for that state
3. Group results by bureau pulled (Experian, Equifax, TransUnion, Multiple)
4. For each bank include: name, product type, typical intro APR period, estimated credit limit range, bureau pulled, and any special requirements
5. Suggest an optimal application sequence based on bureau rotation to minimize inquiry impact
6. Reference bankbranchlocator.com as the source clients should use to verify branch availability in their area
7. Note any state-specific banking regulations or opportunities

FORMAT: Return a JSON object with this structure:
{
  "state": "STATE",
  "banks": {
    "Experian": [ { "name": "...", "product": "...", "introAPR": "...", "estimatedLimit": "...", "requirements": "...", "notes": "..." } ],
    "Equifax": [ ... ],
    "TransUnion": [ ... ],
    "Multiple": [ ... ]
  },
  "optimalSequence": [
    { "order": 1, "bank": "...", "bureau": "...", "timing": "...", "reasoning": "..." }
  ],
  "stateNotes": "Any state-specific info",
  "verificationNote": "Verify branch availability at bankbranchlocator.com"
}`;

    const bureauNote = bureauFilter ? `\nFOCUS: Only show banks that pull from ${bureauFilter}.` : '';

    const userPrompt = `List all banks in ${state} that offer 0% intro rate business credit cards and lines of credit.${bureauNote}

Include national banks with branches in ${state}, regional banks, credit unions, and community banks. Group by bureau and suggest an optimal application sequence.`;

    const aiResponse = await callClaude(systemPrompt, userPrompt);

    // Try to parse as JSON, fall back to raw text
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch (_parseErr) {
      parsed = { raw: aiResponse };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve React frontend in production
// ---------------------------------------------------------------------------
const CLIENT_BUILD = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Fund Flow Mastery server running on port ${PORT}`);
      console.log(`Database: ${DB_PATH}`);
      console.log(`AI features: ${ANTHROPIC_API_KEY ? 'enabled' : 'DISABLED (set ANTHROPIC_API_KEY)'}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
