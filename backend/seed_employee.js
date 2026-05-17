const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

async function insert() {
  await client.connect();
  // Using a dummy hash here because the /setup endpoint will hash the new password anyway
  await client.query("INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4)", ['Riya Sharma', 'riya@company.com', 'employee', 'dummy_hash']);
  console.log("Employee Riya inserted.");
  await client.end();
}

insert().catch(console.error);
