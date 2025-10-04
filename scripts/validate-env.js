#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script validates environment configuration and provides
 * helpful information for developers and deployment.
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   npm run validate:env
 */

const path = require('path');
const fs = require('fs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: colorize('blue', 'ℹ'),
    success: colorize('green', '✅'),
    warning: colorize('yellow', '⚠️'),
    error: colorize('red', '❌'),
    debug: colorize('cyan', '🔍'),
  }[level] || 'ℹ';
  
  console.log(`${prefix} ${message}`);
}

async function validateEnvironment() {
  log('info', 'Starting environment validation...\n');
  
  try {
    // Try to load the environment validation
    const envConfigPath = path.join(__dirname, '..', 'src', 'config', 'env.ts');
    
    if (!fs.existsSync(envConfigPath)) {
      log('error', 'Environment configuration file not found!');
      process.exit(1);
    }
    
    // Check if .env.local exists
    const envLocalPath = path.join(__dirname, '..', '.env.local');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    if (!fs.existsSync(envLocalPath)) {
      log('warning', '.env.local file not found');
      log('info', 'Create .env.local by copying .env.example:');
      log('info', colorize('cyan', 'cp .env.example .env.local'));
      log('info', '');
    } else {
      log('success', '.env.local file found');
    }
    
    // Load environment variables
    try {
      require('dotenv').config({ path: envLocalPath });
    } catch (error) {
      // dotenv not installed, that's okay
    }
    
    // Environment validation checks
    const checks = [
      {
        name: 'Node.js Version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return { 
            passed: major >= 18, 
            message: major >= 18 ? `${version} (✅ Supported)` : `${version} (❌ Requires 18+)`,
            level: major >= 18 ? 'success' : 'error'
          };
        }
      },
      {
        name: 'NODE_ENV',
        check: () => {
          const env = process.env.NODE_ENV;
          const valid = ['development', 'test', 'production', 'staging'].includes(env);
          return {
            passed: valid,
            message: env ? `${env} ${valid ? '(✅ Valid)' : '(❌ Invalid)'}` : '(❌ Not set)',
            level: valid ? 'success' : 'error'
          };
        }
      },
      {
        name: 'App URL',
        check: () => {
          const url = process.env.NEXT_PUBLIC_APP_URL;
          const isUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
          return {
            passed: isUrl,
            message: url ? `${url} ${isUrl ? '(✅ Valid)' : '(❌ Invalid)'}` : '(❌ Not set)',
            level: isUrl ? 'success' : 'error'
          };
        }
      },
      {
        name: 'Unsplash API',
        check: () => {
          const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
          if (!key) {
            return { passed: true, message: '(🎭 Demo mode - using sample images)', level: 'info' };
          }
          return { passed: true, message: '(✅ Configured)', level: 'success' };
        }
      },
      {
        name: 'OpenAI API',
        check: () => {
          const key = process.env.OPENAI_API_KEY;
          if (!key) {
            return { passed: true, message: '(🎭 Demo mode - using sample content)', level: 'info' };
          }
          const validFormat = key.startsWith('sk-');
          return { 
            passed: validFormat, 
            message: validFormat ? '(✅ Configured)' : '(❌ Invalid format - should start with "sk-")',
            level: validFormat ? 'success' : 'error'
          };
        }
      },
      {
        name: 'Supabase Database',
        check: () => {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (!url || !key) {
            return { passed: true, message: '(🎭 Demo mode - using localStorage)', level: 'info' };
          }
          const validUrl = url.includes('supabase.co');
          return { 
            passed: validUrl, 
            message: validUrl ? '(✅ Configured)' : '(❌ Invalid URL format)',
            level: validUrl ? 'success' : 'error'
          };
        }
      },
      {
        name: 'API Security Keys',
        check: () => {
          const apiSecret = process.env.API_SECRET_KEY;
          const jwt = process.env.JWT_SECRET;
          const session = process.env.SESSION_SECRET;
          
          if (process.env.NODE_ENV !== 'production') {
            const hasKeys = apiSecret || jwt || session;
            return { 
              passed: true, 
              message: hasKeys ? '(ℹ️ Some keys configured)' : '(ℹ️ Using defaults for development)', 
              level: 'info' 
            };
          }
          
          // Production validation - check for secure keys
          const apiSecretValid = apiSecret && apiSecret.length >= 32 && !apiSecret.includes('your-') && !apiSecret.includes('placeholder');
          const jwtValid = jwt && jwt.length >= 32 && !jwt.includes('your-') && !jwt.includes('placeholder');
          const sessionValid = session && session.length >= 16 && !session.includes('your-') && !session.includes('placeholder');
          
          if (apiSecretValid && jwtValid && sessionValid) {
            return { passed: true, message: '(✅ All security keys configured)', level: 'success' };
          }
          
          const issues = [];
          if (!apiSecretValid) issues.push('API_SECRET_KEY');
          if (!jwtValid) issues.push('JWT_SECRET');
          if (!sessionValid) issues.push('SESSION_SECRET');
          
          return { 
            passed: false, 
            message: `(❌ Invalid or missing: ${issues.join(', ')})`,
            level: 'error'
          };
        }
      },
      {
        name: 'CORS Configuration',
        check: () => {
          const origins = process.env.ALLOWED_ORIGINS;
          
          if (process.env.NODE_ENV !== 'production') {
            return { passed: true, message: '(ℹ️ Development allows localhost)', level: 'info' };
          }
          
          if (!origins) {
            return { passed: false, message: '(❌ ALLOWED_ORIGINS not set for production)', level: 'error' };
          }
          
          if (origins.includes('localhost') || origins.includes('127.0.0.1')) {
            return { passed: false, message: '(❌ Contains localhost - security risk)', level: 'error' };
          }
          
          if (origins.includes('your-domain')) {
            return { passed: false, message: '(❌ Contains placeholder domain)', level: 'error' };
          }
          
          return { passed: true, message: '(✅ Production domains configured)', level: 'success' };
        }
      },
      {
        name: 'Debug Settings',
        check: () => {
          const debugEnabled = process.env.DEBUG_ENDPOINT_ENABLED;
          
          if (process.env.NODE_ENV === 'production') {
            if (debugEnabled === 'true') {
              return { passed: false, message: '(❌ Debug endpoint enabled in production)', level: 'error' };
            }
            return { passed: true, message: '(✅ Debug endpoint disabled)', level: 'success' };
          }
          
          return { passed: true, message: debugEnabled === 'true' ? '(ℹ️ Enabled for development)' : '(ℹ️ Disabled)', level: 'info' };
        }
      },
      {
        name: 'Rate Limiting',
        check: () => {
          const windowMs = process.env.RATE_LIMIT_WINDOW_MS;
          const maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;
          
          if (process.env.NODE_ENV === 'production') {
            const windowValid = windowMs && parseInt(windowMs) <= 15000;
            const maxValid = maxRequests && parseInt(maxRequests) <= 100;
            
            if (windowValid && maxValid) {
              return { passed: true, message: `(✅ ${maxRequests} requests per ${parseInt(windowMs)/1000}s)`, level: 'success' };
            }
            return { passed: false, message: '(❌ Rate limiting too permissive for production)', level: 'error' };
          }
          
          return { passed: true, message: '(ℹ️ Development settings)', level: 'info' };
        }
      }
    ];
    
    log('info', colorize('bold', 'Environment Validation Results:'));
    log('info', '━'.repeat(50));
    
    let hasErrors = false;
    let hasWarnings = false;
    
    checks.forEach(({ name, check }) => {
      const result = check();
      const status = result.level === 'error' ? '❌' : 
                   result.level === 'warning' ? '⚠️' : 
                   result.level === 'success' ? '✅' : 'ℹ️';
      
      console.log(`${status} ${name.padEnd(25)} ${result.message}`);
      
      if (result.level === 'error') hasErrors = true;
      if (result.level === 'warning') hasWarnings = true;
    });
    
    log('info', '━'.repeat(50));
    
    // Summary
    if (hasErrors) {
      log('error', 'Validation failed with errors. Please fix the issues above.');
      log('info', 'Check the .env.example file for configuration guidance.');
      process.exit(1);
    } else if (hasWarnings) {
      log('warning', 'Validation passed with warnings. Consider addressing them.');
    } else {
      log('success', 'Environment validation passed successfully!');
    }
    
    // Additional information
    log('info', '\n' + colorize('bold', 'Additional Information:'));
    log('info', `• Demo mode: ${!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? 'Enabled' : 'Disabled'}`);
    log('info', `• Environment status: ${process.env.NEXT_PUBLIC_APP_URL}/api/env-status`);
    log('info', `• Health check: ${process.env.NEXT_PUBLIC_APP_URL}/api/env-status?health=true`);
    
    if (!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
      log('info', '\n' + colorize('cyan', 'Demo Mode Active:'));
      log('info', '• Application will work with sample data');
      log('info', '• No API costs or rate limits');
      log('info', '• Add real API keys to .env.local to disable demo mode');
    }
    
  } catch (error) {
    log('error', `Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run validation
validateEnvironment();