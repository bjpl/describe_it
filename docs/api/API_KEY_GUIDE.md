# API Key Configuration Guide

## Overview

This application uses a sophisticated API key management system that allows you to share the app with others while letting each user configure their own API keys. The system implements enterprise-grade security and real-time updates.

## Quick Start

### Option 1: Configure Through Settings UI (Recommended)

1. Click the **Settings** icon in the application
2. Navigate to the **API Configuration** tab
3. Enter your API keys:
   - **Unsplash API Key**: For image search functionality
   - **OpenAI API Key**: For AI-powered descriptions
4. Click **Test Keys** to validate
5. Keys are automatically saved and services update in real-time

### Option 2: Environment Variables (For Deployment)

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_key_here
OPENAI_API_KEY=your_openai_key_here
```

## Getting API Keys

### Unsplash API Key

1. Visit [Unsplash Developers](https://unsplash.com/developers)
2. Click "New Application"
3. Accept the terms
4. Enter application details
5. Copy your **Access Key**

### OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key immediately (it won't be shown again)

## Priority System

The application uses a smart priority system for API keys:

```
User Settings (Highest Priority)
    ↓
Environment Variables
    ↓
Demo Mode (Fallback)
```

This means:
- **Your settings always win**: Keys entered in Settings override everything
- **Environment fallback**: If no settings key, uses environment variables
- **Demo mode**: If no keys anywhere, uses limited demo functionality

## Security Features

### Built-in Protection

The system includes multiple security layers:

1. **Format Validation**: Keys must match expected patterns
2. **Injection Prevention**: Blocks malicious input attempts
3. **Placeholder Detection**: Prevents using example keys
4. **Length Requirements**: Ensures keys meet minimum security standards

### What's Blocked

The following will be rejected:
- Keys containing "example", "demo", "test", "placeholder"
- Keys with special characters like `<>\"'\``
- Keys that are too short (< 20 characters)
- SQL injection attempts
- XSS (Cross-Site Scripting) attempts

## Real-Time Updates

When you change API keys:

1. **Instant Service Update**: Services automatically reinitialize
2. **No Restart Required**: Changes apply immediately
3. **Seamless Transition**: No interruption to your workflow
4. **Memory Efficient**: Old connections cleaned up automatically

## Sharing the Application

When sharing this app with others:

1. **No Keys in Code**: Never commit API keys to the repository
2. **Each User Configures**: Every user enters their own keys
3. **Settings Persist**: Keys are saved locally in browser storage
4. **Export/Import**: Settings can be exported and shared (keys excluded)

## Troubleshooting

### "Invalid API Key" Error

**Symptoms**: Red "Invalid" badge in settings

**Solutions**:
1. Check for extra spaces before/after the key
2. Ensure you copied the entire key
3. Verify the key hasn't expired
4. Check you're using the correct key type

### Images Not Loading

**Symptoms**: Demo images appear instead of real search results

**Solutions**:
1. Verify Unsplash key is entered correctly
2. Check rate limits (50 requests/hour for free tier)
3. Test key using the "Test Keys" button
4. Check browser console for specific errors

### AI Descriptions Not Working

**Symptoms**: Generic descriptions or errors

**Solutions**:
1. Verify OpenAI key is valid
2. Check API credit balance on OpenAI dashboard
3. Ensure key has proper permissions
4. Test with a simple prompt first

## Architecture Overview

For developers interested in the implementation:

### Design Patterns Used

1. **Singleton Pattern**: Single source of truth for keys
2. **Observer Pattern**: Real-time updates to all services
3. **Strategy Pattern**: Priority-based key resolution
4. **Factory Pattern**: Service initialization based on key availability

### Key Components

```typescript
// Priority Resolution
Settings API Keys → Environment Variables → Demo Mode

// Real-time Updates
User Input → Settings Manager → Key Provider → Services

// Security Validation
Input → Format Check → Placeholder Check → Injection Check → Accept/Reject
```

### Testing

Run integration tests to verify the system:

```bash
npm test -- tests/integration/api-key-flow.test.ts
```

## Best Practices

1. **Never Share Keys**: Each user should use their own
2. **Rotate Regularly**: Change keys periodically for security
3. **Use Environment Variables**: For production deployments
4. **Monitor Usage**: Check API dashboards for unusual activity
5. **Set Rate Limits**: Configure appropriate limits in production

## Support

If you encounter issues:

1. Check this guide first
2. Review browser console for errors
3. Test keys individually using the "Test Keys" button
4. Create an issue on GitHub with details (never include actual keys)

---

## Technical Details for Developers

### File Structure

```
src/lib/api/
├── keyProvider.ts       # Central key management
├── unsplash.ts         # Unsplash service integration
├── openai.ts           # OpenAI service integration
└── vercel-kv.ts        # Caching layer

src/lib/settings/
└── settingsManager.ts  # Settings persistence

src/components/Settings/
└── PrivacySettings.tsx # UI for key configuration
```

### Adding New Services

To add a new API service:

1. Add to `ServiceType` in `keyProvider.ts`
2. Add environment variable mapping
3. Add validation pattern
4. Create service file with keyProvider integration
5. Add UI in Settings component

### Security Considerations

- Keys are stored in browser localStorage (encrypted)
- Never logged to console in production
- Validated on both client and server
- Rate limiting implemented per service
- Automatic cleanup on service destruction

This system ensures a secure, user-friendly experience while maintaining flexibility for different deployment scenarios.