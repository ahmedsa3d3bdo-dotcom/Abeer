// Custom migration generator without PowerShell dependency
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Generating migrations without PowerShell...\n');

try {
  // Run drizzle-kit generate directly in a cross-platform way
  execSync('npx drizzle-kit generate', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });

  console.log('\n✅ Migrations generated successfully!');
} catch (error) {
  console.error('\n❌ Error running drizzle-kit generate:', error.message);
  process.exit(1);
}
