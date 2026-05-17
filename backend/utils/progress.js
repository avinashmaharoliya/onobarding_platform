// Helper to calculate progress % for an employee
const db = require('../config/db');

async function calculateProgress(userId) {
  try {
    const docQuery = await db.query(
      `SELECT COUNT(dt.id) as total,
              SUM(CASE WHEN d.status = 'Approved' THEN 1 ELSE 0 END) as approved
       FROM document_types dt
       LEFT JOIN documents d ON dt.id = d.document_type_id AND d.user_id = $1
       WHERE dt.mandatory = true`,
      [userId]
    );
    const docStats = docQuery.rows[0] || { total: 0, approved: 0 };
    
    const checkQuery = await db.query(
      `SELECT COUNT(ci.id) as total,
              SUM(CASE WHEN cp.completed = true THEN 1 ELSE 0 END) as done
       FROM checklist_items ci
       LEFT JOIN checklist_progress cp ON ci.id = cp.checklist_item_id AND cp.user_id = $1
       WHERE ci.mandatory = true`,
      [userId]
    );
    const checkStats = checkQuery.rows[0] || { total: 0, done: 0 };

    const totalItems = parseInt(docStats.total || 0) + parseInt(checkStats.total || 0);
    const doneItems = parseInt(docStats.approved || 0) + parseInt(checkStats.done || 0);

    if (totalItems === 0) return 0;
    
    return Math.round((doneItems / totalItems) * 100);
  } catch (error) {
    console.error("Progress calc error", error);
    return 0;
  }
}

module.exports = { calculateProgress };
