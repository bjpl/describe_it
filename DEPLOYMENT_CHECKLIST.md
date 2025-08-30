# 🚀 Deployment Checklist

## Pre-Deployment Steps

### 1. Vercel Setup (5 minutes)
```bash
npm i -g vercel
vercel login
vercel link
```

### 2. Environment Variables
Create these in GitHub Secrets (Settings → Secrets → Actions):

#### Vercel
- [ ] `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
- [ ] `VERCEL_ORG_ID` - Will be in `.vercel/project.json` after `vercel link`
- [ ] `VERCEL_PROJECT_ID` - Will be in `.vercel/project.json` after `vercel link`

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase dashboard
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase dashboard
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard (keep secret!)

#### Optional (can add later)
- [ ] `SENTRY_AUTH_TOKEN` - For error tracking
- [ ] `SLACK_WEBHOOK_URL` - For deployment notifications

### 3. Supabase Setup
1. Create project at https://supabase.com
2. Run database setup:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 4. Deploy Command
```bash
# Commit and push
git add .
git commit -m "Deploy: Spanish learning app production ready"
git push origin main
```

## Post-Deployment

### 5. Verify Deployment
- [ ] Check Vercel dashboard for successful build
- [ ] Visit production URL
- [ ] Test image search functionality
- [ ] Verify Supabase connection

### 6. Monitor
- [ ] Check GitHub Actions tab for CI/CD status
- [ ] Review Vercel Analytics
- [ ] Test core features:
  - Image search
  - Description generation
  - Vocabulary extraction
  - Progress tracking

## Quick Deploy (if you want to deploy immediately)

```bash
# Deploy directly to Vercel (bypasses CI/CD)
vercel --prod
```

## Troubleshooting

### Build Errors
- Check Node version (should be 18+)
- Verify all environment variables are set
- Review build logs in Vercel dashboard

### Database Connection
- Ensure Supabase URL and keys are correct
- Check Row Level Security policies
- Verify database migrations ran

### Performance Issues
- Review Lighthouse scores in Vercel Analytics
- Check bundle size in build output
- Monitor Core Web Vitals

## Support Resources
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs