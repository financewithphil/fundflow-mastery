// Dispute letter templates for credit inquiry removal
// Based on Fund Flow Mastery Inquiry Removal SOP

export const DISPUTE_TYPES = {
  hardInquiry: {
    name: 'Hard Inquiry Removal',
    description: 'Request removal of unauthorized hard inquiries from credit report'
  },
  latePayment: {
    name: 'Late Payment Dispute',
    description: 'Dispute inaccurate late payment reporting'
  },
  accountDispute: {
    name: 'Account Information Dispute',
    description: 'Dispute inaccurate account information'
  },
  collectionDispute: {
    name: 'Collection Account Dispute',
    description: 'Dispute collection accounts that are inaccurate or unverifiable'
  },
  personalInfo: {
    name: 'Personal Information Correction',
    description: 'Correct inaccurate personal information on credit report'
  },
  cfpbComplaint: {
    name: 'CFPB Complaint',
    description: 'File complaint with Consumer Financial Protection Bureau'
  },
  ftcReport: {
    name: 'FTC Identity Theft Report',
    description: 'File identity theft report with Federal Trade Commission'
  }
};

export const BUREAU_ADDRESSES = {
  Experian: {
    name: 'Experian',
    address: 'P.O. Box 4500, Allen, TX 75013',
    phone: '1-888-397-3742',
    online: 'www.experian.com/disputes'
  },
  Equifax: {
    name: 'Equifax Information Services LLC',
    address: 'P.O. Box 740256, Atlanta, GA 30374',
    phone: '1-866-349-5191',
    online: 'www.equifax.com/personal/credit-report-services'
  },
  TransUnion: {
    name: 'TransUnion LLC',
    address: 'P.O. Box 2000, Chester, PA 19016',
    phone: '1-800-916-8800',
    online: 'www.transunion.com/credit-disputes'
  }
};

