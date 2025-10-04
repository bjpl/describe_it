#!/usr/bin/env node

/**
 * Simple test runner script for auth flow testing
 * This script runs the auth tests and provides detailed output
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Starting Authentication Flow Tests...\n');

// Check if we're in the right directory
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log('📁 Project root:', projectRoot);
console.log('🔍 Running tests with detailed logging...\n');

// Run the tests with verbose output
const testProcess = spawn('npm', ['run', 'test', 'tests/auth-flow.test.ts'], {
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  console.log('\n' + '='.repeat(60));
  if (code === 0) {
    console.log('✅ Auth flow tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check the console output for state divergence points');
    console.log('2. Run the app in development mode to see the AuthDebugPanel');
    console.log('3. Test the problematic sign-in after sign-out flow manually');
  } else {
    console.log('❌ Auth flow tests failed with exit code:', code);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure all dependencies are installed');
    console.log('2. Check that the test environment is properly configured');
    console.log('3. Verify that the mocked components are working correctly');
  }
  console.log('='.repeat(60));
});

testProcess.on('error', (err) => {
  console.error('❌ Failed to start test process:', err.message);
  console.log('\n🔧 Try running the tests manually with:');
  console.log('npm run test tests/auth-flow.test.ts');
  process.exit(1);
});