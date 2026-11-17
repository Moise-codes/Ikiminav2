# Itsinda Platform — Backend v2

Production API for Rwandan community savings groups (ibimina / itsinda).

Phone-first identity, immutable RWF ledger, MTN Mobile Money integration,
push notifications for mobile apps, and database-enforced business rules.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.12, fully typed |
| Framework | FastAPI (async) |
| Database | PostgreSQL 16 (SQLAlchemy 2 async, Alembic migrations) |
| Cache / Rate limit | Redis 7 |
| Password hashing | Argon2id |
| Auth tokens | JWT HS256, rotating refresh tokens, Redis blacklist |
| OTP | HMAC-SHA256 (never stored in plaintext) |
| SMS | Africa's Talking / Pindo / fake (dev) |
| Email | Resend / SMTP / fake (dev) |
| Push notifications | Firebase Cloud Messaging (FCM) — Android, iOS, web |
| Payments | MTN Mobile Money (Collection + Disbursement APIs) |
| Containers | Docker + Docker Compose |

---

## Project layout

```
backend/
├── app/
│   ├── main.py                  Application factory
│   ├── core/
│   │   ├── config.py            All settings (Pydantic, from .env)
│   │   ├── database.py          Async SQLAlchemy engine + session
│   │   ├── security.py          Argon2, JWT, OTP HMAC, token blacklist
│   │   ├── dependencies.py      FastAPI Depends: auth, membership, pagination
│   │   ├── errors.py            Domain error hierarchy
│   │   ├── middleware.py        Request-id, security headers
│   │   └── rate_limit.py        Redis-backed rate limiter
│   ├── common/
│   │   ├── phone.py             Rwandan phone normalisation (+250)
│   │   ├── email.py             Email normalisation
│   │   ├── money.py             Integer RWF helpers, schedule builder
│   │   └── envelope.py          Page[T] + success() response wrapper
│   ├── models/
│   │   ├── base.py              DeclarativeBase, TimestampMixin, uuid7()
│   │   ├── identity.py          User, OtpChallenge, RefreshToken,
│   │   │                        EmailVerificationToken, DeviceToken
│   │   ├── group.py             Group, GroupRuleVersion, Membership,
│   │   │                        PotDistribution, DistributionShare
│   │   ├── ledger.py            Contribution (payment/penalty/reversal),
│   │   │                        ContributionDispute, Repayment
│   │   ├── loan.py              Loan, LoanScheduleItem
│   │   └── platform.py          AuditLog, IdempotencyKey, OutboxMessage
│   ├── auth/                    Registration, OTP, login, tokens, devices
│   ├── groups/                  Groups, memberships, pot distribution
│   ├── contributions/           Ledger, penalties, reversals, disputes
│   ├── loans/                   Requests, approval, schedules, repayments
│   ├── payments/                MTN MoMo request-to-pay + transfer
│   ├── reports/                 Summary, member statement, late members
│   ├── notifications/           Transactional outbox (SMS + email + push)
│   ├── audit/                   Append-only audit writer
│   └── integrations/
│       ├── sms/                 Africa's Talking / fake sender
│       └── mtn/                 MTN MoMo client + webhook handler
├── worker/                      Outbox dispatcher (SMS / email / push)
├── migrations/
│   └── versions/
│       ├── 0001_initial.py      Full schema v1 (16 tables)
│       └── 0002_v2_market.py    Penalties, pot distribution, device tokens
├── tests/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── alembic.ini
└── pyproject.toml
```

---

## Quick start (Docker)

```bash
git clone <your-repo> Itsinda
cd Itsinda/backend

cp .env.example .env
# The defaults work for local dev — SMS and email use the fake sender.
# Edit .env if you want real SMS, email, or MTN sandbox credentials.

docker compose up --build
```

The `migrate` service runs `alembic upgrade head` automatically before the
API starts. API docs are at **http://localhost:8000/api/v1/docs**.

Run the outbox worker (delivers SMS, email, push):
```bash
docker compose up worker
```

---

## Quick start (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Start PostgreSQL and Redis (use Docker just for the services)
docker compose up postgres redis -d

cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

---

## Running tests

```bash
pytest
```

---

## Security model

