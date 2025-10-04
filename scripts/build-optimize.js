#!/usr/bin/env node

/**
 * Production Build Optimization Script
 * This script optimizes the build process and analyzes bundle size
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n🔄 ${description}...`, colors.cyan);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, colors.red);
    console.error(error.message);
    return false;
  }
}

function checkFileSize(filePath, maxSize) {
  if (!fs.existsSync(filePath)) {
    return true;
  }
  
  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  
  if (fileSizeInMB > maxSize) {
    log(`⚠️  Warning: ${filePath} is ${fileSizeInMB.toFixed(2)}MB (exceeds ${maxSize}MB)`, colors.yellow);
    return false;
  }
  
  log(`✅ ${filePath}: ${fileSizeInMB.toFixed(2)}MB`, colors.green);
  return true;
}

function analyzeBuildSizes() {
  log('\n📊 Analyzing build sizes...', colors.bright);
  
  const buildDir = '.next';
  if (!fs.existsSync(buildDir)) {
    log('❌ Build directory not found. Run build first.', colors.red);
    return false;
  }
  
  // Check critical file sizes
  const criticalFiles = [
    { path: '.next/static/chunks/pages/_app.js', maxSize: 0.5 },
    { path: '.next/static/chunks/main.js', maxSize: 0.2 },
    { path: '.next/static/chunks/webpack.js', maxSize: 0.05 },
  ];
  
  let allGood = true;
  criticalFiles.forEach(({ path: filePath, maxSize }) => {
    if (!checkFileSize(filePath, maxSize)) {
      allGood = false;
    }
  });
  
  return allGood;
}

function generateBuildReport() {
  log('\n📝 Generating build report...', colors.cyan);
  
  const buildStats = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
    buildSize: {},
    performance: {},
  };
  
  // Collect build size information
  try {
    const buildDir = '.next/static/chunks';
    if (fs.existsSync(buildDir)) {
      const files = fs.readdirSync(buildDir);
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(buildDir, file);
        const stats = fs.statSync(filePath);
        const sizeInKB = (stats.size / 1024).toFixed(2);
        buildStats.buildSize[file] = `${sizeInKB}KB`;
        totalSize += stats.size;
      });
      
      buildStats.buildSize.total = `${(totalSize / 1024 / 1024).toFixed(2)}MB`;
    }
  } catch (error) {
    log(`⚠️  Could not analyze build sizes: ${error.message}`, colors.yellow);
  }
  
  // Save report
  const reportPath = 'build-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(buildStats, null, 2));
  log(`📄 Build report saved to ${reportPath}`, colors.green);
  
  return buildStats;
}

function optimizeBuild() {
  log('\n🚀 Starting production build optimization...', colors.bright);
  
  // Step 1: Clean previous builds
  if (!runCommand('rm -rf .next', 'Cleaning previous build')) {
    // Fallback for Windows
    runCommand('rmdir /s /q .next 2>nul || echo "No previous build to clean"', 'Cleaning previous build');
  }
  
  // Step 2: Install dependencies (ensure latest)
  if (!runCommand('npm ci', 'Installing dependencies')) {
    return false;
  }
  
  // Step 3: Run pre-build checks
  log('\n🔍 Running pre-build checks...', colors.cyan);
  if (!runCommand('npm run typecheck', 'TypeScript type checking')) {
    return false;
  }
  
  if (!runCommand('npm run lint', 'ESLint checking')) {
    return false;
  }
  
  // Step 4: Build with optimizations
  const buildEnv = {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    ANALYZE: process.argv.includes('--analyze') ? 'true' : 'false',
  };
  
  log('\n🏗️  Building for production...', colors.cyan);
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      env: buildEnv,
    });
    log('✅ Production build completed', colors.green);
  } catch (error) {
    log('❌ Production build failed', colors.red);
    return false;
  }
  
  // Step 5: Analyze build
  if (!analyzeBuildSizes()) {
    log('⚠️  Build size analysis found issues', colors.yellow);
  }
  
  // Step 6: Generate report
  const buildStats = generateBuildReport();
  
  // Step 7: Run post-build tests
  if (process.argv.includes('--test')) {
    log('\n🧪 Running post-build tests...', colors.cyan);
    if (!runCommand('npm run test -- --run', 'Running tests')) {
      return false;
    }
  }
  
  log('\n🎉 Build optimization completed successfully!', colors.green);
  log(`📊 Total build size: ${buildStats.buildSize.total || 'Unknown'}`, colors.cyan);
  
  return true;
}

function showHelp() {
  log('🛠️  Production Build Optimization Script', colors.bright);
  log('');
  log('Usage: node scripts/build-optimize.js [options]');
  log('');
  log('Options:');
  log('  --analyze    Enable bundle analyzer');
  log('  --test       Run tests after build');
  log('  --help       Show this help message');
  log('');
  log('Examples:');
  log('  node scripts/build-optimize.js');
  log('  node scripts/build-optimize.js --analyze');
  log('  node scripts/build-optimize.js --test --analyze');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }
  
  log('🚀 Describe It - Build Optimization', colors.bright);
  log('=====================================');
  
  const startTime = Date.now();
  
  if (optimizeBuild()) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\n⏱️  Total optimization time: ${duration}s`, colors.cyan);
    process.exit(0);
  } else {
    log('\n💥 Build optimization failed!', colors.red);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main();
}

module.exports = {
  optimizeBuild,
  analyzeBuildSizes,
  generateBuildReport,
};