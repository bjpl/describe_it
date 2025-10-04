const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'src/components/Export/EnhancedExportManager.tsx',
  'src/components/GammaVocabularyExtractor.tsx'
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
    const updated = content.replace(
      /@\/components\/ui\/MotionWrappers/g,
      '@/components/ui/MotionComponents'
    );
    
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

console.log('🔧 Fixing MotionWrappers imports...');
filesToUpdate.forEach(updateFile);
console.log('✅ Completed MotionWrappers import fixes');