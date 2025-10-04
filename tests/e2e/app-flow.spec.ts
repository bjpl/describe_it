import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Spanish Learning App - Complete User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('Describe It')
  })

  test('should complete the full learning workflow', async ({ page }) => {
    // Step 1: Upload an image
    const fileInput = page.locator('input[type="file"]')
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg')
    
    // Create a test image file if it doesn't exist (for CI/CD)
    await page.evaluate(() => {
      // Create a simple canvas-based test image
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 300
      const ctx = canvas.getContext('2d')!
      
      // Draw a simple house
      ctx.fillStyle = '#87CEEB' // Sky blue
      ctx.fillRect(0, 0, 400, 150)
      
      ctx.fillStyle = '#90EE90' // Light green
      ctx.fillRect(0, 150, 400, 150)
      
      ctx.fillStyle = '#8B4513' // Brown house
      ctx.fillRect(150, 100, 100, 100)
      
      ctx.fillStyle = '#DC143C' // Red roof
      ctx.beginPath()
      ctx.moveTo(140, 100)
      ctx.lineTo(200, 50)
      ctx.lineTo(260, 100)
      ctx.closePath()
      ctx.fill()
    })

    await fileInput.setInputFiles([testImagePath])
    
    // Verify image preview appears
    await expect(page.locator('img[alt*="preview"]')).toBeVisible()
    
    // Step 2: Select description style
    await page.locator('select[data-testid="style-selector"]').selectOption('narrativo')
    
    // Step 3: Generate description
    await page.locator('button:has-text("Generar Descripción")').click()
    
    // Wait for description to be generated
    await expect(page.locator('[data-testid="generated-description"]')).toBeVisible({ timeout: 10000 })
    
    const description = await page.locator('[data-testid="generated-description"]').textContent()
    expect(description).toBeTruthy()
    expect(description!.length).toBeGreaterThan(10)
    
    // Step 4: Generate Q&A pairs
    await page.locator('button:has-text("Generar Preguntas")').click()
    
    // Wait for Q&A to be generated
    await expect(page.locator('[data-testid="qa-container"]')).toBeVisible({ timeout: 10000 })
    
    // Verify questions are displayed
    const questions = await page.locator('[data-testid="question"]').all()
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(5)
    
    // Step 5: Interact with Q&A (show/hide answers)
    const firstShowAnswerButton = page.locator('button:has-text("Mostrar Respuesta")').first()
    await firstShowAnswerButton.click()
    
    // Verify answer is shown
    await expect(page.locator('[data-testid="answer"]').first()).toBeVisible()
    
    // Step 6: Extract vocabulary/phrases
    await page.locator('button:has-text("Extraer Vocabulario")').click()
    
    // Wait for vocabulary to be extracted
    await expect(page.locator('[data-testid="vocabulary-panel"]')).toBeVisible({ timeout: 10000 })
    
    // Verify different categories of vocabulary
    await expect(page.locator('[data-testid="sustantivos"]')).toBeVisible()
    await expect(page.locator('[data-testid="verbos"]')).toBeVisible()
    await expect(page.locator('[data-testid="adjetivos"]')).toBeVisible()
    
    // Step 7: Test export functionality
    await page.locator('button:has-text("Exportar")').click()
    
    // Verify export modal opens
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    
    // Select export format
    await page.locator('input[value="pdf"]').check()
    await page.locator('button:has-text("Generar Archivo")').click()
    
    // Verify download is initiated (check for download event)
    const downloadPromise = page.waitForEvent('download')
    await downloadPromise
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test with invalid image file
    const fileInput = page.locator('input[type="file"]')
    const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt')
    
    await fileInput.setInputFiles([invalidFilePath])
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('formato de archivo')
  })

  test('should support language switching', async ({ page }) => {
    // Switch to English
    await page.locator('[data-testid="language-toggle"]').click()
    
    // Verify UI language changed
    await expect(page.locator('button:has-text("Generate Description")')).toBeVisible()
    
    // Switch back to Spanish
    await page.locator('[data-testid="language-toggle"]').click()
    
    // Verify UI is back in Spanish
    await expect(page.locator('button:has-text("Generar Descripción")')).toBeVisible()
  })

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Test tab navigation through main elements
    await page.keyboard.press('Tab') // Focus on upload button
    await expect(page.locator('button:has-text("Seleccionar Imagen")')).toBeFocused()
    
    await page.keyboard.press('Tab') // Focus on style selector
    await expect(page.locator('select[data-testid="style-selector"]')).toBeFocused()
    
    await page.keyboard.press('Tab') // Focus on generate button
    await expect(page.locator('button:has-text("Generar Descripción")')).toBeFocused()
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    
    // Should show validation message since no image is uploaded
    await expect(page.locator('[data-testid="validation-message"]')).toBeVisible()
  })

  test('should persist user preferences', async ({ page }) => {
    // Change settings
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('select[data-testid="default-style"]').selectOption('poetico')
    await page.locator('button:has-text("Guardar")').click()
    
    // Reload page
    await page.reload()
    await expect(page.locator('h1')).toContainText('Describe It')
    
    // Verify settings were preserved
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('select[data-testid="default-style"]')).toHaveValue('poetico')
  })

  test('should handle mobile responsive design', async ({ page }) => {
    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    
    // Test mobile interactions
    await page.locator('[data-testid="mobile-menu-toggle"]').click()
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })

  test('should handle offline mode gracefully', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)
    
    // Try to upload and generate description
    const fileInput = page.locator('input[type="file"]')
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg')
    await fileInput.setInputFiles([testImagePath])
    
    await page.locator('button:has-text("Generar Descripción")').click()
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('conexión')
  })
})

test.describe('Performance Tests', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Describe It')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
  })

  test('should handle large image files efficiently', async ({ page }) => {
    await page.goto('/')
    
    // Upload a large image (mock large file)
    const fileInput = page.locator('input[type="file"]')
    const largeImagePath = path.join(__dirname, '../fixtures/large-image.jpg')
    
    const startTime = Date.now()
    await fileInput.setInputFiles([largeImagePath])
    
    // Should process within reasonable time
    await expect(page.locator('img[alt*="preview"]')).toBeVisible({ timeout: 10000 })
    
    const processTime = Date.now() - startTime
    expect(processTime).toBeLessThan(5000) // Should process within 5 seconds
  })

  test('should maintain responsiveness during heavy operations', async ({ page }) => {
    await page.goto('/')
    
    // Upload image and start multiple operations
    const fileInput = page.locator('input[type="file"]')
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg')
    await fileInput.setInputFiles([testImagePath])
    
    // Start description generation
    await page.locator('button:has-text("Generar Descripción")').click()
    
    // UI should remain responsive - test interaction
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()
    
    // Close settings
    await page.locator('button:has-text("Cerrar")').click()
  })
})

test.describe('Security Tests', () => {
  test('should sanitize user input', async ({ page }) => {
    await page.goto('/')
    
    // Try to inject malicious script in text inputs
    await page.locator('input[data-testid="custom-prompt"]').fill('<script>alert("xss")</script>')
    
    // Verify script is not executed
    const alertPromise = page.waitForEvent('dialog')
    const hasAlert = await Promise.race([
      alertPromise.then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ])
    
    expect(hasAlert).toBeFalsy()
  })

  test('should validate file uploads', async ({ page }) => {
    await page.goto('/')
    
    // Try to upload executable file
    const fileInput = page.locator('input[type="file"]')
    const maliciousFilePath = path.join(__dirname, '../fixtures/malicious.exe')
    
    await fileInput.setInputFiles([maliciousFilePath])
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('archivo no permitido')
  })
})