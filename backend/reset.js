/**
 * reset.js – Drop and fully recreate the Onboarding Portal database
 *
 * Usage:  node reset.js          (asks for confirmation)
 *         node reset.js --force  (skips confirmation prompt)
 *
 * ⚠  THIS WILL PERMANENTLY DELETE ALL DATA. Use with care.
 */

const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'onboarding_db';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

function log(msg)  { console.log(`  ✔  ${msg}`); }
function err(msg, e) { console.error(`  ✖  ${msg}`); if (e) console.error(`     ${e.message}`); }
function hr()      { console.log('─'.repeat(55)); }

// ── prompt ────────────────────────────────────────────────────────────────────

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── drop database ─────────────────────────────────────────────────────────────

async function dropDatabase() {
  const admin = new Client({
    host: DB_HOST, user: DB_USER, password: DB_PASS,
    database: 'postgres', port: DB_PORT,
  });

  try {
    await admin.connect();

    // Terminate any active connections to the target DB first
    await admin.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [DB_NAME]);

    const exists = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]
    );

    if (exists.rowCount > 0) {
      await admin.query(`DROP DATABASE "${DB_NAME}"`);
      log(`Database '${DB_NAME}' dropped.`);
    } else {
      log(`Database '${DB_NAME}' did not exist – nothing to drop.`);
    }
  } finally {
    await admin.end();
  }
}

// ── create database + schema ──────────────────────────────────────────────────

async function createDatabase() {
  const admin = new Client({
    host: DB_HOST, user: DB_USER, password: DB_PASS,
    database: 'postgres', port: DB_PORT,
  });
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${DB_NAME}"`);
    log(`Database '${DB_NAME}' created.`);
  } finally {
    await admin.end();
  }
}

async function runSchema() {
  const client = new Client({
    host: DB_HOST, user: DB_USER, password: DB_PASS,
    database: DB_NAME, port: DB_PORT,
  });
  try {
    await client.connect();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    log('Schema applied (tables + seed data).');
  } finally {
    await client.end();
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes('--force');

  hr();
  console.log('  ⚠️   Onboarding Portal – Database Reset');
  hr();
  console.log(`\n  Target database : ${DB_NAME}`);
  console.log(`  Host            : ${DB_HOST}:${DB_PORT}`);
  console.log(`  User            : ${DB_USER}\n`);

  if (!force) {
    const answer = await confirm(
      `  This will DELETE ALL DATA in '${DB_NAME}'.\n  Type "yes" to continue: `
    );
    if (answer !== 'yes') {
      console.log('\n  Aborted – no changes were made.\n');
      process.exit(0);
    }
  }

  console.log('');

  try {
    console.log('  Step 1/3 – Dropping existing database…');
    await dropDatabase();

    console.log('\n  Step 2/3 – Creating fresh database…');
    await createDatabase();

    console.log('\n  Step 3/3 – Applying schema…');
    await runSchema();

    hr();
    console.log('\n  ✅  Reset complete! Fresh database is ready.\n');
    console.log('  Default HR login:');
    console.log('    Email   :  hr@company.com');
    console.log('    Password:  HRAdmin@123');
    console.log('\n  Start the server with:  npm run dev\n');
    hr();
  } catch (e) {
    hr();
    err('Reset failed', e);
    console.error('\n  Troubleshooting tips:');
    console.error('  • Is PostgreSQL running?');
    console.error(`  • Check .env – host: ${DB_HOST}, user: ${DB_USER}, port: ${DB_PORT}`);
    console.error('  • Make sure the user has CREATEDB + pg_terminate_backend permissions.\n');
    hr();
    process.exit(1);
  }
}

main();
