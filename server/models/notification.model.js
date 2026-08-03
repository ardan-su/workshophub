const { query } = require('../config/db');

async function create({ userId, title, message, type }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, message, type || 'info']
  );
  return rows[0];
}

async function createForAllAdmins({ title, message, type }) {
  const { rows: admins } = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin'`
  );
  const created = [];
  for (const admin of admins) {
    // eslint-disable-next-line no-await-in-loop
    created.push(await create({ userId: admin.id, title, message, type }));
  }
  return created;
}

async function listByUser(userId, { unreadOnly, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [userId];
  let where = 'WHERE user_id = $1';
  if (unreadOnly) where += ' AND is_read = FALSE';

  const countRes = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);
  params.push(limit, offset);
  const dataRes = await query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function unreadCount(userId) {
  const { rows } = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
  return Number(rows[0].count);
}

async function markRead(id, userId) {
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return rows[0];
}

async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
}

module.exports = { create, createForAllAdmins, listByUser, unreadCount, markRead, markAllRead };
