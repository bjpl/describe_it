#!/usr/bin/env node

/**
 * UX Test Runner - Automated testing of user experience flows
 * Tests the application end-to-end from a user perspective
 */

const axios = require('axios')
const { performance } = require('perf_hooks')

const BASE_URL = 'http://localhost:3006'
const API_BASE = `${BASE_URL}/api`

console.log('🧪 UX Testing Suite - Describe It Application\n')
console.log(`Testing against: ${BASE_URL}`)
console.log('=' * 60)

class UXTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    }
    this.startTime = performance.now()
  }

  async test(name, fn) {
    const testStart = performance.now()
    try {
      console.log(`\n🧪 Testing: ${name}`)
      const result = await fn()
      const duration = performance.now() - testStart
      
      if (result === true || result === undefined) {
        console.log(`   ✅ PASSED (${duration.toFixed(2)}ms)`)
        this.results.passed++
        this.results.tests.push({ name, status: 'passed', duration, issues: [] })
      } else if (typeof result === 'object' && result.warning) {
        console.log(`   ⚠️  WARNING: ${result.warning} (${duration.toFixed(2)}ms)`)
        this.results.warnings++
        this.results.tests.push({ name, status: 'warning', duration, issues: [result.warning] })
      } else {
        throw new Error(result || 'Test failed')
      }
    } catch (error) {
      const duration = performance.now() - testStart
      console.log(`   ❌ FAILED: ${error.message} (${duration.toFixed(2)}ms)`)
      this.results.failed++
      this.results.tests.push({ name, status: 'failed', duration, issues: [error.message] })
    }
  }

  async httpGet(endpoint, timeout = 10000) {
    return await axios.get(`${API_BASE}${endpoint}`, { timeout })
  }

  async httpPost(endpoint, data, timeout = 10000) {
    return await axios.post(`${API_BASE}${endpoint}`, data, { 
      timeout,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async waitForServer(retries = 30) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 2000 })
        if (response.status === 200) {
          return true
        }
      } catch (error) {
        if (i === retries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    return false
  }

  // ===== 1. LANDING PAGE TESTS =====
  async testLandingPageLoad() {
    const start = performance.now()
    const response = await axios.get(BASE_URL, { timeout: 5000 })
    const loadTime = performance.now() - start
    
    if (response.status !== 200) {
      throw new Error(`Landing page returned status ${response.status}`)
    }
    
    const html = response.data
    const hasTitle = html.includes('Describe It')
    const hasSearchBar = html.includes('Search for images')
    const hasHeader = html.includes('Spanish Learning through Images')
    
    if (!hasTitle) throw new Error('Missing title')
    if (!hasSearchBar) throw new Error('Missing search bar')
    if (!hasHeader) throw new Error('Missing header description')
    
    if (loadTime > 3000) {
      return { warning: `Page load time ${loadTime.toFixed(2)}ms exceeds 3s target` }
    }
    
    return true
  }

  async testHealthEndpoint() {
    const response = await this.httpGet('/health')
    
    if (response.status !== 200) {
      throw new Error(`Health endpoint returned ${response.status}`)
    }
    
    const data = response.data
    if (!data.status || !data.timestamp) {
      throw new Error('Health endpoint missing required fields')
    }
    
    return true
  }

  // ===== 2. IMAGE SEARCH TESTS =====
  async testImageSearchBasic() {
    const response = await this.httpGet('/images/search?query=nature')
    
    if (response.status !== 200) {
      throw new Error(`Search returned status ${response.status}`)
    }
    
    const data = response.data
    if (!data.images || !Array.isArray(data.images)) {
      throw new Error('Search response missing images array')
    }
    
    if (data.images.length === 0) {
      return { warning: 'No images returned for nature query' }
    }
    
    // Check image structure
    const firstImage = data.images[0]
    const requiredFields = ['id', 'urls', 'description', 'alt_description']
    
    for (const field of requiredFields) {
      if (!(field in firstImage)) {
        throw new Error(`Image missing field: ${field}`)
      }
    }
    
    return true
  }

  async testImageSearchVariousQueries() {
    const queries = ['food', 'technology', 'cats', 'mountains', 'architecture']
    const results = []
    
    for (const query of queries) {
      try {
        const response = await this.httpGet(`/images/search?query=${encodeURIComponent(query)}`)
        const hasImages = response.data.images && response.data.images.length > 0
        results.push({ query, success: true, imageCount: response.data.images.length })
      } catch (error) {
        results.push({ query, success: false, error: error.message })
      }
    }
    
    const failedQueries = results.filter(r => !r.success)
    if (failedQueries.length > 0) {
      throw new Error(`Failed queries: ${failedQueries.map(f => f.query).join(', ')}`)
    }
    
    const emptyResults = results.filter(r => r.success && r.imageCount === 0)
    if (emptyResults.length > queries.length / 2) {
      return { warning: `Too many empty results: ${emptyResults.map(e => e.query).join(', ')}` }
    }
    
    return true
  }

  async testImageSearchErrorHandling() {
    // Test empty query
    try {
      await this.httpGet('/images/search?query=')
      return { warning: 'Empty query should return 400' }
    } catch (error) {
      if (!error.response || error.response.status !== 400) {
        throw new Error('Empty query should return 400 status')
      }
    }
    
    // Test very long query
    const longQuery = 'a'.repeat(200)
    const response = await this.httpGet(`/images/search?query=${encodeURIComponent(longQuery)}`)
    
    if (response.status !== 200 && response.status !== 400) {
      throw new Error(`Long query returned unexpected status: ${response.status}`)
    }
    
    return true
  }

  // ===== 3. AI DESCRIPTION TESTS =====
  async testDescriptionGeneration() {
    // First get an image to test with
    const searchResponse = await this.httpGet('/images/search?query=coffee')
    const image = searchResponse.data.images[0]
    
    if (!image) throw new Error('No test image available')
    
    const descriptionData = {
      imageUrl: image.urls.regular,
      style: 'conversacional',
      language: 'en',
      maxLength: 300
    }
    
    const response = await this.httpPost('/descriptions/generate', descriptionData)
    
    if (response.status !== 200) {
      throw new Error(`Description generation returned ${response.status}`)
    }
    
    const data = response.data
    if (!data.success) {
      // Check if it's a demo fallback
      if (data.metadata && data.metadata.fallback) {
        return { warning: 'Using demo fallback for descriptions' }
      }
      throw new Error('Description generation failed')
    }
    
    if (!data.data || !data.data.text) {
      throw new Error('Description response missing text')
    }
    
    if (data.data.text.length < 10) {
      return { warning: 'Generated description very short' }
    }
    
    return true
  }

  async testBilingualDescriptions() {
    const searchResponse = await this.httpGet('/images/search?query=sunset')
    const image = searchResponse.data.images[0]
    
    if (!image) throw new Error('No test image available')
    
    // Test English
    const englishResponse = await this.httpPost('/descriptions/generate', {
      imageUrl: image.urls.regular,
      style: 'conversacional',
      language: 'en',
      maxLength: 200
    })
    
    // Test Spanish
    const spanishResponse = await this.httpPost('/descriptions/generate', {
      imageUrl: image.urls.regular,
      style: 'conversacional',
      language: 'es',
      maxLength: 200
    })
    
    if (englishResponse.status !== 200 || spanishResponse.status !== 200) {
      throw new Error('Bilingual description generation failed')
    }
    
    const englishText = englishResponse.data.data?.text || ''
    const spanishText = spanishResponse.data.data?.text || ''
    
    if (englishText === spanishText) {
      return { warning: 'English and Spanish descriptions are identical' }
    }
    
    return true
  }

  // ===== 4. PHRASE EXTRACTION TESTS =====
  async testPhraseExtraction() {
    const searchResponse = await this.httpGet('/images/search?query=market')
    const image = searchResponse.data.images[0]
    
    if (!image) throw new Error('No test image available')
    
    const phraseData = {
      imageUrl: image.urls.regular,
      targetLevel: 'intermediate',
      maxPhrases: 5
    }
    
    const response = await this.httpPost('/phrases/extract', phraseData)
    
    if (response.status !== 200) {
      throw new Error(`Phrase extraction returned ${response.status}`)
    }
    
    const phrases = response.data
    if (!Array.isArray(phrases)) {
      throw new Error('Phrase response not an array')
    }
    
    if (phrases.length === 0) {
      return { warning: 'No phrases extracted' }
    }
    
    // Check phrase structure
    const firstPhrase = phrases[0]
    const requiredFields = ['phrase', 'definition', 'partOfSpeech', 'context']
    
    for (const field of requiredFields) {
      if (!(field in firstPhrase)) {
        throw new Error(`Phrase missing field: ${field}`)
      }
    }
    
    return true
  }

  async testPhraseDifficultyLevels() {
    const searchResponse = await this.httpGet('/images/search?query=restaurant')
    const image = searchResponse.data.images[0]
    
    if (!image) throw new Error('No test image available')
    
    const levels = ['beginner', 'intermediate', 'advanced']
    const results = []
    
    for (const level of levels) {
      const response = await this.httpPost('/phrases/extract', {
        imageUrl: image.urls.regular,
        targetLevel: level,
        maxPhrases: 3
      })
      
      if (response.status !== 200) {
        throw new Error(`Failed to extract ${level} phrases`)
      }
      
      results.push({
        level,
        phrases: response.data,
        count: response.data.length
      })
    }
    
    // All levels should return some phrases
    const emptyLevels = results.filter(r => r.count === 0)
    if (emptyLevels.length > 0) {
      return { warning: `No phrases for levels: ${emptyLevels.map(e => e.level).join(', ')}` }
    }
    
    return true
  }

  // ===== 5. Q&A FUNCTIONALITY TESTS =====
  async testQAGeneration() {
    const searchResponse = await this.httpGet('/images/search?query=people')
    const image = searchResponse.data.images[0]
    
    if (!image) throw new Error('No test image available')
    
    const qaData = {
      imageUrl: image.urls.regular,
      question: 'What can you see in this image?'
    }
    
    const response = await this.httpPost('/qa/generate', qaData)
    
    if (response.status !== 200) {
      throw new Error(`Q&A generation returned ${response.status}`)
    }
    
    const data = response.data
    const requiredFields = ['id', 'question', 'answer', 'confidence']
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Q&A response missing field: ${field}`)
      }
    }
    
    if (data.answer.length < 10) {
      return { warning: 'Generated answer very short' }
    }
    
    if (data.confidence < 0.5) {
      return { warning: `Low confidence score: ${data.confidence}` }
    }
    
    return true
  }

  // ===== 6. PERFORMANCE TESTS =====
  async testResponseTimes() {
    const endpoints = [
      { path: '/health', maxTime: 500 },
      { path: '/images/search?query=test', maxTime: 3000 },
    ]
    
    const results = []
    
    for (const endpoint of endpoints) {
      const start = performance.now()
      await this.httpGet(endpoint.path)
      const duration = performance.now() - start
      
      results.push({
        path: endpoint.path,
        duration,
        maxTime: endpoint.maxTime,
        ok: duration <= endpoint.maxTime
      })
    }
    
    const slowEndpoints = results.filter(r => !r.ok)
    if (slowEndpoints.length > 0) {
      const warnings = slowEndpoints.map(e => 
        `${e.path}: ${e.duration.toFixed(2)}ms > ${e.maxTime}ms`
      )
      return { warning: `Slow endpoints: ${warnings.join(', ')}` }
    }
    
    return true
  }

  // ===== RUN ALL TESTS =====
  async runAllTests() {
    console.log('Waiting for server to be ready...')
    await this.waitForServer()
    console.log('✅ Server is ready\n')

    // 1. Landing Page Tests
    console.log('\n📄 LANDING PAGE TESTS')
    console.log('=' * 40)
    await this.test('Landing Page Load', () => this.testLandingPageLoad())
    await this.test('Health Endpoint', () => this.testHealthEndpoint())

    // 2. Image Search Tests
    console.log('\n🖼️  IMAGE SEARCH TESTS')
    console.log('=' * 40)
    await this.test('Basic Image Search', () => this.testImageSearchBasic())
    await this.test('Multiple Query Types', () => this.testImageSearchVariousQueries())
    await this.test('Search Error Handling', () => this.testImageSearchErrorHandling())

    // 3. AI Description Tests
    console.log('\n🤖 AI DESCRIPTION TESTS')
    console.log('=' * 40)
    await this.test('Description Generation', () => this.testDescriptionGeneration())
    await this.test('Bilingual Descriptions', () => this.testBilingualDescriptions())

    // 4. Phrase Extraction Tests
    console.log('\n📝 PHRASE EXTRACTION TESTS')
    console.log('=' * 40)
    await this.test('Phrase Extraction', () => this.testPhraseExtraction())
    await this.test('Difficulty Levels', () => this.testPhraseDifficultyLevels())

    // 5. Q&A Tests
    console.log('\n❓ Q&A FUNCTIONALITY TESTS')
    console.log('=' * 40)
    await this.test('Q&A Generation', () => this.testQAGeneration())

    // 6. Performance Tests
    console.log('\n⚡ PERFORMANCE TESTS')
    console.log('=' * 40)
    await this.test('Response Times', () => this.testResponseTimes())

    // Report Results
    this.generateReport()
  }

  generateReport() {
    const totalTime = performance.now() - this.startTime
    const totalTests = this.results.passed + this.results.failed + this.results.warnings

    console.log('\n' + '=' * 60)
    console.log('🧪 UX TEST RESULTS SUMMARY')
    console.log('=' * 60)
    console.log(`Total Tests: ${totalTests}`)
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`⚠️  Warnings: ${this.results.warnings}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`)
    console.log(`📊 Success Rate: ${((this.results.passed / totalTests) * 100).toFixed(1)}%`)

    if (this.results.warnings > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.results.tests
        .filter(t => t.status === 'warning')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.issues.join(', ')}`)
        })
    }

    if (this.results.failed > 0) {
      console.log('\n❌ FAILURES:')
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.issues.join(', ')}`)
        })
    }

    // UX Assessment
    console.log('\n🎯 UX ASSESSMENT:')
    const passRate = (this.results.passed / totalTests) * 100
    
    if (passRate >= 90) {
      console.log('   🏆 EXCELLENT - Application ready for users')
    } else if (passRate >= 75) {
      console.log('   👍 GOOD - Minor improvements recommended')
    } else if (passRate >= 60) {
      console.log('   ⚠️  FAIR - Several issues need attention')
    } else {
      console.log('   ❌ POOR - Major issues need fixing before launch')
    }

    console.log('\n📋 Next Steps:')
    if (this.results.failed > 0) {
      console.log('   1. Fix failed functionality tests')
    }
    if (this.results.warnings > 0) {
      console.log('   2. Address performance and UX warnings')
    }
    console.log('   3. Run manual browser testing')
    console.log('   4. Test responsive design on mobile devices')
    console.log('   5. Perform accessibility testing')

    console.log('\n📄 Detailed test plan: tests/ux-testing-plan.md')
  }
}

// Run the tests
async function main() {
  const tester = new UXTester()
  try {
    await tester.runAllTests()
  } catch (error) {
    console.error('\n💥 Test runner crashed:', error.message)
    process.exit(1)
  }
}

main()