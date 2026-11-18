# Claude Prompt: Itsinda — Complete Project Explanation & Investor Presentation (PPT)

## How to use this prompt
Copy everything below the line into Claude and ask it to generate a **PowerPoint (.pptx)** presentation. Claude should produce a clean, modern, investor-ready deck (10–14 slides) that also helps a non-technical founder **fully understand how Itsinda works** so they can present it confidently.

---

## Prompt for Claude

You are an expert product storyteller, fintech educator, and presentation designer. Create a **professional PowerPoint presentation (.pptx)** for **Itsinda**, a digital ledger platform for Rwandan savings groups (ibimina).

### Audience & goal
- **Primary audience:** Investors and partners (fintech, impact, mobile money, cooperatives)
- **Secondary goal:** Help the founder clearly understand the entire project (problem, users, flows, features, money movement, technology, and business model) so they can explain it confidently without technical confusion.

### Design direction
- Clean, modern, trustworthy fintech look (not flashy)
- Brand colors: **Ink #1a1a1a**, **Paper #FAFAF8/#FFFFFF**, **Green accent #17AD17**, **Orange accent #F08519**, subtle gray borders
- Fonts (if available): **Outfit** for headings, **Plus Jakarta Sans** for body; otherwise use a clean sans-serif (Inter/Calibri)
- Use simple diagrams, flow arrows, cards, and comparison tables
- Include speaker notes on each slide with plain-language explanations the founder can read aloud
- Make it easy to present in **English**, but note that the product supports **Kinyarwanda, English, and French** for Rwandan users

---

## What Itsinda is (core understanding)
**Itsinda** is a **phone-first digital ledger for Rwandan savings groups (ibimina/itsinda)**.  
It is **not** a bank and **not** a wallet for sending money to anyone. It is the **official record/book** of a group's savings activities:
- who paid contributions
- who is late and fined
- who borrowed money (loans)
- how repayments are scheduled and tracked
- how much money the group pot holds
- how the pot is distributed at year-end
- what each member's statement shows

**Key promise:** Every franc is recorded once, clearly, and cannot be secretly edited or deleted. If a mistake happens, it is corrected with a **reversal entry** (with a reason), so the history remains visible and trustworthy.

---

## The problem Itsinda solves
Rwandan savings groups (ibimina) often manage real money using notebooks, memory, WhatsApp messages, or spreadsheets.
- Contributions are hard to track and easy to dispute
- Late fines are inconsistent or undocumented
- Loan approvals are informal (no clear schedule, no audit trail)
- Members cannot easily see their own statement
- Mobile money payments (MTN MoMo/Airtel Money) are not reconciled with the group ledger
- End-of-year sharing/distribution is manual and error-prone
- Trust breaks when numbers cannot be explained

---

## Users and roles
- **Member:** joins a group, contributes, can request loans, and views their own records/statement
- **Treasurer:** records money in/out (contributions, fines, repayments, etc.) and helps manage the ledger operations
- **President:** leads the group, manages rules/members, approves decisions (with controls), and oversees distributions
- **System rules (important):**
  - One president and one treasurer (enforced)
  - No self-approval for loans
  - Phone number is the primary identity (no email required to participate)
  - All financial records are append-only (no edit/delete of ledger history)

---

## How the product works (end-to-end user journey)
Explain this clearly as a flow:
1. **Account & identity**
   - User signs up with name + Rwandan phone number + password
   - Phone is verified via OTP (SMS code)
   - User signs in with phone + password
2. **Create or join a group**
   - President creates a group and sets rules: contribution amount (RWF), frequency (weekly/monthly/biweekly context), due day, loan interest %, and other group settings
   - Members are invited/added by phone number
3. **Record contributions (ledger entries)**
   - Treasurer records each contribution against a member and period (e.g. 2026-11)
   - Payment methods can include cash, MTN MoMo, Airtel Money, or bank transfer (with references)
   - Each entry shows who recorded it, when paid, period covered
4. **Handle late payments and fines**
   - Late/missed periods can be identified by rules
   - Fines are recorded as separate ledger lines (not hidden inside contributions) with reasons
5. **Loans**
   - Member requests a loan (amount, term, purpose)
   - Authorized leader approves/rejects (not the borrower/self)
   - Interest/rules are captured; repayment schedule is generated
   - Disbursement and repayments are tracked on the ledger/schedule
