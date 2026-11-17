# Production Deployment — Itsinda Backend v2

This guide covers deploying the Itsinda backend to production for Rwandan
savings groups. Read it completely before your first production deployment.

---

## 1. Infrastructure requirements

| Service | Minimum spec | Notes |
|---------|-------------|-------|
| PostgreSQL 16 | 2 vCPU, 4 GB RAM | Managed (AWS RDS, DigitalOcean) recommended |
| Redis 7 | 1 GB RAM | Used for rate limits + token blacklist |
| App server | 2 vCPU, 2 GB RAM | Run 2–4 Uvicorn workers |
| Outbox worker | 1 vCPU, 512 MB | Separate process / container |
| TLS | Let's Encrypt | Terminate at reverse proxy (Caddy / Nginx) |

Host in Rwanda or a jurisdiction approved under **Law N° 058/2021**.

---

## 2. Environment variables

Copy `.env.example` → `.env` and fill in every value. The app refuses to
start in production with the `dev-only-change-me` defaults.

### Critical secrets — generate fresh values

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Run this three times and use a different output for each of:
- `SECRET_KEY`
- `JWT_SECRET`
- `OTP_HMAC_SECRET`

### Production-specific settings

```env
ENVIRONMENT=production
DEBUG=0
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db?ssl=require
REDIS_URL=rediss://:password@host:6379/0
ALLOWED_ORIGINS=https://app.itsinda.rw
PUBLIC_BASE_URL=https://api.itsinda.rw
SMS_PROVIDER=africastalking
EMAIL_PROVIDER=resend
LOG_JSON=1
SENTRY_DSN=https://xxxx@sentry.io/yyyy
```

---

## 3. Run migrations

**Always run migrations before starting the new API version.**

```bash
# Against production database
alembic upgrade head
```

### Migration history

| Revision | Description |
|----------|-------------|
| `0001_initial` | Full schema v1: users, groups, memberships, contributions, loans, repayments, audit, outbox |
| `0002_v2_market` | Penalty type, weekly contribution_day (0–28), pot_distributions, distribution_shares, device_tokens |

### Safe migration checklist

1. Take a database snapshot / backup
2. Run `alembic upgrade head` on a copy of production data first
3. Verify row counts and spot-check constraints
4. Deploy the new API version
5. Monitor error rates for 10 minutes

---

## 4. MTN Mobile Money

