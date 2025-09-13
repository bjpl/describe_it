# Security Infrastructure Documentation

This directory contains a comprehensive security infrastructure implementation for the describe_it project using open-source solutions and security best practices.

## 🔒 Security Components

### 1. HashiCorp Vault Integration (`vault-client.ts`)

**Purpose**: Secure storage and management of secrets and API keys

**Features**:
- Token and AppRole authentication support
- Automatic token renewal and rotation
- Health monitoring and failover capabilities
- Comprehensive audit logging
- Secret versioning and metadata tracking

**Usage**:
```typescript
import { createVaultClient } from '@/lib/security/vault-client';

const client = createVaultClient({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN
});

await client.authenticate();
const secret = await client.readSecret('secret/api-keys/openai');
```

### 2. Secrets Manager (`secrets-manager.ts`)

**Purpose**: Unified abstraction layer for secret storage with multiple backend support

**Supported Backends**:
- HashiCorp Vault (production)
- Environment variables (development)
- In-memory storage with Redis persistence (testing)

**Features**:
- Automatic encryption at rest using AES-GCM
- Caching with configurable TTL
- Zero-trust secret validation
- Distributed locking for concurrent access

**Usage**:
```typescript
import { createSecretsManager } from '@/lib/security/secrets-manager';

const manager = createSecretsManager({
  provider: 'vault',
  vault: { endpoint: 'https://vault.example.com' },
  encryption: { enabled: true }
});

await manager.setSecret('api-key', 'sk-...');
const key = await manager.getSecret('api-key');
```

### 3. Encryption Utilities (`encryption.ts`)

**Purpose**: Cryptographic functions for data protection

**Features**:
- **Symmetric encryption**: AES-GCM/AES-CBC with 256-bit keys
- **Asymmetric encryption**: RSA with OAEP padding
- **Digital signatures**: RSA-PSS with SHA-256
- **Key derivation**: PBKDF2 with configurable iterations
- **Secure random generation**: Cryptographically secure randomness

**Usage**:
```typescript
import { SymmetricEncryption, AsymmetricEncryption } from '@/lib/security/encryption';

// Symmetric encryption
const symEncrypt = new SymmetricEncryption();
const key = symEncrypt.generateKey();
const encrypted = symEncrypt.encrypt('sensitive data', key);
const decrypted = symEncrypt.decrypt(encrypted, key);

// Asymmetric encryption
const asymEncrypt = new AsymmetricEncryption();
const keyPair = asymEncrypt.generateKeyPair();
const encrypted = asymEncrypt.encrypt('message', keyPair.publicKey);
const decrypted = asymEncrypt.decrypt(encrypted, keyPair.privateKey);
```

### 4. Key Rotation (`key-rotation.ts`)

**Purpose**: Automated cryptographic key lifecycle management

**Features**:
- **Scheduled rotation**: Cron-based automatic rotation
- **Zero-downtime**: Graceful key transitions
- **Distributed locks**: Redis-based coordination
- **Audit trail**: Complete rotation history
- **Manual override**: Emergency rotation capabilities

**Configuration**:
```typescript
import { createKeyRotationManager } from '@/lib/security/key-rotation';

const rotationManager = createKeyRotationManager({
  schedule: '0 2 * * 0', // Weekly at 2 AM Sunday
  keyTypes: ['symmetric', 'asymmetric'],
  rotationPolicy: {
    maxAge: 90, // days
    gracePeriod: 7, // days
  },
  notifications: {
    webhook: 'https://alerts.example.com/webhook'
  }
});

await rotationManager.start();
```

### 5. Session Management (`session-manager.ts`)

**Purpose**: Secure session handling with enterprise-grade features

**Features**:
- **Encrypted sessions**: AES-GCM encrypted session data
- **CSRF protection**: Token-based CSRF validation
- **Session fingerprinting**: Device and browser fingerprinting
- **Distributed storage**: Redis-backed session store
- **Rolling expiration**: Automatic session renewal

**Usage**:
```typescript
import { createSessionManager } from '@/lib/security/session-manager';

const sessionManager = createSessionManager({
  secret: process.env.SESSION_SECRET,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: true,
  encryption: { enabled: true }
});

const session = await sessionManager.createSession('user123');
const token = sessionManager.generateSessionToken(session.id);
```

### 6. Audit Logging (`audit-logger.ts`)

**Purpose**: Comprehensive security event logging and monitoring

**Features**:
- **Structured logging**: JSON-formatted audit events
- **Sensitive data filtering**: Automatic PII redaction
- **Log rotation**: Size and time-based rotation
- **Multiple transports**: File and console logging
- **Event categorization**: Security, access, and operation events

