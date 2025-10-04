# Security Guide

This document outlines the security measures, best practices, and configuration guidelines for the Describe It application.

## 🔐 Security Overview

The Describe It application implements multiple layers of security to protect user data, prevent unauthorized access, and ensure safe operation in production environments.

### Security Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client (Web)  │────│  Next.js API     │────│  External APIs  │
│   - CSP         │    │  - CORS          │    │  - OpenAI       │
│   - SRI         │    │  - Rate Limiting │    │  - Supabase     │
│   - HTTPS       │    │  - Input Valid.  │    │  - Unsplash     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │   - RLS          │
                       │   - Encryption   │
                       │   - Audit Logs   │
                       └──────────────────┘
```

## 🛡️ Security Features

### 1. Authentication & Authorization

**Supabase Auth Integration**
- JWT-based authentication with secure token handling
- OAuth providers (Google, GitHub) with proper scopes
- Row-level security (RLS) policies on all database tables
- Automatic token refresh and session management

**Implementation:**
```typescript
// Authentication middleware
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createRouteHandlerClient({ cookies: () => request.cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return res
}
```

### 2. Input Validation & Sanitization

**Zod Schema Validation**
- All API endpoints use Zod schemas for request validation
- Type-safe validation with detailed error messages
- Automatic sanitization of user inputs

**Example:**
```typescript
import { z } from 'zod';

const descriptionSchema = z.object({
  imageUrl: z.string().url("Invalid image URL").max(2048),
  style: z.enum(['narrativo', 'poetico', 'academico', 'conversacional', 'infantil']),
  maxLength: z.coerce.number().int().min(50).max(1000).default(300),
  customPrompt: z.string().max(500).optional()
});
```

**XSS Prevention**
- Content Security Policy (CSP) headers
- HTML entity encoding for user-generated content
- DOM purification for rich text content

### 3. API Security

**Rate Limiting**
```typescript
// Rate limiting configuration
export const rateLimit = {
  '/api/descriptions/generate': { max: 10, window: 60000 }, // 10 requests per minute
  '/api/qa/generate': { max: 15, window: 60000 },          // 15 requests per minute
  '/api/translate': { max: 100, window: 60000 },           // 100 requests per minute
  '/api/images/search': { max: 30, window: 60000 }         // 30 requests per minute
};
```

**CORS Configuration**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'https://describe-it.vercel.app'
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400' // 24 hours
};
```

**API Key Management**
- Environment-based API key storage
- Automatic fallback to demo mode when keys are missing
- Key rotation support through environment variables

### 4. Database Security

**Row-Level Security (RLS)**
```sql
-- Example RLS policy for user_sessions table
CREATE POLICY "Users can only access their own sessions"
ON user_sessions
USING (user_id = auth.uid());

-- Example policy for public read access with private writes
CREATE POLICY "Public can read descriptions"
ON descriptions FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own descriptions"
ON descriptions FOR INSERT
WITH CHECK (user_id = auth.uid());
```

**Data Encryption**
- Automatic encryption at rest (Supabase)
- TLS 1.3 for data in transit
- Encrypted environment variables (Vercel)

**Audit Logging**
```sql
-- Audit log table
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Client-Side Security

**Content Security Policy**
```javascript
const csp = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Next.js requires this
    'https://va.vercel-scripts.com', // Vercel Analytics
    'https://www.googletagmanager.com' // Google Analytics
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind CSS requires this
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'https://images.unsplash.com',
    'https://avatars.githubusercontent.com',
    'data:' // For generated images
  ],
  'connect-src': [
    "'self'",
    'https://api.openai.com',
    'https://*.supabase.co',
    'https://api.unsplash.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ]
};
```

**Subresource Integrity (SRI)**
```javascript
// Automatic SRI for external scripts
const externalScripts = [
  {
    src: 'https://va.vercel-scripts.com/v1/script.js',
    integrity: 'sha384-S2u3f...', // Generated during build
    crossorigin: 'anonymous'
  }
];
```

## 🚀 Production Security Setup

### Environment Variables

Create a `.env.local` file with the following secure configuration:

```bash
# Database & Auth (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Services (Optional - app works in demo mode without these)
OPENAI_API_KEY=sk-...

# Image Services (Optional)
UNSPLASH_ACCESS_KEY=your-unsplash-access-key

# Cache & Storage (Auto-configured on Vercel)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# Security Configuration
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.com

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Monitoring & Analytics
SENTRY_DSN=https://...
VERCEL_ANALYTICS_ID=...

# Security Headers
SECURITY_HEADERS_ENABLED=true
CSP_REPORT_URI=https://your-domain.com/api/csp-report
```

### Supabase Security Configuration

1. **Enable Row-Level Security**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
```

2. **Configure Auth Policies**
```sql
-- User profile policies
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Session policies
CREATE POLICY "Users can access their own sessions"
ON sessions
USING (user_id = auth.uid());

-- Description policies
CREATE POLICY "Public can read published descriptions"
ON descriptions FOR SELECT
USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create descriptions"
ON descriptions FOR INSERT
WITH CHECK (user_id = auth.uid());
```

3. **Enable Audit Logging**
```sql
-- Enable audit logging for all tables
SELECT audit.enable_tracking('users'::regclass);
SELECT audit.enable_tracking('sessions'::regclass);
SELECT audit.enable_tracking('descriptions'::regclass);
```

### API Security Headers

The application automatically sets security headers in production:

