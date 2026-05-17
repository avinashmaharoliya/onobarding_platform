const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id as item_id, c.title, c.description, c.mandatory, c.sort_order, 
              COALESCE(cp.completed, false) as completed, cp.custom_text
       FROM checklist_items c
       LEFT JOIN checklist_progress cp ON c.id = cp.checklist_item_id AND cp.user_id = $1
       ORDER BY c.sort_order`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get checklist error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const { completed, submitted_data } = req.body;
    const itemId = req.params.id;

    // Check if item exists
    const itemQuery = await db.query('SELECT * FROM checklist_items WHERE id = $1', [itemId]);
    if (!itemQuery.rows.length) return res.status(404).json({ message: 'Checklist item not found' });

    // Upsert progress
    const exist = await db.query('SELECT * FROM checklist_progress WHERE user_id = $1 AND checklist_item_id = $2', [req.user.id, itemId]);
    
    if (exist.rows.length > 0) {
      await db.query(
        'UPDATE checklist_progress SET completed = $1, completed_at = NOW(), submitted_data = COALESCE($4, submitted_data) WHERE user_id = $2 AND checklist_item_id = $3',
        [completed, req.user.id, itemId, submitted_data ? JSON.stringify(submitted_data) : null]
      );
    } else {
      await db.query(
        'INSERT INTO checklist_progress (user_id, checklist_item_id, completed, completed_at, submitted_data) VALUES ($1, $2, $3, NOW(), $4)',
        [req.user.id, itemId, completed, submitted_data ? JSON.stringify(submitted_data) : null]
      );
    }

    res.json({ message: 'Checklist updated' });
  } catch (error) {
    console.error("Update checklist error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
