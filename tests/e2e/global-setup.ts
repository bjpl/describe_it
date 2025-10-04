import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')

  // Create test fixtures directory if it doesn't exist
  const fixturesDir = path.join(__dirname, 'fixtures')
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true })
  }

  // Create test image files
  await createTestImages(fixturesDir)

  // Warm up the development server
  if (!process.env.CI) {
    await warmUpServer()
  }

  console.log('✅ E2E test environment ready')
}

async function createTestImages(fixturesDir: string) {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Create a test image using canvas
  await page.setContent(`
    <canvas id="canvas" width="400" height="300"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      // Draw a simple house scene
      // Sky
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 400, 150);
      
      // Ground
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, 150, 400, 150);
      
      // House
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(150, 100, 100, 100);
      
      // Roof
      ctx.fillStyle = '#DC143C';
      ctx.beginPath();
      ctx.moveTo(140, 100);
      ctx.lineTo(200, 50);
      ctx.lineTo(260, 100);
      ctx.closePath();
      ctx.fill();
      
      // Door
      ctx.fillStyle = '#654321';
      ctx.fillRect(190, 150, 20, 50);
      
      // Window
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(160, 120, 15, 15);
      
      // Sun
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(350, 50, 20, 0, 2 * Math.PI);
      ctx.fill();
    </script>
  `)

  // Convert canvas to blob and save as file
  const imageBuffer = await page.locator('#canvas').screenshot({ type: 'jpeg', quality: 80 })
  fs.writeFileSync(path.join(fixturesDir, 'test-image.jpg'), imageBuffer)

  // Create a large test image (simulate large file)
  await page.setContent(`
    <canvas id="largeCanvas" width="1920" height="1080"></canvas>
    <script>
      const canvas = document.getElementById('largeCanvas');
      const ctx = canvas.getContext('2d');
      
      // Create a complex pattern for large file size
      for (let x = 0; x < 1920; x += 10) {
        for (let y = 0; y < 1080; y += 10) {
          ctx.fillStyle = \`hsl(\${(x + y) % 360}, 50%, 50%)\`;
          ctx.fillRect(x, y, 10, 10);
        }
      }
    </script>
  `)

  const largeImageBuffer = await page.locator('#largeCanvas').screenshot({ type: 'jpeg', quality: 90 })
  fs.writeFileSync(path.join(fixturesDir, 'large-image.jpg'), largeImageBuffer)

  await browser.close()

  // Create invalid test files
  fs.writeFileSync(path.join(fixturesDir, 'invalid-file.txt'), 'This is not an image file')
  fs.writeFileSync(path.join(fixturesDir, 'malicious.exe'), 'Fake executable content')

  console.log('📁 Test fixture files created')
}

async function warmUpServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health')
    if (response.ok) {
      console.log('🌡️ Development server is warm and ready')
    }
  } catch (error) {
    console.warn('⚠️ Could not warm up server:', error instanceof Error ? error.message : String(error))
  }
}

export default globalSetup