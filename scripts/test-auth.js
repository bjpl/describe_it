/**
 * Test Authentication Script
 * Use this to test signin/signup without email verification
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000'; // Change to production URL if needed

async function testSignIn(email, password) {
  console.log(`\n🔐 Testing sign in for: ${email}`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sign in successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email confirmed:', data.user?.emailConfirmed);
      console.log('   Mock mode:', data.isMock ? 'Yes (rate limited)' : 'No');
      if (data.session) {
        console.log('   Session token:', data.session.access_token?.substring(0, 20) + '...');
      }
    } else {
      console.log('❌ Sign in failed:', data.error || data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testSignUp(email, password, fullName) {
  console.log(`\n📝 Testing sign up for: ${email}`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password,
        metadata: { full_name: fullName }
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sign up successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Message:', data.message);
      console.log('   Mock mode:', data.isMock ? 'Yes' : 'No');
      
      if (data.session) {
        console.log('   ✨ Auto-signed in with session!');
      } else {
        console.log('   📧 Check email for verification (or try signing in directly)');
      }
    } else {
      console.log('❌ Sign up failed:', data.error || data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];
const email = args[1];
const password = args[2];
const fullName = args[3];

if (!command) {
  console.log(`
Authentication Test Script
=========================

Usage:
  node scripts/test-auth.js signin <email> <password>
  node scripts/test-auth.js signup <email> <password> <fullName>

Examples:
  node scripts/test-auth.js signin user@example.com password123
  node scripts/test-auth.js signup newuser@example.com password123 "John Doe"

This script tests the authentication endpoints directly, bypassing email verification.
`);
  process.exit(0);
}

if (command === 'signin' && email && password) {
  testSignIn(email, password);
} else if (command === 'signup' && email && password) {
  testSignUp(email, password, fullName || 'Test User');
} else {
  console.error('Invalid command or missing parameters');
  console.log('Run without arguments to see usage');
}