// Letter templates with placeholders
export const LETTER_TEMPLATES = {
  hardInquiry: {
    subject: 'Dispute of Unauthorized Hard Inquiry — Request for Immediate Removal',
    body: `[CLIENT_NAME]
[CLIENT_ADDRESS]
[CLIENT_CITY_STATE_ZIP]

[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute of Unauthorized Hard Inquiry
SSN: XXX-XX-[SSN_LAST4]
DOB: [DOB]

To Whom It May Concern:

I am writing to formally dispute the following hard inquiry on my [BUREAU] credit report, which I did not authorize:

Creditor Name: [CREDITOR_NAME]
Date of Inquiry: [INQUIRY_DATE]

Under the Fair Credit Reporting Act (FCRA), Section 604, a credit inquiry can only appear on my credit report if I have given written authorization for that specific creditor to access my credit file. I have no record of authorizing this inquiry and did not apply for credit with this company.

I am requesting that you:
1. Investigate this unauthorized inquiry immediately
2. Contact [CREDITOR_NAME] to verify they had permissible purpose to access my credit file
3. Remove this inquiry from my credit report if they cannot provide proof of written authorization

Under FCRA Section 611, you are required to complete this investigation within 30 days of receiving this dispute. If the inquiry cannot be verified as authorized, it must be removed immediately.

Please send me written confirmation of your investigation results and any corrections made to my credit report.

Sincerely,

[CLIENT_NAME]

Enclosures:
- Copy of government-issued photo ID
- Copy of Social Security Card
- Proof of address (utility bill or bank statement)`
  },

  latePayment: {
    subject: 'Dispute of Inaccurate Late Payment Reporting',
    body: `[CLIENT_NAME]
[CLIENT_ADDRESS]
[CLIENT_CITY_STATE_ZIP]

[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute of Late Payment — Account #[ACCOUNT_NUMBER]
SSN: XXX-XX-[SSN_LAST4]
DOB: [DOB]

To Whom It May Concern:

I am writing to dispute the following late payment(s) reported on my credit file, which I believe to be inaccurate:

Creditor: [CREDITOR_NAME]
Account Number: [ACCOUNT_NUMBER]
Date(s) Reported Late: [LATE_DATES]
Reported Status: [REPORTED_STATUS]

[DISPUTE_REASON]

Under the Fair Credit Reporting Act (FCRA), Section 623, furnishers of information have a duty to report accurate information. I am requesting that you investigate this matter and correct the inaccuracy.

Under FCRA Section 611, you are required to:
1. Conduct a reasonable investigation within 30 days
2. Forward all relevant information I provide to the furnisher
3. Remove or modify any information found to be inaccurate or unverifiable

Please send me written confirmation of your findings and any corrections.

Sincerely,

[CLIENT_NAME]

Enclosures:
- Copy of government-issued photo ID
- Supporting documentation`
  },

  collectionDispute: {
    subject: 'Dispute and Validation Request — Collection Account',
    body: `[CLIENT_NAME]
[CLIENT_ADDRESS]
[CLIENT_CITY_STATE_ZIP]

[DATE]

[BUREAU_NAME]
[BUREAU_ADDRESS]

Re: Dispute of Collection Account
SSN: XXX-XX-[SSN_LAST4]
DOB: [DOB]

To Whom It May Concern:

I am writing to dispute the following collection account appearing on my credit report:

Collection Agency: [CREDITOR_NAME]
Account Number: [ACCOUNT_NUMBER]
Amount Claimed: [AMOUNT]
Original Creditor: [ORIGINAL_CREDITOR]

I do not recognize this debt and/or believe the information reported is inaccurate. Under the Fair Credit Reporting Act (FCRA) and the Fair Debt Collection Practices Act (FDCPA), I am requesting:

1. Complete validation of this debt, including:
   - Original signed contract or agreement
   - Complete payment history from the original creditor
   - Proof that the collection agency has legal authority to collect
   - Verification of the amount claimed

2. If validation cannot be provided within 30 days, immediate removal of this account from all three credit bureaus.

Under FCRA Section 611, any information that cannot be verified must be removed. Please investigate and provide written confirmation of your findings.

Sincerely,

[CLIENT_NAME]

Enclosures:
- Copy of government-issued photo ID
- Copy of Social Security Card`
  },

  cfpbComplaint: {
    subject: 'CFPB Complaint — Failure to Investigate Dispute / Inaccurate Reporting',
    body: `CONSUMER FINANCIAL PROTECTION BUREAU COMPLAINT

Filed via: www.consumerfinance.gov/complaint

Complaint Type: Credit Reporting
Company Complained About: [BUREAU_NAME]

Consumer Information:
Name: [CLIENT_NAME]
Address: [CLIENT_ADDRESS], [CLIENT_CITY_STATE_ZIP]
SSN Last 4: [SSN_LAST4]
DOB: [DOB]

What Happened:
On [DISPUTE_DATE], I submitted a formal dispute to [BUREAU_NAME] regarding [DISPUTE_DESCRIPTION]. Under the Fair Credit Reporting Act (FCRA) Section 611, the credit bureau is required to conduct a reasonable investigation within 30 days and remove any information that is inaccurate or cannot be verified.

[ADDITIONAL_DETAILS]

Despite my dispute, [BUREAU_NAME] has [failed to investigate / failed to remove inaccurate information / provided a generic response without conducting a proper investigation].

Desired Resolution:
I am requesting that [BUREAU_NAME]:
1. Conduct a thorough and reasonable investigation as required by FCRA
2. Remove the disputed inaccurate information from my credit report
3. Provide written confirmation of the investigation results and any corrections

Supporting Documents Attached:
- Original dispute letter sent to [BUREAU_NAME]
- Certified mail receipt / proof of delivery
- Copy of credit report showing disputed item(s)
- Any response received from [BUREAU_NAME]
- Government-issued photo ID`
  },

  ftcReport: {
    subject: 'FTC Identity Theft Report',
    body: `FEDERAL TRADE COMMISSION — IDENTITY THEFT REPORT

Filed via: www.identitytheft.gov

Victim Information:
Name: [CLIENT_NAME]
Address: [CLIENT_ADDRESS], [CLIENT_CITY_STATE_ZIP]
SSN Last 4: [SSN_LAST4]
DOB: [DOB]
Phone: [PHONE]
Email: [EMAIL]

Type of Identity Theft:
[x] Someone opened new accounts in my name
[ ] Someone used my existing accounts
[ ] Other: _______________

Fraudulent Account(s):
Company: [CREDITOR_NAME]
Account Number (if known): [ACCOUNT_NUMBER]
Date Opened/Applied: [INQUIRY_DATE]
Amount: [AMOUNT]

Description of Events:
I recently reviewed my credit report and discovered [DESCRIPTION]. I did not authorize this activity and believe my personal information was used without my consent to [open accounts / make inquiries / obtain credit] fraudulently.

Actions Already Taken:
1. Filed dispute(s) with credit bureau(s): [BUREAUS_DISPUTED]
2. Placed fraud alert on credit reports
3. [Additional actions taken]

I declare under penalty of perjury that the information provided is true and correct to the best of my knowledge.

[CLIENT_NAME]
[DATE]`
  }
};

export const BUSINESS_SETUP_STEPS = [
  { id: 'entity', name: 'Entity Formation / Shelf Corp', description: 'Form LLC or acquire shelf corporation (Waiters Capital — $1,000, Minnesota-based)', status: 'pending' },
  { id: 'foreignFiling', name: 'Foreign Filing', description: 'File foreign entity registration in client\'s home state', status: 'pending' },
  { id: 'ein', name: 'EIN Application', description: 'Apply for Employer Identification Number with IRS', status: 'pending' },
  { id: 'domain', name: 'Domain & Email', description: 'Purchase matching domain on GoDaddy (~$25/mo) + set up info@businessname.com email', status: 'pending' },
  { id: 'address', name: 'Business Address', description: 'Set up virtual address via iPostal1.com (~$39.99/mo Prestige). Must be same state as home, professional building.', status: 'pending' },
  { id: 'phone', name: 'Business Phone', description: 'Set up business phone number (forward to cell). Record professional voicemail.', status: 'pending' },
  { id: 'form1583', name: 'Form 1583 (USPS)', description: 'Complete USPS Form 1583 for mail forwarding. Requires 2 forms of ID + online notarization.', status: 'pending' },
  { id: 'bankAccount', name: 'Business Bank Account', description: 'Open business checking (Chase and/or Wells Fargo recommended)', status: 'pending' },
  { id: 'website', name: 'Business Website', description: 'Build simple business website on the purchased domain', status: 'pending' }
];
