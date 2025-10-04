import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  // Clean up test fixtures if not in CI (keep them for debugging in CI)
  if (!process.env.CI) {
    const fixturesDir = path.join(__dirname, 'fixtures')
    if (fs.existsSync(fixturesDir)) {
      try {
        fs.rmSync(fixturesDir, { recursive: true, force: true })
        console.log('🗑️ Test fixtures cleaned up')
      } catch (error) {
        console.warn('⚠️ Could not clean up fixtures:', error instanceof Error ? error.message : String(error))
      }
    }
  }

  // Generate test report summary
  generateTestSummary()

  console.log('✅ E2E test cleanup completed')
}

function generateTestSummary() {
  const summaryPath = path.join(__dirname, '../../test-results/e2e-summary.json')
  const summary = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      ci: !!process.env.CI,
    },
    testRun: {
      completed: true,
      duration: Date.now() - (global as any).testStartTime || 0,
    }
  }

  try {
    const resultsDir = path.dirname(summaryPath)
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    console.log('📊 Test summary generated')
  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error instanceof Error ? error.message : String(error))
  }
}

export default globalTeardown