#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing database...');

try {
  // Check if database exists
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log('📦 Database not found. Creating new database...');
  }
  
  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push database schema
  console.log('📊 Applying database schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  
  // Run seed data directly with tsx to avoid shell issues on Windows
  console.log('🌱 Seeding database...');
  try {
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  } catch (seedError) {
    // If seeding fails, it might be because data already exists
    console.log('⚠️  Seed data might already exist. Continuing...');
  }
  
  console.log('✅ Database initialization completed!');
  console.log('');
  console.log('Default admin credentials:');
  console.log('Email: admin@example.com');
  console.log('Password: Asdf123!');
  console.log('');
  
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}