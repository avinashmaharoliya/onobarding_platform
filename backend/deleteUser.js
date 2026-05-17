const db = require('./config/db');

async function deleteUser(email) {
  try {
    // Find user ID
    const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log(`User with email ${email} not found.`);
      process.exit(0);
    }
    const userId = userRes.rows[0].id;

    console.log(`Found user ${email} with ID ${userId}. Deleting records...`);

    // Delete dependent records first (since they don't have ON DELETE CASCADE)
    await db.query('DELETE FROM checklist_progress WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM documents WHERE user_id = $1', [userId]);
    
    // employee_profiles and digital_signatures have ON DELETE CASCADE, 
    // so deleting the user will automatically delete them.
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`Successfully deleted user ${email} and all associated data.`);
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    process.exit(0);
  }
}

const emailToDelete = process.argv[2];
if (!emailToDelete) {
  console.log('Please provide an email. Example: node deleteUser.js employee@example.com');
  process.exit(1);
}

deleteUser(emailToDelete);
