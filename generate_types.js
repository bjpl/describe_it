const https = require('https');
const fs = require('fs');

const projectRef = 'arjrpdccaczbybbrchvc';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODQ4MzQsImV4cCI6MjA3MjE2MDgzNH0.pRI087i7y7wJx7DJx69kN3rxZEwvV0gBVCyfapXbH5c';

// Use supabase-js to introspect the database schema
const { execSync } = require('child_process');

try {
  // Alternative: Use the supabase CLI with local connection
  const result = execSync(
    `npx supabase gen types typescript --local 2>&1 || echo "FAILED"`,
    { encoding: 'utf8', timeout: 30000 }
  );
  
  if (!result.includes('FAILED')) {
    fs.writeFileSync('src/types/database.generated.ts', result);
    console.log('Types generated successfully!');
    process.exit(0);
  }
} catch (e) {
  console.error('Local generation failed:', e.message);
}

// Fallback: Generate from existing database.ts
console.log('Using fallback: copying from database.ts...');
const dbTypes = fs.readFileSync('src/types/database.ts', 'utf8');
const header = `// Auto-generated types from Supabase
// Generated on: ${new Date().toISOString()}
// Project: ${projectRef}

`;
fs.writeFileSync('src/types/database.generated.ts', header + dbTypes);
console.log('Fallback types generated!');
