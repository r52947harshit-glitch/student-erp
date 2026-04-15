# 🚀 Vercel Deployment Guide - School ERP

## ✅ Pre-Deployment Checklist

- [x] Build passes locally (`npm run build`)
- [x] All environment variables configured
- [x] Git repository is clean
- [x] `.env` is in `.gitignore` (✅ confirmed)
- [x] Production database configured (Supabase PostgreSQL)
- [x] Razorpay keys ready (test or production)
- [x] Supabase service role key secured

---

## 📋 Step 1: Push Code to GitHub

```bash
# Push your code to GitHub (if not already done)
git push origin main
```

---

## 📋 Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option B: Using Vercel Dashboard (Easier)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure environment variables (see below)
4. Click "Deploy"

---

## 🔑 Step 3: Configure Environment Variables

Add these environment variables in Vercel Dashboard:

**Navigate to:** Project Settings → Environment Variables

### Database Configuration

```env
DATABASE_URL="postgresql://postgres.hiivbgekplordkqyhkwf:kksI9Vs33rn35Tly@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.hiivbgekplordkqyhkwf:kksI9Vs33rn35Tly@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

### Authentication

```env
NEXTAUTH_SECRET="mjfvZZpQ9/Oa20MZwlOvXRuJQXey/xqf3Hd800+zwVI="
NEXTAUTH_URL="https://your-app.vercel.app"  # Update with your actual Vercel URL
```

### Supabase Storage

```env
NEXT_PUBLIC_SUPABASE_URL="https://hiivbgekplordkqyhkwf.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaXZiZ2VrcGxvcmRrcXloa3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjQxOTgsImV4cCI6MjA5MTI0MDE5OH0.2rhsui6qw0Ppi4fwQ8MgC6QsUqsfdsX0kiMQPwIHSPM"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpaXZiZ2VrcGxvcmRrcXloa3dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2NDE5OCwiZXhwIjoyMDkxMjQwMTk4fQ.9HsfJ2e1rkYHqolf2zXwYMLduQgP7BPytpZQQUefGNQ"
```

### Razorpay Payments

```env
RAZORPAY_KEY_ID="rzp_test_SdlHVeBzU3Jp0I"
RAZORPAY_KEY_SECRET="3umfMf725z5OOInWurShzmWh"
RAZORPAY_WEBHOOK_SECRET=""  # Add webhook URL after deployment
NEXT_PUBLIC_RAZORPAY_KEY_ID=""  # Same as RAZORPAY_KEY_ID
```

---

## 🔐 Step 4: Security Checklist

### ✅ What's Secure:
- [x] `SUPABASE_SERVICE_ROLE_KEY` only used in server-side code
- [x] `NEXT_PUBLIC_*` variables are safe for browser
- [x] `.env` file is in `.gitignore`
- [x] Database connection uses connection pooling (pgbouncer)

### ⚠️ Before Production:
- [ ] Generate new `NEXTAUTH_SECRET` (more secure):
  ```bash
  openssl rand -base64 32
  ```
- [ ] Update `NEXTAUTH_URL` to your production domain
- [ ] Use Razorpay **production keys** (not test keys)
- [ ] Set up Razorpay webhook endpoint: `https://your-app.vercel.app/api/payments/webhook`
- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Review database permissions

---

## 🗄️ Step 5: Database Setup

### Run Prisma Migrations on Production

After first deployment, run:

```bash
# Connect to your production database
vercel env pull .env.production.local

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

---

## 🌐 Step 6: Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project
2. Navigate to "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed

---

## 📊 Step 7: Post-Deployment Verification

### Test These Endpoints:

1. **Homepage**: `https://your-app.vercel.app`
   - Should redirect to `/login` or dashboard

2. **Auth API**: `https://your-app.vercel.app/api/auth/session`
   - Should return JSON: `{"user": null}`

3. **Health Check**: Visit any page
   - Should load without errors

### Check Vercel Logs:

```bash
vercel logs
```

---

## 🔄 Continuous Deployment

Once connected to Git:
- Every push to `main` automatically deploys to production
- Pull requests create preview deployments
- Monitor deployments in Vercel Dashboard

---

## 🚨 Troubleshooting

### Build Fails on Vercel

**Check logs:**
```bash
vercel --debug
```

**Common issues:**
- Missing environment variables
- TypeScript errors (should be fixed already)
- Memory limits (Next.js 15 may need more)

### Runtime Errors

**Check:**
1. Vercel Dashboard → Logs
2. Browser console for client errors
3. API route responses

### Database Connection Issues

**Verify:**
- `DATABASE_URL` has `?pgbouncer=true`
- `DIRECT_URL` does NOT have pgbouncer
- Supabase database is accessible

---

## 📝 Environment Variable Types in Vercel

When adding env vars in Vercel:

| Variable | Type | Environments |
|----------|------|--------------|
| `NEXT_PUBLIC_*` | **Plain** | Production, Preview, Development |
| `DATABASE_URL` | **Encrypted** | Production, Preview, Development |
| `NEXTAUTH_SECRET` | **Encrypted** | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | **Encrypted** | Production, Preview |

**Important:** Encrypted variables are not visible after saving!

---

## 🎯 Quick Deploy Commands

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Pull environment variables
vercel env pull

# List deployments
vercel ls
```

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Production Checklist](https://supabase.com/docs/guides/database/database-security)
- [Razorpay Integration Guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/)

---

## 🎉 After Deployment

Your School ERP will be live with:
- ✅ Role-based dashboards (Admin, Teacher, Student)
- ✅ Authentication & authorization
- ✅ Database integration (Supabase PostgreSQL)
- ✅ File storage (Supabase Storage)
- ✅ Payment processing (Razorpay)
- ✅ Production-grade security

**Good luck with your deployment! 🚀**
