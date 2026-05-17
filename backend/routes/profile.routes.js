const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encrypt');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.name, u.email, u.joining_date, u.status, u.profile_complete, p.* 
       FROM users u LEFT JOIN employee_profiles p ON u.id = p.user_id 
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Profile not found' });
    
    let profile = rows[0];
    if (profile.bank_account) profile.bank_account = decrypt(profile.bank_account);
    if (profile.pan) profile.pan = decrypt(profile.pan);

    res.json(profile);
  } catch (error) {
    console.error("Get profile error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { dob, gender, address, emergency_contact, bank_account, pan, education_json, name } = req.body;
    
    // Encrypt sensitive data
    const encBank = encrypt(bank_account);
    const encPan = encrypt(pan);

    // Update user name
    if (name) {
      await db.query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);
    }

    // Check if profile exists
    const { rows } = await db.query('SELECT * FROM employee_profiles WHERE user_id = $1', [req.user.id]);
    
    if (rows.length > 0) {
      // Update
      await db.query(
        `UPDATE employee_profiles 
         SET dob = $1, gender = $2, address = $3, emergency_contact = $4, bank_account = $5, pan = $6, education_json = $7, updated_at = NOW()
         WHERE user_id = $8`,
        [dob, gender, address, emergency_contact, encBank, encPan, education_json ? JSON.stringify(education_json) : null, req.user.id]
      );
    } else {
      // Insert
      await db.query(
        `INSERT INTO employee_profiles (user_id, dob, gender, address, emergency_contact, bank_account, pan, education_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, dob, gender, address, emergency_contact, encBank, encPan, education_json ? JSON.stringify(education_json) : null]
      );
    }

    const educationComplete = education_json?.degree && education_json?.college && education_json?.year;

    // Mark profile as complete if required fields are present
    if (name && dob && gender && address && emergency_contact && bank_account && pan && educationComplete) {
      await db.query('UPDATE users SET profile_complete = true WHERE id = $1', [req.user.id]);
    } else {
      await db.query('UPDATE users SET profile_complete = false WHERE id = $1', [req.user.id]);
    }

    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error("Update profile error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
