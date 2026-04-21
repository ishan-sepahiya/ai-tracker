#!/usr/bin/env node
// Start script for Next.js standalone build with environment loading

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting AI Tracker server...\n');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`❌ ERROR: .env.local not found at ${envPath}`);
  console.error('\nPlease create .env.local with the following variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('  - API_KEY_ENCRYPTION_SECRET');
  console.error('  - (and other required keys)\n');
  process.exit(1);
}

console.log(`📄 Loading environment from: ${envPath}`);
const envContent = fs.readFileSync(envPath, 'utf-8');
let varsLoaded = 0;

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=');
      varsLoaded++;
    }
  }
});

console.log(`✓ Loaded ${varsLoaded} environment variables\n`);

// Verify critical variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'API_KEY_ENCRYPTION_SECRET',
];

console.log('🔍 Verifying required environment variables:');
const missing = requiredVars.filter(v => {
  const exists = !!process.env[v];
  const status = exists ? '✓' : '❌';
  console.log(`  ${status} ${v}`);
  return !exists;
});

if (missing.length > 0) {
  console.error(`\n❌ Missing required environment variables:`);
  missing.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease add these to .env.local and restart.\n');
  process.exit(1);
}

console.log('\n✓ All required environment variables are set');
console.log('🚀 Starting Next.js standalone server...\n');

// Start the server
let serverStarted = false;
let startupErrors = '';

const server = spawn('node', ['.next/standalone/server.js'], {
  cwd: __dirname,
  env: process.env,
});

// Capture output to detect startup errors
server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  if (!serverStarted && (output.includes('Ready in') || output.includes('started'))) {
    serverStarted = true;
    console.log('\n✓✓✓ Server started successfully ✓✓✓\n');
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  startupErrors += output;
});

server.on('error', (err) => {
  console.error('\n❌ Failed to start server:', err.message);
  if (startupErrors) {
    console.error('\nStartup errors:');
    console.error(startupErrors);
  }
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Server exited with code ${code}`);
    if (startupErrors) {
      console.error('\nCaptured errors:');
      console.error(startupErrors);
    }
    process.exit(code);
  }
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  server.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.kill();
  process.exit(0);
});