| Concern | Implementation |
|---------|---------------|
| Identity | Phone number only — Rwandan MTN/Airtel (`+2507[2389]XXXXXXX`) |
| Password | Argon2id (time=3, mem=64 MB, par=4); auto-rehash on login |
| OTP | 6-digit, HMAC-SHA256 bound to phone+secret; 5 attempts max |
| Access tokens | JWT HS256, 15-min TTL, `jti` checked against Redis blacklist |
| Refresh tokens | 48-byte random, SHA-256 stored; rotating with family revocation |
| Immediate revocation | Password change / logout-all blacklists current JWT in Redis |
| Rate limiting | Per-IP and per-user Redis counters on every sensitive endpoint |
| Login lockout | 5 wrong passwords → locked 15 min |
| Timing safety | Dummy argon2 verify on unknown phone prevents user enumeration |
| Financial ledger | Append-only; corrections are reversal rows; no UPDATE/DELETE |
| Group roles | DB partial-unique indexes enforce one president, one treasurer |
| Loan self-approval | DB CHECK constraint blocks `decided_by = membership_id` |
| Audit trail | Every state change written to `audit_logs` with before/after JSONB |
| Push security | FCM tokens stored hashed; deactivated on first "invalid token" response |

---

## API reference

All endpoints are under `/api/v1`. Full interactive docs: `/api/v1/docs`.

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Name + phone + password → OTP via SMS |
| POST | `/verify-phone` | — | Submit OTP → activate account + tokens |
| POST | `/resend-otp` | — | Send a fresh OTP |
| POST | `/login` | — | Phone + password → token pair |
| POST | `/refresh` | — | Rotate refresh token |
| POST | `/logout` | Bearer | Revoke one or all sessions |
| GET | `/sessions` | Bearer | List active sessions (all devices) |
| POST | `/password/forgot` | — | Request reset OTP via SMS |
| POST | `/password/reset` | — | Confirm reset, revoke all sessions |
| POST | `/phone/change` | Bearer | Request phone number change |
| POST | `/phone/change/confirm` | Bearer | Confirm with OTP |
| POST | `/email` | Bearer | Add email (optional, settings only) |
| POST | `/email/verify` | — | Confirm email via link |
| GET | `/me` | Bearer | Get own profile (includes phone_operator) |
| PATCH | `/me` | Bearer | Update name or language |
| POST | `/devices` | Bearer | Register FCM/APNS token (mobile app) |
| DELETE | `/devices/{token}` | Bearer | Unregister a device |

### Groups (`/groups`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/groups` | Any | Create group (caller = president) |
| GET | `/groups` | Member | List my groups |
| GET | `/groups/{id}` | Member | Group detail + interest % |
| PATCH | `/groups/{id}/rules` | President | Update rules (new period required) |
| POST | `/groups/{id}/members` | President/Treasurer | Invite by phone |
| GET | `/groups/{id}/members` | Member | List members |
| PATCH | `/groups/{id}/members/{mid}` | President | Change role/status |
| DELETE | `/groups/{id}/members/{mid}` | President | Remove member |
| POST | `/groups/{id}/distributions` | President | Year-end pot distribution |
| GET | `/groups/{id}/distributions` | Member | View distribution history |

### Contributions (`/contributions`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/contributions` | President/Treasurer | Record a contribution |
| POST | `/contributions/penalties` | President/Treasurer | Record a late fine |
| POST | `/contributions/reverse` | President/Treasurer | Reverse a contribution/penalty |
| GET | `/contributions` | Member | List (filter by group/member/period) |
| POST | `/contributions/disputes` | Member | Raise a dispute |
| PATCH | `/contributions/disputes/{id}` | President/Treasurer | Resolve dispute |

### Loans (`/groups/{id}/loans`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/groups/{id}/loans` | Member | Request a loan |
| POST | `/groups/{id}/loans/{lid}/approve` | President/Treasurer | Approve |
| POST | `/groups/{id}/loans/{lid}/reject` | President/Treasurer | Reject |
| GET | `/groups/{id}/loans` | Member | List loans |
| GET | `/groups/{id}/loans/{lid}/schedule` | Member | Repayment schedule |
| POST | `/groups/{id}/loans/{lid}/repayments` | President/Treasurer | Record repayment |

