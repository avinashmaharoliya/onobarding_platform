const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];

    if (user.password_hash === 'not_set_yet') {
      return res.status(403).json({ message: 'Please set up your password first' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role, userId: user.id });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role !== 'employee' || rows[0].password_hash !== 'not_set_yet') {
      return res.status(403).json({ message: 'Password setup is only available for first-time employee accounts' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

    const token = jwt.sign({ id: rows[0].id, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: rows[0].role, userId: rows[0].id });
  } catch (error) {
    console.error("Setup error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
