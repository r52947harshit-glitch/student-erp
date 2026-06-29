# Vercel Deployment Guide - School ERP

## Pre-Deployment Checklist

- [x] Build passes locally with `npm run build`
- [x] Prisma Client is generated during build
- [x] `.env` is ignored by git
- [ ] Required Vercel environment variables are configured
- [ ] `NEXTAUTH_URL` points to the final production URL
- [ ] `NEXTAUTH_SECRET` is generated uniquely for production
- [ ] Production database is migrated
- [ ] Razorpay webhook is configured if online payments are enabled

## Deploy With Vercel Dashboard

1. Go to `https://vercel.com/new`.
2. Import the Git repository.
3. Select this project root.
4. Configure the environment variables below.
5. Deploy.

## Deploy With Vercel CLI

```bash
vercel login
vercel link
vercel env pull .env.local
npm run build
vercel --prod
```

## Environment Variables

Add these in Vercel Project Settings -> Environment Variables.

### Database

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

`DATABASE_URL` is required. `DIRECT_URL` is optional unless `directUrl` is enabled in `prisma/schema.prisma`.

### Authentication

```env
NEXTAUTH_SECRET="generate-a-new-secret-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-app.vercel.app"
```

Generate a production secret:

```bash
openssl rand -base64 32
```

`NEXTAUTH_URL` must exactly match the deployed production domain.

### Supabase Storage

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

Only `NEXT_PUBLIC_*` variables are exposed to the browser. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

### Razorpay Fee Payments

```env
RAZORPAY_KEY_ID="rzp_live_or_test_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"
```

Use live keys for production. Configure the webhook URL after deployment:

```txt
https://your-app.vercel.app/api/payments/webhook
```

`NEXT_PUBLIC_RAZORPAY_KEY_ID` is not used by the current codebase. The fee order API returns the public key from the server.

### Razorpay X Salary Payouts

```env
RAZORPAY_PAYOUT_KEY_ID="rzp_live_or_test_payout_key_id"
RAZORPAY_PAYOUT_KEY_SECRET="your_razorpay_payout_key_secret"
RAZORPAY_X_ACCOUNT_NUMBER="your_razorpay_x_account_number"
```

These are required only when salary payout registration or payout processing is enabled.

## Vercel Variable Types

| Variable | Type | Suggested environments |
| --- | --- | --- |
| `NEXT_PUBLIC_*` | Plain | Production, Preview, Development |
| `DATABASE_URL` | Encrypted | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Encrypted | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Encrypted | Production, Preview, Development |
| `RAZORPAY_KEY_SECRET` | Encrypted | Production, Preview, Development |
| `RAZORPAY_WEBHOOK_SECRET` | Encrypted | Production, Preview, Development |
| `RAZORPAY_PAYOUT_KEY_SECRET` | Encrypted | Production, Preview, Development |

## Database Setup

After configuring production env vars, run migrations against the production database:

```bash
vercel env pull .env.production.local --environment=production
npx prisma migrate deploy
```

Seed production only if you intentionally want seed data:

```bash
npx prisma db seed
```

## Build Configuration

`vercel.json` uses:

```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

The `package.json` build script also runs `prisma generate` before `next build`.

## Post-Deployment Verification

1. Visit `https://your-app.vercel.app`.
2. Confirm it redirects to `/login` for signed-out users.
3. Visit `https://your-app.vercel.app/api/auth/session`.
4. Confirm it returns a JSON session response.
5. Log in as each role and confirm the correct dashboard opens.
6. Check Vercel runtime logs for errors.

## Troubleshooting

### Login fails

- Confirm `DATABASE_URL` is set and the database is reachable.
- Confirm `NEXTAUTH_SECRET` is set.
- Confirm `NEXTAUTH_URL` matches the deployed domain.
- Confirm users have bcrypt-hashed passwords and active accounts.

### Payments fail

- Confirm `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- Confirm `RAZORPAY_WEBHOOK_SECRET` matches the Razorpay dashboard webhook.
- Use live Razorpay keys for production.

### Salary payouts fail

- Confirm `RAZORPAY_PAYOUT_KEY_ID`.
- Confirm `RAZORPAY_PAYOUT_KEY_SECRET`.
- Confirm `RAZORPAY_X_ACCOUNT_NUMBER`.
- Confirm teachers have registered fund accounts.
