const express = require('express');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { isHR } = require('../middleware/rbac');
const { calculateProgress } = require('../utils/progress');
const { sendManualReminder } = require('../utils/emailReminder');
const { decrypt } = require('../utils/encrypt');

// Get overview of all new hires
router.get('/onboarding/overview', auth, isHR, async (req, res) => {
  try {
    const { rows: employees } = await db.query(
      `SELECT id, name, email, joining_date, status, profile_complete 
       FROM users 
       WHERE role = 'employee' 
       ORDER BY created_at DESC`
    );

    const result = await Promise.all(employees.map(async (emp) => {
      const progress = await calculateProgress(emp.id);
      return { ...emp, progress };
    }));

    res.json(result);
  } catch (error) {
    console.error("HR overview error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get documents for a specific employee
router.get('/documents/:userId', auth, isHR, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.id, dt.name as type_name, dt.mandatory, d.file_path, d.file_name, d.mime_type, d.status, d.remark, d.uploaded_at, d.extracted_text
       FROM documents d
       JOIN document_types dt ON d.document_type_id = dt.id
       WHERE d.user_id = $1`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("HR user docs error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify a document
router.patch('/documents/:id/verify', auth, isHR, async (req, res) => {
  try {
    const { status, remark } = req.body;
    const allowedStatuses = ['Approved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }
    
    if (status === 'Rejected' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required when rejecting' });
    }

    // Get the document to find the user
    const docQuery = await db.query('SELECT user_id FROM documents WHERE id = $1', [req.params.id]);
    if (!docQuery.rows.length) return res.status(404).json({ message: 'Document not found' });
    const userId = docQuery.rows[0].user_id;

    await db.query(
      `UPDATE documents 
       SET status = $1, remark = $2, verified_by = $3, verified_at = NOW() 
       WHERE id = $4`,
      [status, remark?.trim() || null, req.user.id, req.params.id]
    );

    res.json({ message: 'Document ' + status });
  } catch (error) {
    console.error("Verify doc error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new employee
router.post('/employee', auth, isHR, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });

    await db.query(
      `INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, 'employee', 'not_set_yet')`,
      [name, email]
    );

    res.status(201).json({ message: 'Employee created successfully' });
  } catch (error) {
    console.error("Create employee error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get profile details of a specific employee
router.get('/employee/:userId/profile', auth, isHR, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.name, u.email, u.joining_date, u.status, u.profile_complete, p.* 
       FROM users u LEFT JOIN employee_profiles p ON u.id = p.user_id 
       WHERE u.id = $1 AND u.role = 'employee'`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Employee profile not found' });
    
    let profile = rows[0];
    if (profile.bank_account) profile.bank_account = decrypt(profile.bank_account);
    if (profile.pan) profile.pan = decrypt(profile.pan);

    res.json(profile);
  } catch (error) {
    console.error("HR Get profile error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get checklist for a specific employee
router.get('/employee/:userId/checklist', auth, isHR, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id as item_id, c.title, c.description, c.mandatory, c.sort_order, 
              COALESCE(cp.completed, false) as completed, cp.custom_text, cp.submitted_data
       FROM checklist_items c
       LEFT JOIN checklist_progress cp ON c.id = cp.checklist_item_id AND cp.user_id = $1
       ORDER BY c.sort_order`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("HR get checklist error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Customize checklist item text for an employee
router.put('/employee/:userId/checklist/:itemId/customize', auth, isHR, async (req, res) => {
  try {
    const { custom_text } = req.body;
    
    await db.query(
      `INSERT INTO checklist_progress (user_id, checklist_item_id, custom_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, checklist_item_id)
       DO UPDATE SET custom_text = EXCLUDED.custom_text`,
      [req.params.userId, req.params.itemId, custom_text || null]
    );

    res.json({ message: 'Custom text saved successfully' });
  } catch (error) {
    console.error("Customize checklist error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get signature of a specific employee
router.get('/employee/:userId/signature', auth, isHR, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT file_path FROM digital_signatures WHERE user_id = $1', [req.params.userId]);
    if (!rows.length) return res.status(404).json({ message: 'Signature not found' });
    
    const filePath = rows[0].file_path;
    if (fs.existsSync(filePath)) {
      res.set('Content-Type', 'image/png');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ message: 'Signature file not found on disk' });
    }
  } catch (error) {
    console.error("HR get signature error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a reminder email for pending mandatory checklist items.
router.post('/employees/:id/reminder', auth, isHR, async (req, res) => {
  try {
    const reminder = await sendManualReminder(req.params.id);
    if (!reminder.ok) {
      return res.status(reminder.status).json({ message: reminder.message });
    }

    res.json({
      message: reminder.result.sent
        ? 'Reminder email sent'
        : 'Reminder preview generated because email credentials are not configured',
      reminder: reminder.result,
    });
  } catch (error) {
    console.error("Send reminder error", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
