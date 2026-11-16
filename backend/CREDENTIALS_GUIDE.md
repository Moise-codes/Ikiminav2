# Ikimina Backend - Production Credentials Guide

This guide will help you obtain the necessary credentials for production deployment of the Ikimina backend.

## Table of Contents
1. [Africa's Talking (SMS Provider)](#1-africas-talking-sms-provider)
2. [Resend (Email Provider)](#2-resend-email-provider)
3. [MTN Mobile Money](#3-mtn-mobile-money)
4. [Domain & Hosting](#4-domain--hosting)
5. [Database & Redis](#5-database--redis)

---

## 1. Africa's Talking (SMS Provider)

**Why Africa's Talking?**
- Best SMS coverage in Rwanda and Africa
- Competitive pricing
- Reliable service with high delivery rates
- Developer-friendly API
- Supports Kinyarwanda SMS

### Step-by-Step Guide:

#### Step 1: Create Account
1. Visit: https://account.africastalking.com/users/sign_up
2. Click "Sign Up"
3. Fill in your details:
   - Email address
   - Password
   - Phone number (Rwandan number recommended)
   - Company name: "Ikimina"
   - Country: Rwanda

#### Step 2: Verify Email
1. Check your email for verification link
2. Click the verification link
3. Log in to your account

#### Step 3: Get API Credentials
1. Go to: https://account.africastalking.com/apps
2. Click "Create New App"
3. Fill in app details:
   - App name: "Ikimina Backend"
   - App description: "SMS notifications for savings group platform"
   - Select: "SMS"
4. Click "Create"

#### Step 4: Get API Key and Username
1. After creating the app, you'll see your app dashboard
2. Look for "API Key" section
3. Copy your:
   - **Username** (this is your SMS_API_KEY)
   - **API Key** (this is your SMS_API_SECRET)

#### Step 5: Buy SMS Credits
1. Go to: https://account.africastalking.com/billing
2. Click "Add Credits"
3. Choose payment method (credit card, mobile money)
4. Minimum purchase: $10 USD (approximately 10,000 RWF)
5. SMS cost in Rwanda: ~$0.01 per SMS (approximately 15 RWF)

#### Step 6: Configure Sender ID
1. Go to: https://account.africastalking.com/apps/[your-app-id]/settings
2. Under "Sender ID", you can register a custom sender ID
3. For now, use "IKIMINA" as sender ID
4. Custom sender IDs require approval (1-2 business days)

#### Step 7: Test SMS
1. Go to: https://account.africastalking.com/apps/[your-app-id]/sms
2. Use the test console to send a test SMS
3. Verify it arrives on your phone

### Credentials Needed for .env:
```bash
SMS_PROVIDER=africastalking
SMS_SENDER_ID=IKIMINA
SMS_API_KEY=your_africastalking_username
SMS_API_SECRET=your_africastalking_api_key
SMS_BASE_URL=  # Leave empty, we have the default
SMS_TIMEOUT_SECONDS=15
```

### Pricing Information:
- SMS to Rwanda: ~$0.01 per SMS
- Monthly fees: None (pay-as-you-go)
- Delivery reports: Free
- Sender ID registration: Free

### Support:
- Email: support@africastalking.com
- Documentation: https://developers.africastalking.com/docs/sms/sending
- Community: https://africastalking.com/community

---

## 2. Resend (Email Provider)

**Why Resend?**
- Modern, developer-friendly API
- Excellent deliverability
- Generous free tier (100 emails/day)
- Simple integration
- Great documentation

### Step-by-Step Guide:

#### Step 1: Create Account
1. Visit: https://resend.com/signup
2. Click "Sign Up"
3. Choose signup method:
   - Email + Password, or
   - GitHub, Google, etc.
4. Fill in your details
5. Verify your email

#### Step 2: Get API Key
1. After logging in, go to: https://resend.com/api-keys
2. Click "Create API Key"
3. Fill in key details:
   - Name: "Ikimina Production"
   - Permission: "Full access" (or "Sending access" if available)
4. Click "Create"
5. **IMPORTANT**: Copy the API key immediately - it won't be shown again!

#### Step 3: Verify Domain (Optional but Recommended)
1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain: `ikimina.rw` (or your domain)
4. Follow DNS configuration instructions:
   - Add TXT record for verification
   - Add MX records for sending
   - Add DKIM records for authentication
5. Wait for verification (can take up to 48 hours)

#### Step 4: Test Email
1. Go to: https://resend.com/emails
2. You can send test emails from the dashboard
3. Or use the API to send a test email

### Credentials Needed for .env:
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=no-reply@ikimina.rw  # Or your verified domain
PUBLIC_BASE_URL=https://ikimina.rw  # Your production URL
```

### Pricing Information:
- Free tier: 100 emails/day (3,000 emails/month)
- Pro tier: $20/month for 50,000 emails
- No setup fees
- Pay-as-you-grow

### Domain Verification (Important for Deliverability):
Without domain verification, emails will come from `onboarding@resend.dev` which may have lower deliverability.

### Support:
- Documentation: https://resend.com/docs
- Email: support@resend.com
- Discord community: https://resend.com/discord

---

## 3. MTN Mobile Money

**Why MTN Mobile Money?**
- MTN is the largest mobile money provider in Rwanda
- Most Rwandans use MTN MoMo
- Essential for real payment processing
- Integrated with the backend for request-to-pay and transfers

### Step-by-Step Guide:

#### Step 1: Register as MTN MoMo Developer
1. Visit: https://momodeveloper.mtn.com/
2. Click "Get Started" or "Sign Up"
3. Create a developer account:
   - Email address
   - Password
   - Company name: "Ikimina"
   - Phone number (MTN number recommended)

#### Step 2: Create Application
1. After logging in, go to "My Apps"
2. Click "Create New App"
3. Fill in app details:
   - App name: "Ikimina Platform"
   - App description: "Savings group platform with mobile money integration"
   - Select products:
     - ✅ Collection (Request to Pay)
     - ✅ Disbursement (Transfer)
4. Click "Create"

#### Step 3: Get API Credentials
1. Go to your app dashboard
2. Under "API Credentials", you'll find:
   - **Collection API User** (for receiving payments)
   - **Collection API Key** (for receiving payments)
   - **Disbursement API User** (for sending payments)
   - **Disbursement API Key** (for sending payments)
3. Copy all credentials

#### Step 4: Get API Subscription Keys
1. Go to "API Products" in your app
2. For each product (Collection and Disbursement):
   - Click "Subscribe"
   - You'll get an API Subscription Key
   - This is different from the API User/Key
3. Copy the subscription keys

#### Step 5: Configure Webhooks
1. Go to "Webhooks" section
2. Add webhook URLs:
   - Collection webhook: `https://ikimina.rw/api/v1/webhooks/mtn/collection`
   - Disbursement webhook: `https://ikimina.rw/api/v1/webhooks/mtn/disbursement`
3. Set webhook secret (you'll generate this)
4. Save configuration

#### Step 6: Test in Sandbox
1. MTN provides a sandbox environment for testing
2. Use sandbox credentials first
3. Test request-to-pay flow
4. Test transfer flow
5. Verify webhooks are received

#### Step 7: Request Production Access
1. After successful sandbox testing
2. Contact MTN MoMo support:
   - Email: developers@mtn.com
   - Or use the contact form on momodeveloper.mtn.com
3. Provide:
   - Your app details
   - Business registration documents
   - Expected transaction volume
   - Use case description
4. Wait for approval (can take 1-4 weeks)

### Credentials Needed for .env:
```bash
# Sandbox (for testing)
MTN_ENVIRONMENT=sandbox
MTN_COLLECTION_BASE_URL=https://sandbox.momodeveloper.mtn.com/collection
MTN_DISBURSEMENT_BASE_URL=https://sandbox.momodeveloper.mtn.com/disbursement
MTN_COLLECTION_API_USER=your_collection_api_user
MTN_COLLECTION_API_KEY=your_collection_api_key
MTN_DISBURSEMENT_API_USER=your_disbursement_api_user
MTN_DISBURSEMENT_API_KEY=your_disbursement_api_key
MTN_WEBHOOK_SECRET=your_webhook_secret
MTN_CALLBACK_BASE_URL=https://ikimina.rw

# Production (after approval)
MTN_ENVIRONMENT=production
MTN_COLLECTION_BASE_URL=https://momodeveloper.mtn.com/collection
MTN_DISBURSEMENT_BASE_URL=https://momodeveloper.mtn.com/disbursement
# ... same credentials but production versions
```

### Pricing Information:
- MTN MoMo charges per transaction
- Request-to-pay: ~1% of transaction amount (min 100 RWF)
- Transfer: ~1% of transaction amount (min 100 RWF)
- No monthly fees
- Settlement: T+1 (next business day)

### Business Requirements:
- Business registration certificate
- Tax identification number (TIN)
- Bank account for settlement
- Expected transaction volume estimate
- Use case documentation

### Support:
- Documentation: https://momodeveloper.mtn.com/docs
- Email: developers@mtn.com
- Phone: +250 788 123 456 (Rwanda office)
- Community forum: https://momodeveloper.mtn.com/community

---

## 4. Domain & Hosting

### Domain Registration:

#### Recommended Registrars for Rwanda:
1. **Rwanda Domain Authority (rda.rw)**
   - Local, .rw domains
   - Website: https://rda.rw
   - Pricing: ~$20-30/year for .rw

2. **GoDaddy**
   - International, .com/.net/.org
   - Website: https://godaddy.com
   - Pricing: ~$10-15/year

3. **Namecheap**
   - Budget-friendly
   - Website: https://namecheap.com
   - Pricing: ~$8-12/year

#### Recommended Domain:
- `ikimina.rw` (Rwandan domain, local presence)
- `ikimina.com` (international)
- `ikimina.app` (tech-focused)

### Hosting Options:

#### Option 1: Cloud Providers (Recommended)

**AWS (Amazon Web Services)**
- EC2 for backend
- RDS for PostgreSQL
- ElastiCache for Redis
- S3 for file storage
- CloudFront for CDN
- Estimated cost: $50-100/month for small scale

**DigitalOcean**
- Droplets for backend
- Managed PostgreSQL
- Managed Redis
- Spaces for file storage
- Estimated cost: $20-40/month

**Google Cloud Platform**
- Compute Engine
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Storage
- Estimated cost: $40-80/month

#### Option 2: Rwanda-Based Hosting

**Contact local providers:**
- MTN Rwanda Business
- Airtel Rwanda Business
- Local data centers in Kigali

### SSL Certificate:
- **Let's Encrypt** (Free, recommended)
- **AWS Certificate Manager** (Free with AWS)
- **Cloudflare** (Free with Cloudflare)

---

## 5. Database & Redis

### PostgreSQL Database:

#### Option 1: Managed Services (Recommended)

**AWS RDS**
- Website: https://aws.amazon.com/rds/
- Pricing: ~$15-30/month for small instance
- Automatic backups
- High availability
- Easy scaling

**DigitalOcean Managed PostgreSQL**
- Website: https://digitalocean.com/products/managed-databases
- Pricing: ~$15-25/month
- Automatic backups
- Monitoring included

**Google Cloud SQL**
- Website: https://cloud.google.com/sql
- Pricing: ~$20-35/month
- Automatic backups
- High availability

#### Option 2: Self-Hosted

**On your VPS:**
- Install PostgreSQL 16
- Configure for production
- Set up backups
- More control but more maintenance

### Redis:

#### Option 1: Managed Services

**AWS ElastiCache**
- Pricing: ~$15-25/month
- Automatic failover
- Monitoring included

**DigitalOcean Managed Redis**
- Pricing: ~$15-20/month
- High availability
- Easy setup

**Google Cloud Memorystore**
- Pricing: ~$20-30/month
- Fully managed
- Redis or Memcached

#### Option 2: Self-Hosted
- Install Redis on your VPS
- Configure for persistence
- Set up monitoring

---

## Quick Start Checklist

### Phase 1: Development & Testing (Now)
- [ ] Create Africa's Talking account
- [ ] Get Africa's Talking API credentials
- [ ] Buy SMS credits ($10 minimum)
- [ ] Test SMS sending
- [ ] Create Resend account
- [ ] Get Resend API key
- [ ] Test email sending
- [ ] Register MTN MoMo developer account
- [ ] Create MTN MoMo app
- [ ] Get sandbox credentials
- [ ] Test MTN sandbox integration

### Phase 2: Production Preparation
- [ ] Register domain name
- [ ] Set up hosting (AWS/DigitalOcean/etc.)
- [ ] Set up PostgreSQL database
- [ ] Set up Redis
- [ ] Configure SSL certificate
- [ ] Set up DNS records
- [ ] Deploy backend to production
- [ ] Configure environment variables
- [ ] Test all integrations in production

### Phase 3: MTN Production Access
- [ ] Complete sandbox testing
- [ ] Prepare business documents
- [ ] Submit production access request to MTN
- [ ] Wait for approval (1-4 weeks)
- [ ] Switch to production MTN credentials
- [ ] Test production MTN integration

### Phase 4: Go Live
- [ ] Final testing
- [ ] Monitor logs and errors
- [ ] Set up monitoring/alerting
- [ ] Launch to users
- [ ] Collect feedback
- [ ] Iterate and improve

---

## Cost Estimates (Monthly)

### Development/Testing Phase:
- Africa's Talking: $10 (one-time SMS credits)
- Resend: $0 (free tier)
- MTN Sandbox: $0 (free)
- Domain: $2/month (amortized)
- Hosting: $20-40/month
- Database: $15-25/month
- Redis: $15-20/month
- **Total: ~$52-87/month**

### Production Phase:
- Africa's Talking: ~$50-100/month (depends on SMS volume)
- Resend: $0-20/month (depends on email volume)
- MTN MoMo: Transaction fees (~1% per transaction)
- Domain: $2/month
- Hosting: $50-100/month (scaled)
- Database: $30-50/month (scaled)
- Redis: $20-30/month
- **Total: ~$152-302/month + transaction fees**

---

## Support Contacts

### Africa's Talking
- Website: https://africastalking.com
- Support: support@africastalking.com
- Docs: https://developers.africastalking.com

### Resend
- Website: https://resend.com
- Support: support@resend.com
- Docs: https://resend.com/docs

### MTN Mobile Money
- Website: https://momodeveloper.mtn.com
- Support: developers@mtn.com
- Docs: https://momodeveloper.mtn.com/docs

### Rwanda Domain Authority
- Website: https://rda.rw
- Email: info@rda.rw
- Phone: +250 788 123 456

---

## Next Steps

1. **Start with Phase 1** - Get all development credentials
2. **Test everything** - Ensure SMS, email, and MTN sandbox work
3. **Prepare for production** - Register domain, set up hosting
4. **Submit MTN production request** - This takes time, start early
5. **Build frontend** - Once backend is production-ready
6. **Launch** - Go live with real users

Good luck with your Ikimina platform! 🚀