```typescript
// Security headers middleware
export function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}
```

## 🔍 Security Monitoring

### Real-time Monitoring

1. **Error Tracking**
```typescript
// Sentry integration for error monitoring
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers['x-api-key'];
    }
    return event;
  }
});
```

2. **Rate Limit Monitoring**
```typescript
// Track rate limit violations
export async function trackRateLimit(ip: string, endpoint: string, exceeded: boolean) {
  if (exceeded) {
    await logSecurityEvent({
      event: 'rate_limit_exceeded',
      ip_address: ip,
      endpoint,
      severity: 'warning'
    });
  }
}
```

3. **Authentication Events**
```typescript
// Monitor auth events
export async function trackAuthEvent(event: string, userId?: string, metadata?: any) {
  await logSecurityEvent({
    event: `auth_${event}`,
    user_id: userId,
    metadata,
    severity: event.includes('failed') ? 'error' : 'info'
  });
}
```

### Security Audit Log

```typescript
interface SecurityEvent {
  event: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
  timestamp: string;
}

export async function logSecurityEvent(event: SecurityEvent) {
  // Log to database
  await supabase
    .from('security_audit_log')
    .insert({
      ...event,
      timestamp: new Date().toISOString()
    });

  // Alert on critical events
  if (event.severity === 'critical') {
    await alertSecurityTeam(event);
  }
}
```

## 🚨 Incident Response

### Security Incident Checklist

1. **Immediate Response**
   - [ ] Identify and contain the threat
   - [ ] Revoke compromised API keys
   - [ ] Enable emergency rate limiting
   - [ ] Backup current data
   - [ ] Document the incident

2. **Investigation**
   - [ ] Analyze security audit logs
   - [ ] Check for data breaches
   - [ ] Identify attack vectors
   - [ ] Assess damage scope
   - [ ] Preserve forensic evidence

3. **Recovery**
   - [ ] Patch security vulnerabilities
   - [ ] Update authentication credentials
   - [ ] Restore services safely
   - [ ] Notify affected users
   - [ ] Update security measures

4. **Post-Incident**
   - [ ] Conduct security review
   - [ ] Update incident response plan
   - [ ] Train team on lessons learned
   - [ ] Implement additional monitoring
   - [ ] Document improvements

### Emergency Contacts

- **Security Team**: security@describe-it.app
- **DevOps Team**: devops@describe-it.app
- **Legal Team**: legal@describe-it.app

## 🔧 Security Tools & Resources

### Development Tools

1. **Static Analysis**
```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security

# TypeScript strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

2. **Dependency Scanning**
```bash
# Audit dependencies
npm audit --audit-level moderate

# Check for vulnerabilities
npm run security:scan
```

3. **Secret Scanning**
```bash
# Git hooks to prevent secrets
# .git/hooks/pre-commit
#!/bin/sh
git diff --cached --name-only | xargs grep -l "sk-\|AKIA\|AIza" && {
  echo "Potential secret detected!"
  exit 1
}
```

### Production Monitoring

1. **Vercel Security Headers**
```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

2. **Supabase Security**
```sql
-- Regular security audit query
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
```

## 📚 Security Best Practices

### For Developers

1. **Code Security**
   - Always validate and sanitize user input
   - Use parameterized queries to prevent SQL injection
   - Implement proper error handling without exposing sensitive data
   - Follow the principle of least privilege
   - Use secure coding standards (OWASP guidelines)

2. **API Security**
   - Implement rate limiting on all endpoints
   - Use HTTPS for all communications
   - Validate Content-Type headers
   - Implement proper CORS policies
   - Use API versioning for backward compatibility

3. **Authentication**
   - Implement strong password policies
   - Use multi-factor authentication where possible
   - Implement proper session management
   - Use secure token storage (httpOnly cookies)
   - Implement account lockout mechanisms

### For Deployment

1. **Environment Security**
   - Never commit secrets to version control
   - Use environment-specific configurations
   - Implement proper secret rotation
   - Use encrypted environment variables
   - Regular security updates and patches

2. **Monitoring**
   - Implement comprehensive logging
   - Monitor for suspicious activities
   - Set up security alerts
   - Regular security audits
   - Automated vulnerability scanning

## 🔄 Security Updates

### Regular Security Tasks

- [ ] **Weekly**: Review security audit logs
- [ ] **Monthly**: Update dependencies and check for vulnerabilities
- [ ] **Quarterly**: Rotate API keys and secrets
- [ ] **Annually**: Conduct comprehensive security audit
- [ ] **As needed**: Apply security patches immediately

### Security Changelog

Track security updates in `SECURITY_CHANGELOG.md`:

```markdown
## Security Updates

### 2024-01-15 - v1.2.1
- Updated OpenAI API integration with enhanced rate limiting
- Fixed potential XSS vulnerability in description display
- Added additional CORS validation

### 2024-01-01 - v1.2.0
- Implemented Content Security Policy (CSP)
- Added Subresource Integrity (SRI) for external scripts
- Enhanced input validation with Zod schemas
```

## 📞 Reporting Security Issues

If you discover a security vulnerability, please follow responsible disclosure:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: security@describe-it.app
3. Include detailed information about the vulnerability
4. Allow reasonable time for investigation and patching
5. We will acknowledge receipt within 48 hours

### Bug Bounty Program

We appreciate security researchers who help improve our platform. Contact us at security@describe-it.app for information about our bug bounty program.

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential for maintaining a secure application.