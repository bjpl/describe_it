#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Validates environment variables against defined schemas
 */

const fs = require('fs');
const path = require('path');
const { validateEnvironment } = require('../config/validation-schema');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const config = {};

  content.split('\n').forEach(line => {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.startsWith('#')) {
      const [key, ...valueParts] = cleanLine.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return config;
}

function validateConfig() {
  const environment = process.env.NODE_ENV || 'development';
  
  log(`${colors.bold}🔍 Validating environment configuration for: ${environment}${colors.reset}`, colors.blue);
  
  // Load configuration from various sources
  const sources = [
    { name: 'Process Environment', config: process.env },
    { name: '.env.local', config: loadEnvironmentFile('.env.local') },
    { name: '.env', config: loadEnvironmentFile('.env') },
    { name: `config/environment.${environment}.env`, config: loadEnvironmentFile(`config/environment.${environment}.env`) }
  ];

  // Merge all configurations (later sources override earlier ones)
  const mergedConfig = {};
  sources.forEach(source => {
    Object.assign(mergedConfig, source.config);
  });

  try {
    const validatedConfig = validateEnvironment(mergedConfig);
    
    log('✅ Environment validation passed!', colors.green);
    
    // Display configuration summary
    log('\n📋 Configuration Summary:', colors.blue);
    log(`Environment: ${validatedConfig.NODE_ENV}`, colors.yellow);
    log(`Port: ${validatedConfig.PORT}`);
    log(`API Base URL: ${validatedConfig.API_BASE_URL}`);
    log(`Redis Host: ${validatedConfig.REDIS_HOST}:${validatedConfig.REDIS_PORT}`);
    log(`Cache Enabled: ${validatedConfig.CACHE_ENABLED}`);
    log(`Log Level: ${validatedConfig.LOG_LEVEL}`);
    log(`Debug Mode: ${validatedConfig.FEATURE_DEBUG_MODE}`);

    // Check for sensitive data in logs
    const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];
    const exposedSecrets = Object.keys(validatedConfig).filter(key => 
      sensitiveKeys.some(sensitive => key.includes(sensitive)) && 
      validatedConfig[key] && 
      validatedConfig[key] !== ''
    );

    if (exposedSecrets.length > 0) {
      log('\n⚠️  Warning: Sensitive environment variables detected:', colors.yellow);
      exposedSecrets.forEach(key => {
        log(`  - ${key}`, colors.yellow);
      });
      log('Ensure these are properly secured and not logged.', colors.yellow);
    }

    // Environment-specific warnings
    if (environment === 'production') {
      const productionWarnings = [];
      
      if (validatedConfig.FEATURE_DEBUG_MODE) {
        productionWarnings.push('Debug mode is enabled in production');
      }
      
      if (validatedConfig.SOURCE_MAPS) {
        productionWarnings.push('Source maps are enabled in production');
      }
      
      if (validatedConfig.LOG_LEVEL === 'debug') {
        productionWarnings.push('Debug logging is enabled in production');
      }

      if (productionWarnings.length > 0) {
        log('\n🚨 Production Environment Warnings:', colors.red);
        productionWarnings.forEach(warning => {
          log(`  - ${warning}`, colors.red);
        });
      }
    }

    return validatedConfig;

  } catch (error) {
    log('❌ Environment validation failed:', colors.red);
    log(error.message, colors.red);
    
    // Provide helpful suggestions
    log('\n💡 Suggestions:', colors.yellow);
    log('1. Check your .env files for missing or invalid values');
    log('2. Ensure all required environment variables are set');
    log('3. Verify API keys and URLs are correctly formatted');
    log('4. Check the validation schema in config/validation-schema.js');
    
    process.exit(1);
  }
}

function generateTemplate() {
  const environment = process.argv[3] || 'development';
  const templatePath = `.env.${environment}.template`;
  
  log(`Generating environment template: ${templatePath}`, colors.blue);
  
  const template = `# Environment Configuration Template for ${environment.toUpperCase()}
# Copy this file to .env.local and fill in the actual values

# Application Configuration
NODE_ENV=${environment}
PORT=3000

# API Configuration
API_BASE_URL=https://your-domain.com/api
API_TIMEOUT=30000

# Database Configuration (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security Configuration
CORS_ORIGIN=https://your-domain.com

# Add other environment-specific variables here...
`;

  fs.writeFileSync(templatePath, template);
  log(`✅ Template generated: ${templatePath}`, colors.green);
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      validateConfig();
      break;
    case 'template':
      generateTemplate();
      break;
    case '--help':
    case '-h':
      log('Environment Configuration Validator', colors.bold);
      log('\nUsage:');
      log('  node scripts/validate-environment.js validate    - Validate current environment');
      log('  node scripts/validate-environment.js template [env] - Generate environment template');
      break;
    default:
      validateConfig(); // Default to validation
  }
}

module.exports = { validateConfig, loadEnvironmentFile };