#!/bin/bash
# Seed Michael Price test client data
# Run against live instance: ./seed-michael.sh https://fundflow-mastery.onrender.com
# Run against local: ./seed-michael.sh http://localhost:3001

BASE="${1:-http://localhost:3001}"
echo "Seeding to: $BASE"

# 1. Create client from real onboarding form + credit report data
CLIENT_ID=$(curl -s -X POST "$BASE/api/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Michael",
    "lastName": "Price",
    "email": "kccgllc@gmail.com",
    "phone": "+18162695218",
    "dob": "1963-02-09",
    "ssn": "487748855",
    "mothersMaidenName": "Price",
    "housingStatus": "Home owner",
    "housingYears": "3yrs",
    "monthlyHousing": 2271,
    "creditScoreExperian": 778,
    "creditScoreEquifax": 758,
    "creditScoreTransunion": 773,
    "totalInquiriesExperian": 0,
    "totalInquiriesEquifax": 2,
    "totalInquiriesTransunion": 4,
    "fundingGoal": "$200k+",
    "fundingPurpose": "Real Estate investment",
    "businessName": "",
    "entityType": "N/A",
    "hasBusiness": "No",
    "ownershipPct": "100%",
    "bizPhone": "",
    "bizAddress": "",
    "bizWebsite": "",
    "bizRevenue": "",
    "bizState": "CO",
    "naicsCode": ""
  }' | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")

echo "Created client ID: $CLIENT_ID"

if [ -z "$CLIENT_ID" ]; then
  echo "ERROR: Failed to create client"
  exit 1
fi

# 2. Create client login for portal access
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/create-login" \
  -H "Content-Type: application/json" \
  -d '{"email": "kccgllc@gmail.com", "password": "FundFlow2025!"}' > /dev/null
echo "Created portal login"

# 3. Create funding plan — based on the $150K flow sequence
# Michael has: EX 0 inquiries (12 banks available), EQ 2 (room for 1 more), TU 4 (at capacity)
# Optimal sequence: Experian-first banks since 0 inquiries there
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/funding-plans" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "full_plan",
    "status": "active",
    "content": "## Fund Flow Plan — Michael Price\n\n### Credit Profile Summary\n- **Experian:** 778 (0 inquiries — CLEAN SLATE)\n- **Equifax:** 758 (2 inquiries — room for 1 more)\n- **TransUnion:** 773 (4 inquiries — AT CAPACITY)\n\n### Strategy\nMichael has an excellent credit profile (750+ across all 3 bureaus) with Experian completely clean at 0 inquiries. This is ideal for the $150K flow sequence starting with Experian-pull banks.\n\n### Phase 1: Experian Banks (0 inquiries → 3)\n1. **Chase Sapphire Preferred** — Apply in-branch with BRM. Sweet numbers: $85K income, $175K revenue. Expected: $15K-25K\n2. **Chase Ink Business Preferred** — Same BRM visit, business card. Expected: $10K-20K\n3. **American Express Blue Business Plus** — Online app. Expected: $15K-25K\n\n### Phase 2: Equifax Banks (2 inquiries → 3)\n4. **Truist Business Credit** — In-branch BRM. Sweet numbers: $80K income, $150K revenue. Expected: $10K-20K\n\n### Phase 3: Wait 30 Days (Velocity Reset)\nAllow inquiry dust to settle before Phase 4.\n\n### Phase 4: Experian Round 2\n5. **Bank of America Business Advantage** — In-branch with BRM. Expected: $10K-25K\n6. **Amazon Business Line of Credit** — Online. Expected: $10K-15K\n\n### Projected Total: $70K-$130K\n\n### Pre-Application Checklist\n- [ ] Register LLC or Sole Prop with state\n- [ ] Get EIN from IRS\n- [ ] Open business checking (Chase recommended)\n- [ ] Get business phone number\n- [ ] Set up simple website/landing page\n\n### Velocity Rules\n- Max 3 inquiries per bureau\n- Max 5 applications per day\n- Max 12 applications in 30-day rolling window\n- Wait 91+ days between apps to same bank"
  }' > /dev/null
echo "Created funding plan"

# 4. Create applications following the funding sequence (all approved — this IS the designed sequence)
# Phase 1: Experian banks
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"bankKey\": \"chase\",
    \"bankName\": \"Chase\",
    \"bureau\": \"Experian\",
    \"product\": \"Sapphire Preferred\",
    \"method\": \"In-Branch (BRM)\",
    \"dateApplied\": \"2025-10-01\",
    \"status\": \"approved\",
    \"approvedAmount\": 22000,
    \"notes\": \"Phase 1 — Experian clean slate. BRM appointment, used sweet numbers. Approved same day.\"
  }" > /dev/null

