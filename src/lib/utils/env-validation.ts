// Environment validation utility for better developer experience

interface EnvStatus {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  recommendations: string[];
}

export interface EnvConfig {
  // Required for basic functionality
  required: string[];
  // Optional but recommended
  optional: string[];
  // Development vs production specific
  development?: string[];
  production?: string[];
}

const defaultConfig: EnvConfig = {
  required: [],
  optional: [
    'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ],
  development: [
    'NODE_ENV'
  ],
  production: [
    'VERCEL_URL',
    'KV_URL'
  ]
};

export function validateEnvironment(config: EnvConfig = defaultConfig): EnvStatus {
  const missing: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check required variables
  config.required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Check optional variables
  config.optional.forEach(key => {
    if (!process.env[key]) {
      warnings.push(`Optional: ${key} - App will use demo mode`);
    }
  });

  // Environment-specific checks
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isProduction && config.production) {
    config.production.forEach(key => {
      if (!process.env[key]) {
        warnings.push(`Production: ${key} - May affect performance`);
      }
    });
  }

  if (isDevelopment && config.development) {
    config.development.forEach(key => {
      if (!process.env[key]) {
        warnings.push(`Development: ${key} - Should be set for optimal development`);
      }
    });
  }

  // Add recommendations
  if (!process.env.OPENAI_API_KEY) {
    recommendations.push('Add OPENAI_API_KEY for AI-powered descriptions');
  }
  
  if (!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
    recommendations.push('Add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY for real image search');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    recommendations.push('Add Supabase credentials for user sessions and data persistence');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    recommendations
  };
}

export function getSetupInstructions(): string {
  return `
# Environment Setup Guide

## Required Setup Steps:

1. Copy environment template:
   \`cp .env.example .env.local\`

2. Get API Keys:
   - OpenAI: https://platform.openai.com/api-keys
   - Unsplash: https://unsplash.com/developers
   - Supabase: https://supabase.com/dashboard

3. Update .env.local with your keys:
   \`\`\`
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   \`\`\`

4. Restart development server:
   \`npm run dev\`

## Demo Mode:
The app works without API keys using demo data.
Add keys to enable full functionality.
  `.trim();
}

export function logEnvironmentStatus(): void {
  const status = validateEnvironment();
  
  console.group('🔧 Environment Status');
  
  if (status.isValid) {
    console.log('✅ All required environment variables are set');
  } else {
    console.warn('❌ Missing required environment variables:', status.missing);
  }

  if (status.warnings.length > 0) {
    console.group('⚠️  Warnings:');
    status.warnings.forEach(warning => console.warn(`  • ${warning}`));
    console.groupEnd();
  }

  if (status.recommendations.length > 0) {
    console.group('💡 Recommendations:');
    status.recommendations.forEach(rec => console.info(`  • ${rec}`));
    console.groupEnd();
  }

  if (!status.isValid || status.warnings.length > 0) {
    console.info('\n📖 Run setup guide:');
    console.info(getSetupInstructions());
  }

  console.groupEnd();
}