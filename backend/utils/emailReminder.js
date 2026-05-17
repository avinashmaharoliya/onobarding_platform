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

async function sendOnboardingReminder(employeeEmail, employeeName, pendingItems) {
  const titles = pendingItems.map(item => item.title);
  const itemsHtml = titles.map(title => `<li>${title}</li>`).join('');
  const transporter = createTransporter();

  if (!transporter) {
    return {
      sent: false,
      skipped: true,
      reason: 'Email credentials are not configured',
      to: employeeEmail,
      pendingItems: titles,
    };
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: employeeEmail,
    subject: 'Action Required: Your Onboarding is Incomplete',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Hi ${employeeName},</h2>
        <p>This is a reminder that your onboarding is currently <strong>incomplete</strong>. We noticed you have some pending tasks or documents that need your attention:</p>
        <ul style="background: #f8fafc; padding: 15px 15px 15px 35px; border-radius: 8px;">${itemsHtml}</ul>
        <p>Please complete these items at your earliest convenience to finalize your onboarding process.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
          Go to Onboarding Portal
        </a>
        <br><br>
        <p>Best regards,<br><strong>HR Team</strong></p>
      </div>
    `,
  });

  return {
    sent: true,
    to: employeeEmail,
    messageId: info.messageId,
    pendingItems: titles,
  };
}

async function getPendingOnboardingItems(userId) {
  const pending = [];

  // Check Profile & Joining Date
  const userQuery = await db.query(`SELECT profile_complete, joining_date FROM users WHERE id = $1`, [userId]);
  if (userQuery.rows.length > 0) {
    const user = userQuery.rows[0];
    if (!user.profile_complete) {
      pending.push({ title: 'Task: Complete Profile Setup' });
    }
    if (!user.joining_date) {
      pending.push({ title: 'Task: Confirm Joining Date' });
    }
  }

  // Pending checklist items
  const checkQuery = await db.query(`
    SELECT ci.title
    FROM checklist_items ci
    LEFT JOIN checklist_progress cp
      ON ci.id = cp.checklist_item_id AND cp.user_id = $1
    WHERE ci.mandatory = true
      AND COALESCE(cp.completed, false) = false
    ORDER BY ci.sort_order
  `, [userId]);

  // Pending or non-approved documents
  const docQuery = await db.query(`
    SELECT dt.name as title
    FROM document_types dt
    LEFT JOIN documents d
      ON dt.id = d.document_type_id AND d.user_id = $1
    WHERE dt.mandatory = true
      AND (d.id IS NULL OR d.status != 'Approved')
  `, [userId]);

  return [
    ...pending,
    ...checkQuery.rows.map(r => ({ title: `Task: ${r.title}` })),
    ...docQuery.rows.map(r => ({ title: `Document: ${r.title}` }))
  ];
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
    const pendingItems = await getPendingOnboardingItems(user.id);
    if (pendingItems.length > 0) {
      results.push(await sendOnboardingReminder(user.email, user.name, pendingItems));
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

  const pendingItems = await getPendingOnboardingItems(userId);
  if (pendingItems.length === 0) {
    return { ok: false, status: 400, message: 'No pending mandatory onboarding items' };
  }

  const result = await sendOnboardingReminder(user.email, user.name, pendingItems);
  return { ok: true, result };
}

module.exports = {
  sendOnboardingReminder,
  sendPendingOnboardingReminders,
  startChecklistReminderCron,
  sendManualReminder,
};
