#!/usr/bin/env node
// Start script for Next.js standalone build with environment loading

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        process.env[key] = valueParts.join('=');
      }
    }
  });
  console.log('✓ Loaded environment variables from .env.local');
} else {
  console.warn('⚠ .env.local not found at', envPath);
}

// Verify critical variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'API_KEY_ENCRYPTION_SECRET',
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

console.log('✓ All required environment variables are set');
console.log('✓ Starting Next.js standalone server...\n');

// Start the server
const server = spawn('node', ['.next/standalone/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: process.env,
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.kill();
  process.exit(0);
});