### Reports (`/reports`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/reports/groups/{id}/summary` | Member | Pot, loans, penalties summary |
| GET | `/reports/groups/{id}/members/{mid}/statement` | Member (own) / Leader | Statement |
| GET | `/reports/groups/{id}/late-members?period=` | President/Treasurer | Late list with expected amounts |

### Payments (`/payments`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/payments/mtn/request-to-pay` | President/Treasurer | Pull from member wallet |
| POST | `/payments/mtn/transfer` | President/Treasurer | Push to member wallet |
| GET | `/payments/mtn/status/{ref}` | Bearer | Poll transaction status |

---

## Mobile app support

The backend serves both the web frontend and the mobile app (Android / iOS)
from the same API. No separate mobile API is needed.

### Push notification flow

```
1. Mobile app starts → GET FCM registration token from Firebase SDK
2. App calls POST /auth/devices  { token, platform: "android"|"ios"|"web" }
3. Backend stores token in device_tokens table
4. Event happens (loan approved, contribution recorded, invitation) →
   NotificationService.notify() queues:
     - SMS  → outbox worker → Africa's Talking
     - Push → outbox worker → FCM → user's device
5. If FCM returns "invalid registration token" → worker sets is_active=false
6. App reinstalled → new token registered → old deactivated automatically
```

### Token storage on mobile

| Item | Storage |
|------|---------|
| Access token | Secure storage (Keychain iOS / Keystore Android) |
| Refresh token | Secure storage |
| FCM token | Managed by Firebase SDK (auto-rotated) |

### Recommended mobile frameworks

| Framework | Languages | Notes |
|-----------|-----------|-------|
| Flutter | Dart | Best performance on low-end Android (recommended for Rwanda) |
| React Native / Expo | TypeScript | Reuse web types, faster to build |

---

## Key design decisions

**Phone-only registration** — Email is not collected at registration. Rwandan
users identify by MTN/Airtel number. Email can be added from settings as an
optional recovery channel only.

**Integer RWF everywhere** — No floats in the money path. All amounts are
whole Rwandan francs stored as `BIGINT`.

**Interest as percentage** — The API accepts `loan_interest_pct` (e.g. `5.0`
for 5%) and converts to basis points internally. No user ever sees "500 bp".

**Contribution periods** — `YYYY-MM` for monthly/biweekly, `YYYY-WNN` for
weekly. The API validates the format and returns a plain error message.

**Penalty tracking** — Late fines are stored as `type="penalty"` rows in the
contributions table, separate from regular contributions, so they appear
distinctly in reports.

**Pot distribution** — `POST /groups/{id}/distributions` records a year-end
distribution and calculates each member's share (equal or proportional to
contributions). Full history is preserved.

**Loan due dates** — Computed from the group's `contribution_day` and
`frequency`. Monthly groups use it as the day-of-month (1–28). Weekly groups
use it as the day-of-week (0=Monday … 6=Sunday).

---

## Environment variables

See `.env.example` for the full annotated list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SECRET_KEY` | Yes | App secret (32+ chars) |
| `JWT_SECRET` | Yes | JWT signing key (32+ chars) |
| `OTP_HMAC_SECRET` | Yes | OTP HMAC key (32+ chars) |
| `FCM_PROJECT_ID` | Mobile | Firebase project ID |
| `FCM_SERVICE_ACCOUNT_JSON` | Mobile | Firebase service account JSON (single line) |
| `SMS_PROVIDER` | Yes | `fake` (dev) / `africastalking` (prod) |
| `MTN_COLLECTION_API_KEY` | Payments | MTN MoMo collection key |
| `MTN_DISBURSEMENT_API_KEY` | Payments | MTN MoMo disbursement key |

---

## Data protection (Rwanda)

**Law N° 058/2021** (personal data and privacy) applies: minimal data,
recorded consent, encryption at rest and in transit, correction/deletion via
anonymisation while ledger rows survive. Confirm NCSA registration duties
with a Rwandan legal adviser before public launch.

Phones are masked in all logs (`+250788***456`). No personal data in JSONB
audit snapshots beyond what the action changed.
