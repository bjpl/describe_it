const fs = require('fs');
const path = require('path');

// Get all files with MotionWrappers imports
const filesToUpdate = [
  'src/components/Accessibility/AccessibilityProvider.tsx',
  'src/components/DescriptionNotebook.tsx', 
  'src/components/DescriptionTabs.tsx',
  'src/components/EnhancedComponentShowcase.tsx',
  'src/components/GammaVocabularyManager.tsx',
  'src/components/ImageSearch/ImageSearch.tsx',
  'src/components/ImageViewer/ImageViewer.tsx',
  'src/components/Optimized/OptimizedImage.tsx',
  'src/components/Performance/AdvancedCaching.tsx',
  'src/components/Performance/BundleAnalyzer.tsx',
  'src/components/Performance/PerformanceDashboard.tsx',
  'src/components/Performance/PerformanceMonitor.tsx',
  'src/components/Performance/PWAOptimizations.tsx',
  'src/components/ProgressTracking/EnhancedProgressDashboard.tsx',
  'src/components/Settings/EnhancedSettingsPanel.tsx',
  'src/components/ShowAnswer.tsx'
];

function updateFile(filePath) {
  const fullPath = path.resolve(filePath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace MotionWrappers with MotionComponents
    let updated = content.replace(
      /@\/components\/ui\/MotionWrappers/g,
      '@/components/ui/MotionComponents'
    );
    
    // Also handle any motion. references that might remain
    updated = updated.replace(/<motion\./g, '<Motion');
    updated = updated.replace(/<\/motion\./g, '</Motion');
    
    if (updated !== content) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`🔄 No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing all MotionWrappers imports...');
filesToUpdate.forEach(updateFile);
console.log('✅ Completed all MotionWrappers import fixes');