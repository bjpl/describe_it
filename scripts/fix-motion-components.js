const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'EnhancedQASystem.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace all motion.button with MotionButton
content = content.replace(/<motion\.button/g, '<MotionButton');
content = content.replace(/<\/motion\.button>/g, '</MotionButton>');

// Replace all motion.div with MotionDiv  
content = content.replace(/<motion\.div/g, '<MotionDiv');
content = content.replace(/<\/motion\.div>/g, '</MotionDiv>');

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed all motion component references in EnhancedQASystem.tsx');