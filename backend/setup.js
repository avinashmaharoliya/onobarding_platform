/**
 * setup.js – First-time database initialisation for the Onboarding Portal
 *
 * Usage:  node setup.js
 *
 * What it does:
 *  1. Connects to PostgreSQL using .env credentials
 *  2. Creates the database if it doesn't exist yet
 *  3. Runs schema.sql (idempotent – safe to re-run)
 *  4. Prints a summary with default login credentials
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'onboarding_db';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

// ── helpers ──────────────────────────────────────────────────────────────────

function log(msg)    { console.log(`  ✔  ${msg}`); }
function warn(msg)   { console.warn(`  ⚠  ${msg}`); }
function err(msg, e) { console.error(`  ✖  ${msg}`); if (e) console.error(e.message); }
function hr()        { console.log('─'.repeat(55)); }

// ── step 1: ensure the database exists ───────────────────────────────────────

async function ensureDatabase() {
  // Connect to the default 'postgres' maintenance DB first
  const admin = new Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: 'postgres',
    port: DB_PORT,
  });

  try {
    await admin.connect();
    const res = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (res.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${DB_NAME}"`);
      log(`Database '${DB_NAME}' created.`);
    } else {
      log(`Database '${DB_NAME}' already exists – skipping create.`);
    }
  } finally {
    await admin.end();
  }
}

// ── step 2: run schema.sql ────────────────────────────────────────────────────

async function runSchema() {
  const client = new Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT,
  });

  try {
    await client.connect();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    log('Schema applied (tables + seed data).');
  } finally {
    await client.end();
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  hr();
  console.log('  🚀  Onboarding Portal – Database Setup');
  hr();

  // Basic validation
  if (!DB_USER || DB_USER === 'your_pg_user') {
    err('DB_USER is not set in .env. Please configure your PostgreSQL credentials.');
    process.exit(1);
  }

  try {
    console.log('\n  Step 1/2 – Checking / creating database…');
    await ensureDatabase();

    console.log('\n  Step 2/2 – Applying schema…');
    await runSchema();

    hr();
    console.log('\n  ✅  Setup complete!\n');
    console.log('  Default HR login:');
    console.log('    Email   :  hr@company.com');
    console.log('    Password:  HRAdmin@123');
    console.log('\n  Start the server with:  npm run dev\n');
    hr();
  } catch (e) {
    hr();
    err('Setup failed', e);
    console.error('\n  Troubleshooting tips:');
    console.error('  • Is PostgreSQL running?  (pg_ctl status  or  services.msc)');
    console.error(`  • Check .env credentials – host: ${DB_HOST}, user: ${DB_USER}, port: ${DB_PORT}`);
    console.error('  • Make sure the PostgreSQL user has CREATE DATABASE permission.\n');
    hr();
    process.exit(1);
  }
}

main();
