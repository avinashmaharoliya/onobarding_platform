const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
});

async function update() {
  await client.connect();
  const hash = await bcrypt.hash('Admin@123', 10);
  await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'hr@company.com']);
  console.log('Password updated.');
  await client.end();
}

update();
