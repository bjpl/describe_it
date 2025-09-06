# Vercel Environment Variables

## How to Add These to Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable below with the corresponding key and value
4. Mark sensitive variables as "Secret" (encrypted)
5. Select the appropriate environments (Production/Preview/Development)

## Environment Variables to Add

### Unsplash API
```
Key: UNSPLASH_ACCESS_KEY
Value: DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY
Type: Secret (Encrypted)
Environments: All
```

### OpenAI API
```
Key: OPENAI_API_KEY
Value: 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
Type: Secret (Encrypted)
Environments: All
```

### Supabase Configuration

#### Supabase URL
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://arjrpdccaczbybbqhvc.supabase.co
Type: Plain Text
Environments: All
```

#### Supabase Anon Key (Public)
```
Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODQ4MzQsImV4cCI6MjA3MjE2MDgzNH0.pRI087i7y7wJx7DJx69kN3rxZEwvV0gBVCyfapXbH5c
Type: Plain Text
Environments: All
```

#### Supabase Service Role (Server-side only)
```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4NDgzNCwiZXhwIjoyMDcyMTYwODM0fQ.ZoeFLYhKnFshoIcDdJiIOdrOSAoFtyGjx3gG_aKGl7c
Type: Secret (Encrypted)
Environments: Production only
```

#### Supabase Publishable Key
```
Key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable_mVFkIY_x0lM0xx6CxVmlEA_m4i5k2v7
Type: Plain Text
Environments: All
```

#### Supabase JWT Secret (Legacy)
```
Key: SUPABASE_JWT_SECRET
Value: fPctuxk0N5eY2kXJtdDZwt/oh0i+i9+QZ8yVkLki6rW6i0fcRMRUrYaN01FEk5BDaPbt/Sx/gXow5CMjxkljCg==
Type: Secret (Encrypted)
Environments: Production only
```

### Redis Configuration
```
Key: REDIS_URL
Value: [You need to complete this - looks like it was cut off at "RE"]
Type: Secret (Encrypted)
Environments: All
```

## Alternative: Using Vercel CLI

You can also add these using the Vercel CLI:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Add environment variables
vercel env add UNSPLASH_ACCESS_KEY production
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_JWT_SECRET production
vercel env add REDIS_URL production
```

## Important Notes

1. **NEXT_PUBLIC_** prefix makes variables available to the browser/client-side
2. Variables without this prefix are server-side only
3. Service role keys should NEVER be exposed to the client
4. Always use encrypted/secret option for sensitive keys
5. The Redis value appears incomplete - please provide the full connection string