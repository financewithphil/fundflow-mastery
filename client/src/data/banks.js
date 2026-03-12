// Bank data extracted from Fund Flow Mastery SOPs
// Data Points for Funding Applications + Major Bank Funding Guidelines

export const BANKS = {
  // ============ EXPERIAN PULLS ============
  chase: {
    name: 'Chase',
    bureau: 'Experian',
    products: ['Ink Business Unlimited (0% 12mo)', 'Ink Business Cash (0% 12mo)'],
    sweetNumbers: { bizRevenue: '$575,000–$800,000', personalIncome: '$75,000–$100,000 less than GAR', monthlySpend: '$25,000–$35,000', creditLineRequest: '$35,000' },
    requirements: ['Business checking account recommended', 'Private banking hack for $20K+ limits'],
    notes: 'Freeze TransUnion before applying. 5/24 rule: decline if 5+ personal cards opened anywhere in 24 months. Max 2 cards in 30 days.',
    recon: '1-888-609-7805',
    method: ['In-Person', 'Online'],
    introAPR: '0% for 12 months',
    rules: { maxCards30Days: 2, rule524: true }
  },
  amex: {
    name: 'American Express',
    bureau: 'Experian',
    products: ['Business Blue Cash Preferred (0% 12mo)', 'Blue Business Plus'],
    sweetNumbers: { bizRevenue: '$275,000–$320,000' },
    requirements: ['Can apply for Blue Plus 8 days after Blue Cash approval'],
    notes: '90-day rule: max 2 cards per 90 days. Only 1 Platinum variant per 90 days. Max 10 NPSL cards. Same-day inquiries combined if both approved same day.',
    recon: '1-800-567-1083',
    method: ['Online'],
    introAPR: '0% for 12 months',
    rules: { maxCards90Days: 2 }
  },
  fnbo: {
    name: 'First National Bank of Omaha (FNBO)',
    bureau: 'Experian',
    products: ['Business Edition Card (0% 12mo)'],
    sweetNumbers: { bizRevenue: '$225,000–$275,000' },
    requirements: ['Webstaurant easiest approval path'],
    notes: '',
    method: ['Online'],
    introAPR: '0% for 12 months'
  },
  pnc: {
    name: 'PNC Bank',
    bureau: 'Experian',
    products: ['Business Credit Card'],
    sweetNumbers: { bizRevenue: '$275,000–$320,000' },
    requirements: ['30-day relationship required before applying'],
    notes: 'Must have existing PNC business account for 30+ days.',
    method: ['In-Person', 'Online']
  },
  navyFederal: {
    name: 'Navy Federal Credit Union',
    bureau: 'Experian',
    products: ['Business Credit Card'],
    sweetNumbers: { personalIncome: '$160,000+' },
    requirements: ['$250 deposit required', 'Military/DoD affiliation'],
    notes: '$10K–$25K typical limits.',
    method: ['Online']
  },
  paypal: {
    name: 'PayPal Business',
    bureau: 'Experian',
    products: ['PayPal Business Cashback Mastercard'],
    sweetNumbers: {},
    requirements: [],
    notes: '',
    method: ['Online']
  },
  serviceCU: {
    name: 'Service Credit Union',
    bureau: 'Experian',
    products: ['Business Visa'],
    sweetNumbers: {},
    requirements: [],
    notes: '',
    method: ['Online']
  },
  bethpage: {
    name: 'Bethpage Federal Credit Union',
    bureau: 'Experian',
    products: ['Business Credit Card'],
    sweetNumbers: {},
    requirements: [],
    notes: '',
    method: ['Online']
  },
  usBank: {
    name: 'US Bank',
    bureau: 'Experian',
    products: ['Business Cash Rewards', 'Business Leverage Card'],
    sweetNumbers: { bizRevenue: '$325,000–$375,000' },
    requirements: ['Must apply in-branch', 'Freeze IDA/ARS before applying'],
    notes: 'Does NOT report business cards on personal credit. Recon: 1-800-685-7680.',
    recon: '1-800-685-7680',
    method: ['In-Person'],
    rules: { noPersonalReporting: true }
  },
  tdBank: {
    name: 'TD Bank',
    bureau: 'Experian',
    products: ['Business Solutions Card', 'Business Line of Credit (up to $100K)'],
    sweetNumbers: {},
    requirements: ['$25K LOC hack for new LLCs'],
    notes: 'Up to $100K LOC available.',
    method: ['In-Person', 'Online']
  },
  valleyNational: {
    name: 'Valley National Bank',
    bureau: 'Experian',
    products: ['Business Credit Card', 'Non-doc LOC (up to $100K)'],
    sweetNumbers: { bizRevenue: '$375,000–$425,000' },
    requirements: [],
    notes: 'Non-doc up to $100K available.',
    method: ['In-Person']
  },
  mtBank: {
    name: 'M&T Bank',
    bureau: 'Experian',
    products: ['Business Credit Card', 'Non-doc LOC (up to $100K)'],
    sweetNumbers: { bizRevenue: '$375,000–$425,000' },
    requirements: [],
    notes: 'Non-doc up to $100K available.',
    method: ['In-Person']
  },

  // ============ EQUIFAX PULLS ============
  keyBank: {
    name: 'KeyBank',
    bureau: 'Equifax',
    products: ['Business Credit Card'],
    sweetNumbers: { bizRevenue: '$375,000–$425,000' },
    requirements: ['Must apply in-branch', 'Direct BRM relationship available for NY/NJ'],
    notes: '',
    method: ['In-Person']
  },
  citizens: {
    name: 'Citizens Bank',
    bureau: 'Equifax',
    products: ['Business Platinum Card'],
    sweetNumbers: { bizRevenue: '$375,000+' },
    requirements: ['Soft pull — does not use hard inquiry'],
    notes: 'Soft pull only.',
    method: ['Online']
  },
  truist: {
    name: 'Truist',
    bureau: 'Equifax',
    products: ['Business Credit Card (2 personal + 1 business possible)'],
    sweetNumbers: {},
    requirements: ['Regional — must be in service area'],
    notes: 'Can get 2 personal + 1 business.',
    method: ['In-Person']
  },
  nihFCU: {
    name: 'NIH Federal Credit Union',
    bureau: 'Equifax',
    products: ['Business Credit Card'],
    sweetNumbers: {},
    requirements: ['Soft pull'],
    notes: 'Soft pull only.',
    method: ['Online']
  },
  marcus: {
    name: 'Marcus by Goldman Sachs',
    bureau: 'Equifax',
    products: ['Business Line of Credit'],
    sweetNumbers: { bizRevenue: '$575,000–$650,000' },
    requirements: ['Soft pull for prequalification'],
    notes: 'Soft pull.',
    method: ['Online']
  },

  // ============ TRANSUNION PULLS ============
  boa: {
    name: 'Bank of America',
    bureau: 'TransUnion',
    products: ['Business Advantage Cash Rewards', 'Business Customized Cash'],
    sweetNumbers: { bizRevenue: '$300,000–$350,000' },
    requirements: ['Establish relationship first (deposit account)', 'Apply for 2 same day'],
    notes: 'Max 2 cards/2 months, 3/12 months, 4/24 months. 2/6 rule: max 2 cards from any issuer in 12 months unless BOA account holder (then 6). Pulls Experian too in some cases.',
    method: ['In-Person', 'Online'],
    rules: { maxCards2Months: 2, maxCards12Months: 3, maxCards24Months: 4 }
  },
  barclays: {
    name: 'Barclays',
    bureau: 'TransUnion',
    products: ['Aviator Business Mastercard'],
    sweetNumbers: {},
    requirements: [],
    notes: '',
    method: ['Online']
  },
  teachersFed: {
    name: 'Teachers Federal Credit Union',
    bureau: 'TransUnion',
    products: ['Business Credit Card'],
    sweetNumbers: {},
    requirements: [],
    notes: '',
    method: ['Online']
  },
  bhg: {
    name: 'BHG Financial',
    bureau: 'TransUnion',
    products: ['Business Line of Credit'],
    sweetNumbers: {},
    requirements: ['No personal credit report required'],
    notes: 'Does not pull personal credit.',
    method: ['Online']
  },
  elan: {
    name: 'Elan Financial (Webster/Ameris/Pinnacle FCU)',
    bureau: 'TransUnion',
    products: ['Business Credit Card (0% 18mo)'],
    sweetNumbers: { bizRevenue: '$575,000–$625,000' },
    requirements: ['CAN DOUBLE DIP — apply at two Elan-backed banks same day'],
    notes: '0% for 18 months. Double dip strategy available.',
    method: ['Online'],
    introAPR: '0% for 18 months'
  },
  wellsFargo: {
    name: 'Wells Fargo',
    bureau: 'Experian',
    products: ['Business Platinum Card', 'Active Cash Business'],
    sweetNumbers: {},
    requirements: [],
    notes: 'May not qualify for 2nd card if one opened in last 6 months. Card expedition $16.',
    method: ['In-Person', 'Online']
  }
};

// $150K Flow Sequence from SOPs
export const FLOW_SEQUENCE_150K = [
  { step: 1, bank: 'chase', product: 'Ink Business Unlimited', bureau: 'Experian' },
  { step: 2, bank: 'chase', product: 'Ink Business Cash', bureau: 'Experian' },
  { step: 3, bank: 'truist', product: 'Business Card #1', bureau: 'Equifax' },
  { step: 4, bank: 'truist', product: 'Business Card #2', bureau: 'Equifax' },
  { step: 5, bank: 'amex', product: 'Amazon Business Card', bureau: 'Experian' },
  { step: 6, bank: 'amex', product: 'Blue Business Cash', bureau: 'Experian' },
  { step: 7, bank: 'boa', product: 'Business Advantage Cash', bureau: 'TransUnion' }
];

// Velocity & Inquiry Rules
export const VELOCITY_RULES = {
  maxInquiriesPerBureau: 3,
  maxAppsPerBureauPerDay: 2,
  maxAppsPerClientPerDay: 5,
  maxAppsPerBureauRolling30: 6,
  maxAppsPerClientRolling30: 12,
  coolingPeriods: {
    failedRemoval: '7–10 days',
    twoVelocityDeclines: '14 days',
    threeOrMoreDeclines: '30 days',
    internalLenderFlags: '30–45 days',
    majorCreditChanges: '7–14 days'
  }
};

// Sweet Numbers for BRM Introduction
export const SWEET_NUMBERS = {
  grossAnnualRevenue: '$500,000–$1,000,000',
  personalIncome: '$75,000–$100,000 less than GAR',
  monthlyBusinessSpend: '$25,000–$35,000',
  creditLineRequest: '$35,000',
  employees: {
    under2Years: 'Less than 10',
    over2Years: 'More than 10 (e.g., 13)'
  }
};

export const BUREAUS = {
  Experian: Object.keys(BANKS).filter(k => BANKS[k].bureau === 'Experian'),
  Equifax: Object.keys(BANKS).filter(k => BANKS[k].bureau === 'Equifax'),
  TransUnion: Object.keys(BANKS).filter(k => BANKS[k].bureau === 'TransUnion')
};
