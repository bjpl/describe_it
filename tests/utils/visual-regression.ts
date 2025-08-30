import { Page, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

/**
 * Visual Regression Testing Utilities
 * 
 * Provides utilities for capturing and comparing screenshots
 * to detect visual changes in the application.
 */

interface VisualTestOptions {
  threshold?: number;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  mask?: string[];
  animations?: 'disabled' | 'allow';
}

interface ComparisonResult {
  passed: boolean;
  difference: number;
  diffImagePath?: string;
  baselineExists: boolean;
}

export class VisualRegressionTester {
  private baselineDir: string;
  private actualDir: string;
  private diffDir: string;
  
  constructor(testName: string) {
    const basePath = join(process.cwd(), 'tests', 'visual-regression');
    this.baselineDir = join(basePath, 'baselines', testName);
    this.actualDir = join(basePath, 'actual', testName);
    this.diffDir = join(basePath, 'diff', testName);
  }
  
  /**
   * Captures a screenshot and compares it with the baseline
   */
  async compareScreenshot(
    page: Page,
    screenshotName: string,
    options: VisualTestOptions = {}
  ): Promise<ComparisonResult> {
    const {
      threshold = 0.2,
      fullPage = false,
      clip,
      mask = [],
      animations = 'disabled'
    } = options;
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Prepare page for screenshot
    if (animations === 'disabled') {
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
    }
    
    // Hide masked elements
    for (const selector of mask) {
      await page.locator(selector).evaluate(el => {
        (el as HTMLElement).style.visibility = 'hidden';
      });
    }
    
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);
    
    const actualPath = join(this.actualDir, `${screenshotName}.png`);
    const baselinePath = join(this.baselineDir, `${screenshotName}.png`);
    const diffPath = join(this.diffDir, `${screenshotName}.png`);
    
    // Take screenshot
    await page.screenshot({
      path: actualPath,
      fullPage,
      clip,
    });
    
    try {
      const baselineExists = await this.fileExists(baselinePath);
      
      if (!baselineExists) {
        // First run - create baseline
        await this.copyFile(actualPath, baselinePath);
        return {
          passed: true,
          difference: 0,
          baselineExists: false,
        };
      }
      
      // Compare with baseline using Playwright's built-in comparison
      try {
        await expect.soft(actualPath).toHaveScreenshot(baselinePath, {
          threshold,
          animations: 'disabled',
        });
        
        return {
          passed: true,
          difference: 0,
          baselineExists: true,
        };
      } catch (error) {
        // Generate diff image
        await this.generateDiffImage(baselinePath, actualPath, diffPath);
        
        const difference = await this.calculateDifference(baselinePath, actualPath);
        
        return {
          passed: false,
          difference,
          diffImagePath: diffPath,
          baselineExists: true,
        };
      }
    } catch (error) {
      throw new Error(`Visual comparison failed: ${error}`);
    }
  }
  
  /**
   * Updates the baseline with the current actual screenshot
   */
  async updateBaseline(screenshotName: string): Promise<void> {
    const actualPath = join(this.actualDir, `${screenshotName}.png`);
    const baselinePath = join(this.baselineDir, `${screenshotName}.png`);
    
    if (await this.fileExists(actualPath)) {
      await this.copyFile(actualPath, baselinePath);
    } else {
      throw new Error(`Actual screenshot not found: ${actualPath}`);
    }
  }
  
  /**
   * Captures a full page screenshot with responsive breakpoints
   */
  async captureResponsiveScreenshots(
    page: Page,
    screenshotName: string,
    breakpoints: { name: string; width: number; height: number }[]
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });
      
      // Wait for responsive changes
      await page.waitForTimeout(200);
      
      const result = await this.compareScreenshot(
        page,
        `${screenshotName}-${breakpoint.name}`,
        { fullPage: true }
      );
      
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Captures screenshots of component states
   */
  async captureComponentStates(
    page: Page,
    componentSelector: string,
    states: Array<{ name: string; setup: () => Promise<void> }>
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];
    
    for (const state of states) {
      await state.setup();
      await page.waitForTimeout(100);
      
      const element = page.locator(componentSelector);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        const result = await this.compareScreenshot(
          page,
          `component-${state.name}`,
          {
            clip: {
              x: boundingBox.x,
              y: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height,
            },
          }
        );
        
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Captures before/after screenshots for animations
   */
  async captureAnimationStates(
    page: Page,
    screenshotName: string,
    trigger: () => Promise<void>
  ): Promise<{ before: ComparisonResult; after: ComparisonResult }> {
    // Capture before state
    const before = await this.compareScreenshot(
      page,
      `${screenshotName}-before`,
      { animations: 'disabled' }
    );
    
    // Enable animations and trigger
    await page.addStyleTag({
      content: `
        * {
          animation-duration: 0.3s !important;
          transition-duration: 0.3s !important;
        }
      `
    });
    
    await trigger();
    
    // Wait for animation to complete
    await page.waitForTimeout(500);
    
    // Capture after state
    const after = await this.compareScreenshot(
      page,
      `${screenshotName}-after`,
      { animations: 'disabled' }
    );
    
    return { before, after };
  }
  
  /**
   * Generates a comprehensive visual report
   */
  async generateReport(results: Array<{ name: string; result: ComparisonResult }>): Promise<string> {
    const reportPath = join(this.diffDir, 'visual-report.html');
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Visual Regression Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .result { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .new { border-left: 4px solid #ffc107; }
        .images { display: flex; gap: 20px; margin: 10px 0; }
        .image-container { text-align: center; }
        .image-container img { max-width: 300px; border: 1px solid #ddd; }
        .stats { background: #f8f9fa; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Visual Regression Test Report</h1>
      <div class="stats">
        <h3>Summary</h3>
        <p>Total Tests: ${results.length}</p>
        <p>Passed: ${results.filter(r => r.result.passed).length}</p>
        <p>Failed: ${results.filter(r => !r.result.passed && r.result.baselineExists).length}</p>
        <p>New: ${results.filter(r => !r.result.baselineExists).length}</p>
        <p>Generated: ${new Date().toISOString()}</p>
      </div>
      
      ${results.map(({ name, result }) => `
        <div class="result ${result.passed ? 'passed' : result.baselineExists ? 'failed' : 'new'}">
          <h3>${name}</h3>
          <p>Status: ${result.passed ? 'PASSED' : result.baselineExists ? 'FAILED' : 'NEW BASELINE'}</p>
          ${result.difference ? `<p>Difference: ${(result.difference * 100).toFixed(2)}%</p>` : ''}
          
          ${result.diffImagePath ? `
            <div class="images">
              <div class="image-container">
                <h4>Baseline</h4>
                <img src="../baselines/${name}.png" alt="Baseline" />
              </div>
              <div class="image-container">
                <h4>Actual</h4>
                <img src="../actual/${name}.png" alt="Actual" />
              </div>
              <div class="image-container">
                <h4>Difference</h4>
                <img src="${name}.png" alt="Difference" />
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
    `;
    
    await writeFile(reportPath, html, 'utf8');
    return reportPath;
  }
  
  private async ensureDirectories(): Promise<void> {
    await mkdir(this.baselineDir, { recursive: true });
    await mkdir(this.actualDir, { recursive: true });
    await mkdir(this.diffDir, { recursive: true });
  }
  
  private async fileExists(path: string): Promise<boolean> {
    try {
      await readFile(path);
      return true;
    } catch {
      return false;
    }
  }
  
  private async copyFile(source: string, destination: string): Promise<void> {
    const data = await readFile(source);
    await writeFile(destination, data);
  }
  
  private async generateDiffImage(baselinePath: string, actualPath: string, diffPath: string): Promise<void> {
    // This would use an image comparison library like pixelmatch
    // For now, we'll just copy the actual image as a placeholder
    await this.copyFile(actualPath, diffPath);
  }
  
  private async calculateDifference(baselinePath: string, actualPath: string): Promise<number> {
    // This would calculate the actual pixel difference
    // For now, return a mock value
    const baselineData = await readFile(baselinePath);
    const actualData = await readFile(actualPath);
    
    const baselineHash = createHash('md5').update(baselineData).digest('hex');
    const actualHash = createHash('md5').update(actualData).digest('hex');
    
    return baselineHash === actualHash ? 0 : 0.1; // 10% difference if different
  }
}

// Utility functions for common visual testing scenarios
export const visualTestHelpers = {
  /**
   * Standard responsive breakpoints
   */
  responsiveBreakpoints: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1200, height: 800 },
    { name: 'wide', width: 1920, height: 1080 },
  ],
  
  /**
   * Common element selectors to mask in screenshots
   */
  maskSelectors: {
    dates: '[data-testid*="date"], .date, time',
    random: '[data-testid*="random"], .random-id',
    dynamic: '[data-testid*="dynamic"], .dynamic-content',
    loading: '[data-testid="loading"], .loading, .spinner',
  },
  
  /**
   * Waits for images to load before taking screenshot
   */
  waitForImages: async (page: Page): Promise<void> => {
    await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
          });
        })
      );
    });
  },
  
  /**
   * Stabilizes page for consistent screenshots
   */
  stabilizePage: async (page: Page, timeout: number = 1000): Promise<void> => {
    // Wait for network to settle
    await page.waitForLoadState('networkidle');
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    
    // Wait for images
    await visualTestHelpers.waitForImages(page);
    
    // Additional timeout for any remaining async operations
    await page.waitForTimeout(timeout);
  },
  
  /**
   * Sets up page for consistent visual testing
   */
  setupPageForVisualTesting: async (page: Page): Promise<void> => {
    // Disable animations globally
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    // Set fixed date for consistent testing
    await page.addInitScript(() => {
      const mockDate = new Date('2023-01-01T12:00:00Z');
      Date.now = () => mockDate.getTime();
    });
    
    // Stabilize the page
    await visualTestHelpers.stabilizePage(page);
  },
};

export default VisualRegressionTester;