1. Register at [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Create Collection and Disbursement products for Rwanda
3. Register webhook callbacks:
   - `https://api.itsinda.rw/webhooks/mtn/collection`
   - `https://api.itsinda.rw/webhooks/mtn/disbursement`
4. Set `MTN_ENVIRONMENT=production` and production base URLs
5. Set `MTN_WEBHOOK_SECRET` to the shared HMAC key from MTN's portal

```env
MTN_ENVIRONMENT=production
MTN_COLLECTION_BASE_URL=https://momodeveloper.mtn.com/collection
MTN_DISBURSEMENT_BASE_URL=https://momodeveloper.mtn.com/disbursement
MTN_COLLECTION_API_USER=...
MTN_COLLECTION_API_KEY=...
MTN_DISBURSEMENT_API_USER=...
MTN_DISBURSEMENT_API_KEY=...
MTN_WEBHOOK_SECRET=...
MTN_CALLBACK_BASE_URL=https://api.itsinda.rw
```

---

## 5. Firebase Cloud Messaging (push notifications)

Required for the mobile app to receive notifications when the app is closed.

### Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project: **Itsinda**
3. Add an Android app — package name: `rw.itsinda.app`
4. Project Settings → Service Accounts → **Generate new private key**
5. Copy the JSON file content (make it a single line, no newlines)

```env
FCM_PROJECT_ID=itsinda-prod
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"itsinda-prod",...}
```

### How it works

- Mobile app registers → `POST /auth/devices` stores the FCM token
- Event fires (loan approved, contribution recorded, group invite) →
  `NotificationService.notify()` queues push + SMS in the same transaction
- Outbox worker delivers push via FCM HTTP v1 API
- Failed tokens (uninstalled app, old device) → `device_tokens.is_active=false`

### iOS support

FCM delivers to iOS via the FCM-to-APNS bridge. No separate APNS credentials
are needed unless you want direct APNS delivery (not required for v1).

---

## 6. Access-token blacklist

The backend uses Redis to blacklist access tokens immediately when:
- A user changes their password
- A user logs out of all sessions

Tokens are blacklisted for the remainder of their 15-minute TTL. This closes
the window where a stolen access token would otherwise remain valid until
natural expiry.

**Redis must be reachable at all times.** If Redis goes down, the blacklist
check is skipped (fail-open) so the API stays up. Monitor Redis availability
separately.

---

## 7. Run the API

```bash
# 4 workers on port 8000
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --no-access-log

# Health: GET /health
# Readiness: GET /api/v1/health/ready  (checks DB + Redis)
```

---

## 8. Run the outbox worker

The worker delivers SMS, email, and push notifications from the
`outbox_messages` table. It retries on failure up to `OUTBOX_MAX_ATTEMPTS`
times with exponential backoff.

```bash
python -m worker.main
```

Run this as a separate process / container. If it goes down, messages queue
up in the DB and are delivered when it restarts — no messages are lost.

---

## 9. Reverse proxy (Nginx example)

```nginx
server {
    listen 443 ssl;
    server_name api.itsinda.rw;

    ssl_certificate     /etc/letsencrypt/live/api.itsinda.rw/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.itsinda.rw/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set `TRUSTED_PROXIES=127.0.0.1` so `X-Forwarded-For` is trusted for
per-IP rate limiting.

---

## 10. Backups

| What | How often | Retention |
|------|-----------|-----------|
| PostgreSQL base backup | Daily | 30 days |
| PostgreSQL WAL archiving | Continuous | 7 days point-in-time |
| Redis | RDB snapshot every hour | 24 hours |

Test restore quarterly. Encrypt backups at rest.

---

## 11. Monitoring and alerting

Alert on:
- API error rate > 1 % over 5 minutes
- p95 response time > 500 ms
- Outbox worker: dead-letter queue growing (messages stuck in `failed` status)
- Failed MTN webhook signature verifications (potential replay attack)
- Redis unavailable (blacklist check degraded)
- DB replication lag > 30 s

Structured JSON logs are emitted at `LOG_LEVEL=INFO`. Never log full phone
numbers — the codebase masks them as `+250788***456`.

---

## 12. Legal compliance (Rwanda)

- **Law N° 058/2021** — personal data and privacy: minimal data, recorded
  consent (`privacy_accepted_at`), encryption at rest/transit, right to
  correction and deletion (anonymisation, not deletion, preserves the ledger).
- **National Cyber Security Authority (NCSA)** — confirm registration and
  audit duties with a Rwandan legal adviser before public launch.
- Personal data must be hosted where the law permits. Review every foreign
  SMS, email, or monitoring provider before launch.
- Financial records (contributions, loans, repayments) are **never deleted**,
  only anonymised when a user exercises their right to erasure.

---

## 13. First deployment checklist

```
[ ] Generated fresh SECRET_KEY, JWT_SECRET, OTP_HMAC_SECRET
[ ] Set ENVIRONMENT=production, DEBUG=0
[ ] DATABASE_URL uses sslmode=require
[ ] REDIS_URL uses TLS (rediss://)
[ ] ALLOWED_ORIGINS contains only production frontend domain(s)
[ ] alembic upgrade head run on production DB
[ ] Verified /api/v1/health/ready returns { "ready": true }
[ ] SMS provider tested (sent OTP to real phone)
[ ] MTN sandbox tested (request-to-pay flow)
[ ] FCM configured and push test notification delivered
[ ] MTN webhook URL registered and signature verified
[ ] Sentry DSN configured and test error captured
[ ] Backups verified with a restore test
[ ] NCSA registration reviewed with legal adviser
```
