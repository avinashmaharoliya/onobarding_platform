const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.post('/confirm', auth, async (req, res) => {
  try {
    const { joining_date } = req.body;
    if (!joining_date) return res.status(400).json({ message: 'Joining date is required' });

    // Validate that profile is complete, mandatory docs are approved, and checklist is done.
    const user = await db.query('SELECT profile_complete FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0].profile_complete) {
      return res.status(403).json({ message: 'Profile is not complete' });
    }

    const mandatoryDocs = await db.query('SELECT id FROM document_types WHERE mandatory = true');
    const myDocs = await db.query('SELECT document_type_id, status FROM documents WHERE user_id = $1', [req.user.id]);
    
    for (const docType of mandatoryDocs.rows) {
      const myDoc = myDocs.rows.find(d => d.document_type_id === docType.id);
      if (!myDoc || myDoc.status !== 'Approved') {
        return res.status(403).json({ message: 'All mandatory documents must be approved before confirming joining date' });
      }
    }

    const mandatoryChecklist = await db.query('SELECT id FROM checklist_items WHERE mandatory = true');
    const myChecklist = await db.query(
      'SELECT checklist_item_id, completed FROM checklist_progress WHERE user_id = $1',
      [req.user.id]
    );

    for (const item of mandatoryChecklist.rows) {
      const progress = myChecklist.rows.find(row => row.checklist_item_id === item.id);
      if (!progress || !progress.completed) {
        return res.status(403).json({ message: 'All mandatory checklist items must be completed before confirming joining date' });
      }
    }

    await db.query(
      `UPDATE users SET joining_date = $1, status = 'Approved' WHERE id = $2`,
      [joining_date, req.user.id]
    );
    
    res.json({ message: 'Joining date confirmed' });
  } catch (error) {
    console.error("Confirm joining error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