curl -s -X POST "$BASE/api/clients/$CLIENT_ID/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"bankKey\": \"chase\",
    \"bankName\": \"Chase\",
    \"bureau\": \"Experian\",
    \"product\": \"Ink Business Preferred\",
    \"method\": \"In-Branch (BRM)\",
    \"dateApplied\": \"2025-10-01\",
    \"status\": \"approved\",
    \"approvedAmount\": 15000,
    \"notes\": \"Phase 1 — Same BRM visit as Sapphire. Business card approved alongside personal.\"
  }" > /dev/null

curl -s -X POST "$BASE/api/clients/$CLIENT_ID/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"bankKey\": \"amex\",
    \"bankName\": \"American Express\",
    \"bureau\": \"Experian\",
    \"product\": \"Blue Business Plus\",
    \"method\": \"Online\",
    \"dateApplied\": \"2025-10-03\",
    \"status\": \"approved\",
    \"approvedAmount\": 20000,
    \"notes\": \"Phase 1 — Applied online 2 days after Chase. 0% intro APR for 12 months.\"
  }" > /dev/null

# Phase 2: Equifax bank (2 inquiries → 3)
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"bankKey\": \"truist\",
    \"bankName\": \"Truist\",
    \"bureau\": \"Equifax\",
    \"product\": \"Business Credit Line\",
    \"method\": \"In-Branch (BRM)\",
    \"dateApplied\": \"2025-10-07\",
    \"status\": \"approved\",
    \"approvedAmount\": 15000,
    \"notes\": \"Phase 2 — Equifax had room for 1 more inquiry. BRM appointment, used sweet numbers.\"
  }" > /dev/null

# Phase 4: After 30-day velocity reset
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"bankKey\": \"boa\",
    \"bankName\": \"Bank of America\",
    \"bureau\": \"Experian\",
    \"product\": \"Business Advantage\",
    \"method\": \"In-Branch (BRM)\",
    \"dateApplied\": \"2025-11-10\",
    \"status\": \"pending\",
    \"approvedAmount\": 0,
    \"notes\": \"Phase 4 — Applied after 30-day velocity reset. Awaiting decision.\"
  }" > /dev/null

echo "Created 5 applications (4 approved, 1 pending)"

# 5. Business setup steps
for step in "Register Business Entity:completed" "Get EIN from IRS:completed" "Get Business Phone Number:completed" "Open Business Checking Account:in_progress" "Get Business Address:not_started" "Register Domain/Website:not_started" "Get DUNS Number:not_started" "Set Up Business Credit File:not_started" "Build Business Credit:not_started"; do
  IFS=':' read -r name status <<< "$step"
  curl -s -X POST "$BASE/api/clients/$CLIENT_ID/business-setup" \
    -H "Content-Type: application/json" \
    -d "{\"stepName\": \"$name\", \"status\": \"$status\"}" > /dev/null
done
echo "Created 9 business setup steps"

# 6. Credit changes timeline
curl -s -X POST "$BASE/api/clients/$CLIENT_ID/credit-changes" \
  -H "Content-Type: application/json" \
  -d '{
    "bureau": "Experian",
    "previousScore": 770,
    "newScore": 778,
    "scoreDelta": 8,
    "changeDate": "2025-09-15",
    "factors": "Reduced credit utilization from 12% to 5%, oldest account aged past 10 years",
    "action": "Continue keeping utilization under 10%. Do not close old accounts."
  }' > /dev/null

curl -s -X POST "$BASE/api/clients/$CLIENT_ID/credit-changes" \
  -H "Content-Type: application/json" \
  -d '{
    "bureau": "Equifax",
    "previousScore": 752,
    "newScore": 758,
    "scoreDelta": 6,
    "changeDate": "2025-09-15",
    "factors": "Hard inquiry from Wells Fargo aging past 6 months, reduced utilization",
    "action": "Wells Fargo inquiry will continue to age off. Monitor Equifax — only 1 inquiry slot remaining."
  }' > /dev/null

curl -s -X POST "$BASE/api/clients/$CLIENT_ID/credit-changes" \
  -H "Content-Type: application/json" \
  -d '{
    "bureau": "TransUnion",
    "previousScore": 768,
    "newScore": 773,
    "scoreDelta": 5,
    "changeDate": "2025-09-15",
    "factors": "Oldest SoFi inquiry aging, on-time payment streak 36+ months",
    "action": "TransUnion at 4 inquiries — do NOT apply to any TU-pull banks. Wait for inquiries to age off (24 months)."
  }' > /dev/null

echo "Created 3 credit change entries"

echo ""
echo "=== SEED COMPLETE ==="
echo "Client: Michael Price (ID: $CLIENT_ID)"
echo "Portal login: kccgllc@gmail.com / FundFlow2025!"
echo "Funding: \$72K approved across 4 banks, 1 pending"
echo "Plan: Full plan (active) with $150K flow sequence"
