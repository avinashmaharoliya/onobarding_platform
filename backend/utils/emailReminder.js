const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require('../config/db');

function hasEmailConfig() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

function createTransporter() {
  if (!hasEmailConfig()) return null;

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendOnboardingReminder(employeeEmail, employeeName, sections) {
  // sections = { profile: [], checklist: [], documents: [], signature: [] }
  const transporter = createTransporter();

  // Build sectioned HTML
  const sectionConfig = [
    { key: 'profile',   icon: '👤', label: 'Profile Setup',       color: '#f59e0b' },
    { key: 'documents', icon: '📄', label: 'Documents',            color: '#ef4444' },
    { key: 'checklist', icon: '✅', label: 'Onboarding Tasks',     color: '#8b5cf6' },
    { key: 'signature', icon: '✍️', label: 'Digital Signature',    color: '#3b82f6' },
  ];

  let sectionsHtml = '';
  let allPendingTitles = [];

  for (const { key, icon, label, color } of sectionConfig) {
    const items = sections[key] || [];
    if (items.length === 0) continue;

    allPendingTitles.push(...items.map(i => `[${label}] ${i.title}`));

    const listItems = items.map(item => `
      <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
        <span style="font-weight: 600;">${item.title}</span>
        ${item.note ? `<br><span style="font-size:12px; color:#64748b;">${item.note}</span>` : ''}
      </li>
    `).join('');

    sectionsHtml += `
      <div style="margin-bottom: 20px; border-left: 4px solid ${color}; padding-left: 14px;">
        <h3 style="margin: 0 0 8px 0; color: ${color}; font-size: 15px;">${icon} ${label}</h3>
        <ul style="margin: 0; padding: 0 0 0 16px; list-style: disc;">
          ${listItems}
        </ul>
      </div>
    `;
  }

  const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!transporter) {
    return {
      sent: false,
      skipped: true,
      reason: 'Email credentials are not configured',
      to: employeeEmail,
      pendingItems: allPendingTitles,
    };
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: employeeEmail,
    subject: 'Action Required: Complete Your Onboarding',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af, #2563eb); padding: 28px 32px;">
          <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 700;">🎯 Onboarding Reminder</h1>
          <p style="margin: 6px 0 0 0; color: #bfdbfe; font-size: 14px;">You have pending items to complete</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 32px;">
          <p style="font-size: 15px; margin: 0 0 20px 0;">
            Hi <strong>${employeeName}</strong>, here's what is still remaining for your onboarding:
          </p>

          ${sectionsHtml}

          <p style="font-size: 14px; color: #475569; margin-top: 20px;">
            Please complete the above items at your earliest convenience to finalize your onboarding.
          </p>

          <a href="${portalUrl}"
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px;
                    text-decoration: none; border-radius: 7px; font-weight: 600; font-size: 14px; margin-top: 12px;">
            Open Onboarding Portal →
          </a>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">
            This is an automated reminder from the HR Onboarding System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });

  return {
    sent: true,
    to: employeeEmail,
    messageId: info.messageId,
    pendingItems: allPendingTitles,
  };
}

async function getPendingOnboardingItems(userId) {
  const sections = {
    profile:   [],
    checklist: [],
    documents: [],
    signature: [],
  };

  // ── 1. Profile & Joining Date ────────────────────────────────────────────
  const userQuery = await db.query(
    `SELECT profile_complete, joining_date FROM users WHERE id = $1`,
    [userId]
  );
  if (userQuery.rows.length > 0) {
    const user = userQuery.rows[0];
    if (!user.profile_complete) {
      sections.profile.push({ title: 'Complete your profile', note: 'Fill in DOB, gender, address, PAN, bank account and education details' });
    }
    if (!user.joining_date) {
      sections.profile.push({ title: 'Confirm your joining date', note: 'Contact HR if this is missing' });
    }
  }

  // ── 2. Pending mandatory checklist tasks ─────────────────────────────────
  const checkQuery = await db.query(`
    SELECT ci.title, ci.description
    FROM checklist_items ci
    LEFT JOIN checklist_progress cp
      ON ci.id = cp.checklist_item_id AND cp.user_id = $1
    WHERE ci.mandatory = true
      AND COALESCE(cp.completed, false) = false
    ORDER BY ci.sort_order
  `, [userId]);

  for (const row of checkQuery.rows) {
    sections.checklist.push({ title: row.title, note: row.description || null });
  }

  // ── 3. Pending / rejected mandatory documents ────────────────────────────
  const docQuery = await db.query(`
    SELECT dt.name, d.status
    FROM document_types dt
    LEFT JOIN documents d
      ON dt.id = d.document_type_id AND d.user_id = $1
    WHERE dt.mandatory = true
      AND (d.id IS NULL OR d.status != 'Approved')
    ORDER BY dt.id
  `, [userId]);

  for (const row of docQuery.rows) {
    if (row.status === null) {
      sections.documents.push({ title: row.name, note: 'Not uploaded yet' });
    } else if (row.status === 'Rejected') {
      sections.documents.push({ title: row.name, note: '⚠️ Rejected — please re-upload with correct document' });
    } else if (row.status === 'Pending') {
      sections.documents.push({ title: row.name, note: 'Uploaded — awaiting HR review' });
    }
  }

  // ── 4. Digital Signature ─────────────────────────────────────────────────
  const sigQuery = await db.query(
    `SELECT id FROM digital_signatures WHERE user_id = $1`,
    [userId]
  );
  if (sigQuery.rows.length === 0) {
    sections.signature.push({ title: 'Draw and save your digital signature', note: 'Required to complete onboarding' });
  }

  // Return null if nothing is pending
  const total = Object.values(sections).reduce((sum, arr) => sum + arr.length, 0);
  if (total === 0) return null;

  return sections;
}

async function sendPendingOnboardingReminders() {
  const result = await db.query(`
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.role = 'employee'
      AND u.status <> 'Approved'
  `);

  const results = [];
  for (const user of result.rows) {
    const sections = await getPendingOnboardingItems(user.id);
    if (sections) {
      results.push(await sendOnboardingReminder(user.email, user.name, sections));
    }
  }

  return results;
}

function startChecklistReminderCron() {
  const expression = process.env.REMINDER_CRON || '0 9 * * *';

  cron.schedule(expression, async () => {
    try {
      const results = await sendPendingOnboardingReminders();
      console.log(`Onboarding reminders processed: ${results.length}`);
    } catch (error) {
      console.error('Error in onboarding reminder cron:', error);
    }
  });
}

async function sendManualReminder(userId) {
  const userResult = await db.query(
    `SELECT name, email, role, status FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return { ok: false, status: 404, message: 'Employee not found' };
  }

  const user = userResult.rows[0];
  if (user.role !== 'employee') {
    return { ok: false, status: 400, message: 'Reminders can only be sent to employees' };
  }

  if (user.status === 'Approved') {
    return { ok: false, status: 400, message: 'Employee onboarding is already approved' };
  }

  const sections = await getPendingOnboardingItems(userId);
  if (!sections) {
    return { ok: false, status: 400, message: 'No pending mandatory onboarding items' };
  }

  const result = await sendOnboardingReminder(user.email, user.name, sections);
  return { ok: true, result };
}

module.exports = {
  sendOnboardingReminder,
  sendPendingOnboardingReminders,
  startChecklistReminderCron,
  sendManualReminder,
};
