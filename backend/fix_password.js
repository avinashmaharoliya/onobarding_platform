const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://onboarding_db_aan6_user:V5y9K03fmOHoqz73Y1zE8VneaFDq4Jpf@dpg-d859ug0g4nts73fp72g0-a.singapore-postgres.render.com/onboarding_db_aan6',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  
  await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'hr@company.com']);
  
  // Verify it works
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['hr@company.com']);
  const stored = rows[0].password_hash;
  const match = await bcrypt.compare(password, stored);
  
  console.log('Hash stored:', stored);
  console.log('Password "Admin@123" matches hash:', match);
  
  await pool.end();
}

fix().catch(console.error);