**Usage**:
```typescript
import { getAuditLogger } from '@/lib/security/audit-logger';

const logger = getAuditLogger('api-security');

// Audit security events
logger.auditEvent({
  action: 'API_KEY_VALIDATION',
  userId: 'user123',
  success: true,
  metadata: { keyType: 'openai' }
});

// Specific event types
logger.authenticationEvent('user123', 'password', '192.168.1.1', true);
logger.keyOperationEvent('ROTATION', 'key-123', true);
```

### 7. Security Middleware (`secure-middleware.ts`)

**Purpose**: Comprehensive security middleware for Next.js API routes

**Features**:
- **Zero-trust validation**: Request validation and trust scoring
- **API key management**: Secure key retrieval and validation
- **Rate limiting**: Redis-backed rate limiting
- **CSRF protection**: Token-based CSRF validation
- **Security headers**: Automatic security header injection

**Usage**:
```typescript
import { withSecurity } from '@/lib/security/secure-middleware';

export const POST = withSecurity(
  async (request: SecureRequest) => {
    // Your API logic here
    request.audit('API_CALL', { endpoint: '/api/example' });
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    enableRateLimit: true,
    enableCsrf: true,
    rateLimit: {
      requests: 10,
      window: 15 * 60 * 1000 // 15 minutes
    }
  }
);
```

## 🛡️ Security Architecture

### Zero-Trust Model

The security infrastructure implements a zero-trust security model where:

1. **No implicit trust**: Every request is validated regardless of source
2. **Continuous verification**: Authentication and authorization on every request
3. **Principle of least privilege**: Minimal required permissions granted
4. **Defense in depth**: Multiple security layers

### Key Security Patterns

1. **Client never sees real API keys**: Server-side proxy pattern
2. **Encryption everywhere**: Data encrypted in transit and at rest
3. **Comprehensive audit trail**: All security events logged
4. **Graceful degradation**: Fallback mechanisms for service failures

### Environment Configuration

Create these environment variables for production deployment:

```bash
# Vault Configuration
VAULT_ENDPOINT=https://vault.your-domain.com
VAULT_TOKEN=hvs.your-vault-token
VAULT_ROLE_ID=your-role-id
VAULT_SECRET_ID=your-secret-id
VAULT_NAMESPACE=your-namespace

# Encryption Keys
ENCRYPTION_KEY=your-256-bit-encryption-key
SESSION_SECRET=your-session-secret

# Redis Configuration
REDIS_HOST=redis.your-domain.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# API Keys (fallback if Vault unavailable)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

## 🚀 Quick Start

1. **Install dependencies**:
```bash
npm install node-vault winston node-forge ioredis node-cron
```

2. **Initialize security in your API route**:
```typescript
import { withSecurity, getSecureApiKey } from '@/lib/security/secure-middleware';

export const POST = withSecurity(
  async (request) => {
    const apiKey = await getSecureApiKey('OPENAI_API_KEY', request.userApiKey);
    // Use the securely retrieved API key
  },
  { requireAuth: true, enableRateLimit: true }
);
```

3. **Set up Vault (optional)**:
```bash
# Start Vault in development mode
vault server -dev

# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# Store secrets
vault kv put secret/api-keys openai="sk-your-key"
```

## 📊 Monitoring and Alerts

The security infrastructure provides comprehensive monitoring:

- **Audit logs**: All security events in `/logs/security-audit.log`
- **Metrics**: Key rotation status, authentication rates, etc.
- **Alerts**: Webhook notifications for security events
- **Health checks**: Vault connectivity and key validity

## 🔧 Customization

Each component can be configured independently:

- **Encryption algorithms**: AES-GCM, AES-CBC, RSA-OAEP
- **Key sizes**: 128, 192, 256-bit for symmetric; 2048, 4096-bit for RSA
- **Rotation schedules**: Cron expressions for automated rotation
- **Session policies**: TTL, rolling expiration, fingerprinting
- **Audit levels**: DEBUG, INFO, WARN, ERROR

## 🧪 Testing

Security components include comprehensive test coverage:

```bash
# Run security tests
npm test src/lib/security/

# Test with different backends
TEST_PROVIDER=vault npm test
TEST_PROVIDER=env npm test
TEST_PROVIDER=memory npm test
```

## ⚠️ Security Considerations

1. **Key Management**: Store encryption keys securely in Vault or HSM
2. **Network Security**: Use TLS 1.3 for all communications
3. **Access Control**: Implement proper RBAC for Vault access
4. **Monitoring**: Set up alerts for failed authentication attempts
5. **Backup**: Regularly backup Vault data and audit logs
6. **Compliance**: Ensure configuration meets your compliance requirements

## 📚 Additional Resources

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Winston Logging Documentation](https://github.com/winstonjs/winston)

---

This security infrastructure provides enterprise-grade security for the describe_it project while maintaining flexibility and ease of use.