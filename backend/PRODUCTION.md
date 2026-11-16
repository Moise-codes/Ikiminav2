# Production Deployment — Itsinda Backend v2

This guide covers deploying the Itsinda backend to production for use by
savings groups (ibimina) in Rwanda.

## 1. Provision infrastructure

- **PostgreSQL 16** — managed or self-hosted, with point-in-time recovery.
- **Redis 7** — for rate limiting and OTP throttling.
- **VM or container host** — located in Rwanda or a jurisdiction approved by
  your legal adviser (Law N° 058/2021 restricts cross-border transfer of
  personal data).
- **TLS certificate** — Let's Encrypt or your CA, terminated at the reverse
  proxy (Caddy / Nginx / cloud load balancer).

## 2. Configure `.env`

Copy `.env.example` to `.env` and set every value:

| Variable | Production requirement |
|---|---|
| `ENVIRONMENT` | `production` |
| `DEBUG` | `0` |
| `SECRET_KEY` | 32+ random characters |
| `JWT_SECRET` | 32+ random characters |
| `OTP_HMAC_SECRET` | 32+ random characters |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/db` with `sslmode=require` |
| `REDIS_URL` | `rediss://` with TLS and a password |
| `ALLOWED_ORIGINS` | your frontend domain(s) only |
| `PUBLIC_BASE_URL` | `https://api.itsinda.rw` |
| `MTN_*` | real MTN MoM API keys (collection + disbursement) |
| `MTN_ENVIRONMENT` | `production` |
| `MTN_WEBHOOK_SECRET` | shared with MTN for callback signature verification |
| `SENTRY_DSN` | error tracking (recommended) |

The app **refuses to start** in production with the default `dev-only-change-me`
secrets.

## 3. MTN Mobile Money

1. Register as a developer on the [MTN MoM API portal](https://momodeveloper.mtn.com).
2. Create Collection and Disbursement API users and keys for the Rwanda
   country group.
3. Configure your callback URL:
   `https://api.itsinda.rw/webhooks/mtn/collection`
   `https://api.itsinda.rw/webhooks/mtn/disbursement`
4. Set `MTN_ENVIRONMENT=production` and the production base URLs:
   `https://momodeveloper.mtn.com/collection`
   `https://momodeveloper.mtn.com/disbursement`

Money movement:
* **Receive** — `POST /payments/mtn/request-to-pay` prompts the customer's
  phone (MTN Push / PIN). The webhook confirms success/failure.
* **Send** — `POST /payments/mtn/transfer` pays out to a member's wallet.
  Leaders only, pot-checked before submission.

## 4. Run migrations

```bash
alembic upgrade head
```

Never skip migrations. Test them on a staging copy of production data first.

## 5. Run the API and worker

```bash
# API
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Worker (SMS + MTN webhook delivery retries)
python worker/main.py
```

Use a process supervisor (systemd, supervisord) or Kubernetes with
health-gated rollouts:
- `/health` — liveness
- `/api/v1/health/ready` — readiness (checks DB + Redis)

## 6. Backups

- Daily base backup + continuous WAL archiving (30-day point-in-time recovery).
- Test restore quarterly.
- Encrypt backups at rest.

## 7. Legal & compliance (Rwanda)

- **Law N° 058/2021** on personal data and privacy: minimal data, recorded
  consent, encryption at rest/in transit, correction and deletion requests.
  Financial ledger rows are anonymized (not deleted) on account deletion.
- **National Cyber Security Authority (NCSA)**: confirm registration / audit
  duties with a Rwandan legal adviser before public launch.
- Host personal data where the law permits; review any foreign SMS or
  monitoring provider before launch.

## 8. Monitoring

- Sentry or similar for error tracking.
- Alert on: error rate > 1%, p95 latency > 300ms, failed SMS, outbox dead
  letters, backup failures.
- Structured JSON logs — never log phone numbers in full (masked:
  `+250788***456`).

## 9. Frontend

The backend is the complete contract. The frontend (web / Android) consumes
`/api/v1` and the OpenAPI spec at `/api/v1/openapi.json`. Build it after the
backend is stable in staging.
