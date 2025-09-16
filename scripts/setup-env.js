#!/usr/bin/env node

/**
 * Environment Setup and Validation Script
 *
 * This script helps developers:
 * 1. Generate required security keys
 * 2. Validate environment configuration
 * 3. Test API connections
 * 4. Create .env.local from template
 *
 * Usage:
 *   npm run setup:env          # Interactive setup
 *   npm run setup:env --keys   # Generate keys only
 *   npm run setup:env --test   # Test connections only
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI Colors for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔧${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.magenta}${msg}${colors.reset}\n`),
};

class EnvironmentSetup {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env.local');
    this.templatePath = path.join(process.cwd(), '.env.local.example');
    this.config = {};
  }

  async run() {
    const args = process.argv.slice(2);

    log.title('🚀 Describe It - Environment Setup');

    if (args.includes('--keys')) {
      return this.generateKeys();
    }

    if (args.includes('--test')) {
      return this.testConnections();
    }

    if (args.includes('--validate')) {
      return this.validateEnvironment();
    }

    // Interactive setup
    await this.interactiveSetup();
  }

  async interactiveSetup() {
    log.title('🛠️ Interactive Environment Setup');

    // Check if .env.local exists
    if (fs.existsSync(this.envPath)) {
      const overwrite = await this.ask(
        'Found existing .env.local file. Overwrite? (y/N): '
      );
      if (!overwrite.toLowerCase().startsWith('y')) {
        log.info('Setup cancelled. Use --test to validate existing config.');
        return;
      }
    }

    // Step 1: Generate security keys
    log.step('Step 1: Generating security keys...');
    const keys = this.generateSecurityKeys();
    log.success('Security keys generated');

    // Step 2: Copy template
    log.step('Step 2: Creating .env.local from template...');
    this.copyTemplate();

    // Step 3: Interactive key input
    log.step('Step 3: Configure API keys...');
    await this.configureApiKeys();

    // Step 4: Update file with keys
    this.updateEnvFile(keys);

    // Step 5: Test connections
    log.step('Step 5: Testing API connections...');
    await this.testConnections();

    log.success('Environment setup complete! 🎉');
    log.info('Run "npm run dev" to start the development server');
  }

  generateSecurityKeys() {
    log.info('Generating cryptographically secure keys...');

    const keys = {
      API_SECRET_KEY: crypto.randomBytes(32).toString('hex'),
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(16).toString('hex'),
    };

    console.log('\n' + colors.dim + '# Generated Security Keys:' + colors.reset);
    Object.entries(keys).forEach(([key, value]) => {
      console.log(`${colors.dim}${key}=${value}${colors.reset}`);
    });
    console.log('');

    return keys;
  }

  generateKeys() {
    log.title('🔐 Security Key Generator');
    const keys = this.generateSecurityKeys();
    log.success('Copy these keys to your .env.local file');
    process.exit(0);
  }

  copyTemplate() {
    if (!fs.existsSync(this.templatePath)) {
      log.error('Template file .env.local.example not found');
      process.exit(1);
    }

    const template = fs.readFileSync(this.templatePath, 'utf8');
    fs.writeFileSync(this.envPath, template);
    log.success('Template copied to .env.local');
  }

  async configureApiKeys() {
    log.info('You can skip any keys and add them later...\n');

    const keys = [
      {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        description: 'Supabase Project URL',
        example: 'https://your-project.supabase.co',
        required: true,
      },
      {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        description: 'Supabase Anonymous Key',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: true,
      },
      {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        description: 'Supabase Service Role Key',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        required: true,
      },
      {
        name: 'OPENAI_API_KEY',
        description: 'OpenAI API Key',
        example: 'sk-proj-...',
        required: true,
      },
      {
        name: 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY',
        description: 'Unsplash Access Key',
        example: 'your-unsplash-access-key',
        required: false,
      },
    ];

    for (const key of keys) {
      const value = await this.ask(
        `${key.description} (${key.name}): `
      );

      if (value.trim()) {
        this.config[key.name] = value.trim();
        if (key.name === 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY') {
          this.config['UNSPLASH_ACCESS_KEY'] = value.trim();
        }
      } else if (key.required) {
        log.warning(`${key.name} is required for full functionality`);
      }
    }
  }

  updateEnvFile(securityKeys) {
    let content = fs.readFileSync(this.envPath, 'utf8');

    // Update security keys
    Object.entries(securityKeys).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      content = content.replace(regex, `${key}=${value}`);
    });

    // Update API keys
    Object.entries(this.config).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      content = content.replace(regex, `${key}=${value}`);
    });

    fs.writeFileSync(this.envPath, content);
    log.success('Environment file updated with your keys');
  }

  async testConnections() {
    log.title('🧪 Testing API Connections');

    // Load environment
    require('dotenv').config({ path: this.envPath });

    const tests = [
      { name: 'Supabase', test: this.testSupabase },
      { name: 'OpenAI', test: this.testOpenAI },
      { name: 'Unsplash', test: this.testUnsplash },
    ];

    for (const { name, test } of tests) {
      try {
        log.info(`Testing ${name} connection...`);
        await test.call(this);
        log.success(`${name} connection successful`);
      } catch (error) {
        log.warning(`${name} connection failed: ${error.message}`);
      }
    }
  }

  async testSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials missing');
    }

    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async testOpenAI() {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error('OpenAI API key missing');
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async testUnsplash() {
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

    if (!key) {
      throw new Error('Unsplash access key missing');
    }

    const response = await fetch(`https://api.unsplash.com/photos/random?client_id=${key}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  validateEnvironment() {
    log.title('✅ Environment Validation');

    require('dotenv').config({ path: this.envPath });

    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'API_SECRET_KEY',
      'JWT_SECRET',
      'SESSION_SECRET',
    ];

    const optionalVars = [
      'OPENAI_API_KEY',
      'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
    ];

    let valid = true;

    // Check required variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        log.error(`Missing required variable: ${varName}`);
        valid = false;
      } else {
        log.success(`✓ ${varName}`);
      }
    }

    // Check optional variables
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        log.success(`✓ ${varName} (optional)`);
      } else {
        log.warning(`- ${varName} (optional)`);
      }
    }

    if (valid) {
      log.success('Environment validation passed');
    } else {
      log.error('Environment validation failed');
      process.exit(1);
    }
  }

  ask(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }
}

// Main execution
const setup = new EnvironmentSetup();
setup.run()
  .then(() => {
    rl.close();
  })
  .catch((error) => {
    log.error(`Setup failed: ${error.message}`);
    rl.close();
    process.exit(1);
  });