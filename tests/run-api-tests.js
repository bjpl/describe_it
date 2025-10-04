#!/usr/bin/env node

/**
 * Simple test runner for API tests
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🧪 Running API Tests...\n')

// Run the unit tests
const vitestArgs = [
  'run',
  'tests/api/unit-tests.test.ts', 
  '--reporter=verbose'
]

const vitest = spawn('npx', ['vitest', ...vitestArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
})

vitest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ API Tests completed successfully!')
    console.log('\nTest Summary:')
    console.log('- Request validation logic: ✅ Passed')
    console.log('- Response format validation: ✅ Passed')
    console.log('- Utility functions: ✅ Passed')
    console.log('- Error handling logic: ✅ Passed')
    console.log('- Header generation: ✅ Passed')
    console.log('- Environment handling: ✅ Passed')
    console.log('- Performance calculations: ✅ Passed')
    console.log('\n📋 API Documentation: docs/api-documentation.md')
  } else {
    console.log('\n❌ Some tests failed. Check the output above.')
    process.exit(code)
  }
})

vitest.on('error', (err) => {
  console.error('Error running tests:', err)
  process.exit(1)
})