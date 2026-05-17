const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

async function ensureSignatureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS digital_signatures (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_path VARCHAR(500) NOT NULL,
      signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

router.post('/', auth, async (req, res) => {
  try {
    const { signature } = req.body;
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(signature || '');

    if (!match) {
      return res.status(400).json({ message: 'Valid PNG signature data is required' });
    }

    await ensureSignatureTable();

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-signature-${req.user.id}.png`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(match[1], 'base64'));

    await db.query(
      `INSERT INTO digital_signatures (user_id, file_path, signed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET file_path = EXCLUDED.file_path, signed_at = NOW()`,
      [req.user.id, filePath]
    );

    res.status(201).json({ message: 'Signature saved successfully' });
  } catch (error) {
    console.error("Signature save error", error);
    res.status(500).json({
      message: 'Failed to save signature',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    await ensureSignatureTable();

    const { rows } = await db.query(
      'SELECT signed_at FROM digital_signatures WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ signed: rows.length > 0, signed_at: rows[0]?.signed_at || null });
  } catch (error) {
    console.error("Signature status error", error);
    res.status(500).json({
      message: 'Failed to load signature status',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

module.exports = router;
