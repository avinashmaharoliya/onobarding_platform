const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  // Render / cloud: use the full connection string (SSL required)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  // Local development: use individual env vars
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
      ? { rejectUnauthorized: false }
      : false,
  });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
};