6. **Corrections without corruption**
   - Mistakes are not edited/deleted
   - A reversal entry is recorded with a reason; original and reversal both remain visible
7. **Reports & transparency**
   - Group pot/balance, member statements, late-member lists, contribution history, loan status
   - Members can understand: paid, fined, borrowed, repaid, outstanding
8. **Year-end distribution**
   - President records pot distribution (equal or proportional, based on group rules/policy)
   - Shares are stored per membership for accountability
9. **Notifications & integrations**
   - SMS receipts/notifications (Africa's Talking/Pindo/fake in dev)
   - Push notifications (FCM for mobile/web clients where configured)
   - Mobile money integrations (MTN MoMo collection/disbursement; Airtel referenced in product context) to connect payments to records

---

## Money/ledger principles (must be explained simply)
- **Integer RWF only:** amounts stored/handled as whole francs (no decimals/floating-point confusion)
- **Append-only ledger:** no overwriting history
- **Reversals, not edits:** every correction leaves an audit trail
- **Rule-based calculations:** late lists, schedules, and balances follow group rules
- **Auditability:** who did what, when, and why is recorded

---

## What the platform includes (current product scope)
### Backend (FastAPI, production-oriented)
- Python 3.12 + FastAPI (async), PostgreSQL 16, Redis 7, SQLAlchemy 2, Alembic migrations
- Auth: phone registration/login, OTP verification, rotating refresh tokens, JWT blacklist, password reset/change flows
- Groups: create/manage groups, memberships, role enforcement, rules versions
- Ledger: contributions, penalties/fines, reversals, disputes (domain support)
- Loans: request, approval, schedule, repayments
- Reports: group summary/pot, member statements, late members
- Payments integration layer: MTN MoMo collection/disbursement endpoints/webhooks
- Notifications: transactional outbox for SMS/email/push; device token registration for push
- Security/audit: rate limiting, Argon2id passwords, HMAC OTP, DB-enforced constraints, audit logs

### Web app (`web/`)
- React 19 + TypeScript + Vite + Tailwind
- Marketing site (landing, product/how-it-works/pricing/guides/contact/legal pages)
- Auth flows (sign in, sign up, verify phone, forgot/reset password)
- App experience for groups/ledger/loans/members/reports/settings (role-aware actions)
- Multi-language UI foundation/support: **Kinyarwanda, English, French**

### Mobile app (`mobile/`)
- Expo / React Native app for members and group participants
- Phone-first sign-in/verification, home/portfolio view, group details, ledger/loans visibility and loan requests, settings/language preferences
- Designed for Rwandan usage patterns (phone identity, SMS/mobile-money ecosystem)

---

## Technology stack (slide content)
- **Backend:** Python 3.12, FastAPI, PostgreSQL 16, Redis 7, SQLAlchemy 2 (async), Alembic, Docker
- **Web:** React 19, TypeScript, Vite, Tailwind CSS
- **Mobile:** Expo, React Native
- **Payments:** MTN Mobile Money (Collection + Disbursement), Airtel Money (product integration context)
- **Notifications:** SMS (Africa’s Talking/Pindo/fake), Email (Resend/SMTP/fake), Push (Firebase Cloud Messaging)
- **Security:** Argon2id, JWT access + rotating refresh tokens, OTP HMAC-SHA256, Redis rate limiting/blacklist, DB-enforced business rules, audit logs

---

## Business/value proposition (for investors)
- **Problem size:** Large base of savings groups (ibimina) in Rwanda managing meaningful collective savings with low-trust manual records
- **Value:** Trust, transparency, fewer disputes, faster reconciliation, easier loan/fine tracking, member visibility
- **Why now:** Mobile money adoption + smartphone access + digital financial inclusion priorities
- **Differentiation:** Immutable ledger + DB-enforced group rules + Rwanda-specific phone/mobile-money workflows + member statements
- **Business model (practical):**
  - Free/low-friction core for groups to drive adoption
  - Revenue options: transaction/payment facilitation margins, premium tools for cooperatives/federations, value-added services (analytics/reporting), partner/API integrations
  - (Presenter can state: “pricing/monetization strategy is evolving; adoption and trust come first”)

---

## Slide-by-slide output Claude must generate

### Slide 1 — Title
- “Itsinda — The Digital Ledger for Rwandan Savings Groups”
- Tagline: “Every franc your group saves, on the record.”
- Subtitle: Phone-first ledger for ibimina (Kinyarwanda • English • French)
- Speaker note: one-sentence explanation in plain language

### Slide 2 — What is Itsinda? (Simple explanation)
- “Not a bank. Not a money transfer app. A trusted group savings record.”
- 3 bullets: records contributions, tracks loans/fines, shows transparent statements
- Visual: simple “Group members -> Itsinda ledger -> trusted records/statements” diagram
- Speaker note: explain in non-technical words

### Slide 3 — The problem
- Pain points of ibimina using notebooks/spreadsheets
- Include trust/disputes, missing records, unclear loans/fines, no visibility
- Speaker note: real-life example of a disputed contribution or unclear loan

### Slide 4 — Who uses it (roles)
- President, Treasurer, Member cards with responsibilities
- Add rule badges: “No self-approval”, “One president/one treasurer”, “Phone-first”
- Speaker note: explain separation of duties and why it prevents abuse

### Slide 5 — End-to-end journey (how it works)
- Step flow: Sign up/verify -> Create/join group -> Record contributions -> Fines -> Loans & repayments -> Statements/reports -> Year-end distribution
- Include a timeline/flowchart
- Speaker note: walk through a monthly cycle example

### Slide 6 — Money and trust model (the core innovation)
- Immutable ledger, reversals not edits, integer RWF, audit trail, rule-based automation
- Visual: “Wrong entry -> Reversal entry (reason) -> History preserved”
- Speaker note: why this builds trust compared to paper/excel

### Slide 7 — Key features (product)
- Contributions ledger, loan management, fines, statements, reports, notifications, mobile money integrations
- Use icons/cards and keep text short
- Speaker note: connect each feature to a user pain

### Slide 8 — Technology & architecture (simple)
- Web + Mobile + Backend + Database/Redis + Integrations (MoMo/SMS/Push)
- Simple architecture diagram (boxes/arrows), no deep jargon
- Speaker note: explain reliability/security in plain terms

### Slide 9 — Market opportunity & impact
- Rwanda ibimina context, financial inclusion, expansion potential (VSLA/ROSCA in region)
- Include placeholders for market numbers if exact figures unavailable (do not invent precise stats)
- Speaker note: impact + adoption logic

### Slide 10 — Competitive advantage
- Comparison table: Paper/Excel vs Generic tools vs Itsinda
- Emphasize immutability, enforced roles, local workflows (phone/RWF/mobile money), transparency
- Speaker note: “built for how ibimina actually operate”

### Slide 11 — Business model & roadmap
- Adoption-first model + revenue paths
- Roadmap phases: pilot/onboarding, district expansion, cooperative/federation features, regional expansion, partnerships/APIs
- Speaker note: practical near-term execution

### Slide 12 — Demo / what to show investors
- Suggested demo flow: create group -> record contribution -> issue fine -> request/approve loan -> view statement -> show reversal
- Add placeholders for screenshots (web dashboard, loan schedule, member statement, mobile screens)
- Speaker note: what to emphasize during live demo

### Slide 13 (optional but recommended) — Risks & mitigations
- Adoption/training, connectivity/feature phones, data trust/privacy, integration dependencies
- Mitigation: phone-first UX, SMS support, clear audit trails, phased rollout
- Speaker note: shows maturity and realism

### Slide 14 — Ask / closing
- What support is needed (pilot partners, funding, integrations, onboarding support) with placeholders for amounts/targets
- Closing line: “Bringing every Rwandan savings group onto the record.”
- Speaker note: confident closing script (30-45 seconds)

---

## Output requirements
- Return a **downloadable `.pptx` file**
- Include **speaker notes** for every slide (clear, simple language)
- Use visuals/diagrams/tables where helpful (not text-heavy slides)
- Keep terminology consistent: **group, member, treasurer, president, contribution, fine, loan, repayment, reversal, pot, statement**
- Do **not** claim unsupported metrics as facts; use placeholders like `[X groups]`, `[Y districts]`, `[Z RWF]` where needed
- Make the deck understandable to someone new to the project while still compelling for investors
