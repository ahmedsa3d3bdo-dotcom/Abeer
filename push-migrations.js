// Custom push script without PowerShell dependency
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Pushing migrations to database...\n');
try {
  // Run drizzle-kit push directly in a cross-platform way
  execSync('npx drizzle-kit push', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });

  console.log('\n✅ Schema pushed successfully!');
} catch (error) {
  console.error('\n❌ Push failed, trying alternative approach...');
  console.error(error);

  // Alternative: Run the migration SQL file directly
  console.log('📝 Running migration file directly...\n');
  execSync('npm run db:migrate', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });
}
