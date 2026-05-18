const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileType = require('file-type');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

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

// ── Upload Document ─────────────────────────────────────────────────────────
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Must complete profile first
    const userQ = await db.query('SELECT profile_complete FROM users WHERE id = $1', [req.user.id]);
    if (!userQ.rows[0].profile_complete) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Complete profile before uploading documents' });
    }

    // Validate actual MIME type via magic bytes (not just extension)
    const buffer = fs.readFileSync(req.file.path);
    const detected = await fileType.fromBuffer(buffer);
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!detected || !allowed.includes(detected.mime)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid file type. Only PDF, JPG, PNG allowed.' });
    }

    const { document_type_id, ocr_text } = req.body;

    // Validate document type
    const dt = await db.query('SELECT * FROM document_types WHERE id = $1', [document_type_id]);
    if (!dt.rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // Block re-upload if already approved
    const existing = await db.query(
      'SELECT status FROM documents WHERE user_id = $1 AND document_type_id = $2',
      [req.user.id, document_type_id]
    );
    if (existing.rows.length > 0 && existing.rows[0].status === 'Approved') {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Document already approved, cannot replace.' });
    }

    // OCR text sent from browser-side Tesseract scan (more reliable than server-side)
    const extractedText = (ocr_text && ocr_text.trim()) ? ocr_text.trim() : null;

    // Upsert: update if exists, insert if new
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE documents
         SET file_path = $1, file_name = $2, mime_type = $3,
             status = 'Pending', remark = NULL, uploaded_at = NOW(), extracted_text = $4
         WHERE user_id = $5 AND document_type_id = $6`,
        [req.file.path, req.file.originalname, detected.mime, extractedText, req.user.id, document_type_id]
      );
    } else {
      await db.query(
        `INSERT INTO documents (user_id, document_type_id, file_path, file_name, mime_type, extracted_text)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, document_type_id, req.file.path, req.file.originalname, detected.mime, extractedText]
      );
    }

    // Auto-update user status when all mandatory docs uploaded
    const mandatoryDocs = await db.query('SELECT id FROM document_types WHERE mandatory = true');
    const myDocs = await db.query('SELECT document_type_id FROM documents WHERE user_id = $1', [req.user.id]);
    const myDocIds = myDocs.rows.map(r => r.document_type_id);
    const allMandatoryUploaded = mandatoryDocs.rows.every(d => myDocIds.includes(d.id));

    if (allMandatoryUploaded) {
      await db.query(
        `UPDATE users SET status = 'Documents Submitted' WHERE id = $1 AND status = 'Pending'`,
        [req.user.id]
      );
    }

    res.status(201).json({ message: 'Uploaded successfully', ocr_text: extractedText });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get My Documents ────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT dt.id as type_id, dt.name as type_name, dt.mandatory,
              d.id as doc_id, d.status, d.remark, d.uploaded_at
       FROM document_types dt
       LEFT JOIN documents d ON dt.id = d.document_type_id AND d.user_id = $1
       ORDER BY dt.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get my docs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Save Digital Signature ──────────────────────────────────────────────────
router.post('/signature', auth, async (req, res) => {
  try {
    const { signature } = req.body;
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(signature || '');

    if (!match) {
      return res.status(400).json({ message: 'Valid PNG signature data is required' });
    }

    await ensureSignatureTable();

    const fileName = `${Date.now()}-signature-${req.user.id}.png`;
    const filePath = path.join(__dirname, '../uploads/', fileName);
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
    console.error('Signature save error:', error);
    res.status(500).json({ message: 'Failed to save signature' });
  }
});

// ── Get Signature Status ────────────────────────────────────────────────────
router.get('/signature/me', auth, async (req, res) => {
  try {
    await ensureSignatureTable();
    const { rows } = await db.query(
      'SELECT signed_at FROM digital_signatures WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ signed: rows.length > 0, signed_at: rows[0]?.signed_at || null });
  } catch (error) {
    console.error('Signature status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Stream File ─────────────────────────────────────────────────────────────
router.get('/file/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'File not found' });

    const doc = rows[0];
    if (doc.user_id !== req.user.id && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (fs.existsSync(doc.file_path)) {
      res.set('Content-Type', doc.mime_type);
      fs.createReadStream(doc.file_path).pipe(res);
    } else {
      res.status(404).json({ message: 'File not found on disk' });
    }
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
