#!/usr/bin/env node
/**
 * Generate Supabase Types Script
 *
 * This script generates TypeScript types from Supabase using the OpenAPI schema.
 * It uses the project's REST API to fetch the schema and generate types.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const execAsync = promisify(exec);

// Read environment variables
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

console.log(`\n🔄 Generating Supabase types for project: ${projectRef}\n`);

async function generateTypes() {
  try {
    // Method 1: Try with npx supabase (requires SUPABASE_ACCESS_TOKEN)
    const accessToken = getEnvVar('SUPABASE_ACCESS_TOKEN');

    if (accessToken) {
      console.log('✅ Found SUPABASE_ACCESS_TOKEN, using CLI method...');
      const { stdout, stderr } = await execAsync(
        `npx supabase gen types typescript --project-id ${projectRef}`,
        {
          env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );

      if (stderr && !stderr.includes('warn')) {
        console.error('⚠️ Warnings:', stderr);
      }

      const outputPath = join(__dirname, '..', 'src', 'types', 'supabase.ts');
      writeFileSync(outputPath, stdout);
      console.log(`✅ Types generated successfully: ${outputPath}`);
      return;
    }

    // Method 2: Provide instructions to get access token
    console.log('❌ SUPABASE_ACCESS_TOKEN not found in .env.local\n');
    console.log('📋 To generate types, please follow these steps:\n');
    console.log('1. Visit: https://supabase.com/dashboard/account/tokens');
    console.log('2. Generate a new access token');
    console.log('3. Add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...');
    console.log('4. Run this script again\n');
    console.log('Alternatively, run this command manually:');
    console.log(`   npx supabase login`);
    console.log(`   npx supabase gen types typescript --project-id ${projectRef} > src/types/supabase.ts\n`);

    process.exit(1);
  } catch (error) {
    console.error('❌ Error generating types:', error.message);

    if (error.message.includes('Access token')) {
      console.log('\n📋 You need a Supabase access token to generate types.');
      console.log('Get one here: https://supabase.com/dashboard/account/tokens\n');
    }

    process.exit(1);
  }
}

generateTypes();
