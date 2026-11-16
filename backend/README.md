# Ikimina Platform — Backend (v2)

Production backend API for Rwandan savings groups (ibimina / ikimina). Records
members, roles, contributions in RWF, loans and repayments for groups in
Rwanda. Phone-first identity, immutable ledger, database-enforced constraints.

Built per the **Ikimina Platform v2 Design Document** (SRS, architecture, data
dictionary) — not derived from any third-party product.

## Stack

- Python 3.12, FastAPI
- PostgreSQL 16 (async SQLAlchemy 2, Alembic)
- Redis (rate limiting, OTP throttling)
- Argon2id passwords, rotating JWT refresh tokens, HMAC'd OTPs
- Docker + docker-compose for local development

## Repository layout

```
backend/
  app/
    main.py              application factory
    core/                config, security, database, errors, middleware, rate limit
    common/              phone, email, money, envelope
    auth/                registration, OTP, login, token rotation, identity changes
    groups/              groups, memberships, invitations
    contributions/       immutable ledger, reversals, disputes
    loans/               requests, dual approval, schedules, repayments
    reports/             group summary, member statements, late members
    audit/               append-only audit writer
    notifications/       outbox writer
    integrations/sms/    provider interface, fake + HTTP senders, templates
    models/              SQLAlchemy tables (14 tables)
  worker/                outbox dispatcher (SMS/email delivery)
  migrations/            Alembic
  tests/                 unit tests
  Dockerfile, docker-compose.yml, .env.example
```

## Security model

- Phone number is the primary identity key (`+2507XXXXXXXX`, Rwandan only).
- Email is optional and secondary — verified by token before trusted.
- Passwords hashed with argon2id; OTPs stored only as HMAC.
- Access tokens 15 min; refresh tokens 30 days, rotated on use, reuse revokes
  the whole family.
- Per-IP and per-user rate limits; login lockout after failures.
- Immutable ledger (DB triggers reject UPDATE/DELETE); corrections are reversal
  rows.
- One active president, at most one active treasurer per group — enforced by
  partial unique indexes.
- No personal data in logs; phones masked (`+250788***456`).
- SMS/email written to an outbox in the same transaction as the change.

## Run locally

```bash
# From the folder that will contain Ikiminav2
git clone <your-repo> Ikiminav2   # or copy this tree into ~/Ikiminav2/backend
cd Ikiminav2/backend
cp .env.example .env
# edit .env if you want real SMS/email; defaults use the fake sender

docker compose up --build
```

API docs: `http://localhost:8000/api/v1/docs`

Run the worker in a second terminal:

```bash
docker compose up worker
```

Or run without Docker:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Run tests

```bash
pytest
```

Pure unit tests cover phone normalization and whole-franc money math.
Integration tests against a real PostgreSQL (Testcontainers) land in the CI
pipeline.

## MTN Mobile Money (send / receive real money)

When you have MTN MoM API keys, set `MTN_ENVIRONMENT=production` and the
production base URLs in `.env`, then:

* `POST /payments/mtn/request-to-pay` — ask a customer to pay into the group
  (MTN prompts their phone). Webhook confirms success/failure.
* `POST /payments/mtn/transfer` — pay out from the group wallet to a member
  (leaders only, pot-checked before submission).
* `GET /payments/mtn/status/{reference_id}` — check final MTN status.
* `POST /webhooks/mtn/collection` and `/webhooks/mtn/disbursement` — MTN
  callbacks (HMAC-verified).

Every movement is recorded against the contribution ledger so the group's
books always match what MTN actually did.

## API outline

Auth (`/auth`)
- `POST /register` — name, phone, password, optional email → OTP by SMS
- `POST /verify-phone` — activate account, issue tokens
- `POST /login` — phone + password → access + refresh tokens
- `POST /refresh` — rotate tokens
- `POST /logout`, `GET /sessions`
- `POST /password/forgot`, `POST /password/reset`
- `POST /phone/change`, `POST /phone/change/confirm`
- `POST /email`, `POST /email/verify`
- `GET /me`, `PATCH /me`

Groups (`/groups`)
- `POST` create (caller becomes president)
- `GET` list, `GET /{id}` get
- `PATCH /{id}/rules` change rules (president)
- `POST /{id}/members` invite by phone
- `GET /{id}/members`, `PATCH /{id}/members/{mid}`, `DELETE /{id}/members/{mid}`

Contributions (`/contributions`)
- `POST` record (leader only, idempotent)
- `POST /reverse` correct with reversal row
- `GET` list with pagination
- `POST /disputes`, `PATCH /disputes/{id}` resolve

Loans (`/groups/{id}/loans`)
- `POST` request
- `POST /{loan_id}/approve`, `POST /{loan_id}/reject` (dual approval, not self)
- `GET` list, `GET /{loan_id}/schedule`
- `POST /{loan_id}/repayments` record repayment

Reports (`/reports`)
- `GET /groups/{id}/summary`
- `GET /groups/{id}/members/{mid}/statement`
- `GET /groups/{id}/late-members?period=`

## Next (frontend phase)

The frontend is deliberately out of scope for v1. The contract is the versioned
JSON REST API at `/api/v1` with OpenAPI at `/api/v1/openapi.json`. Phase 2
adds mobile money (MTN MoMo / Airtel Money) execution and PDF statements.

## Data protection

Law N° 058/2021 (Rwanda personal data and privacy) applies: minimal data,
recorded consent, encryption at rest and in transit, correction/deletion via
anonymization while ledger rows survive. Confirm National Cyber Security
Authority (NCSA) registration duties with a Rwandan legal adviser before public
launch.
