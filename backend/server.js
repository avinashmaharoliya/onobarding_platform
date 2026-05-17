const express = require('express');
const cors = require('cors');
const { startChecklistReminderCron } = require('./utils/emailReminder');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Import routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/profile', require('./routes/profile.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/signature', require('./routes/signature.routes'));
app.use('/api/checklist', require('./routes/checklist.routes'));
app.use('/api/joining', require('./routes/joining.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Create uploads folder if it doesn't exist
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  startChecklistReminderCron();
});
