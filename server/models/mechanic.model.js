const { query } = require('../config/db');

async function create({ fullName, specialization, phone, email, avatarUrl }) {
  const { rows } = await query(
    `INSERT INTO mechanics (full_name, specialization, phone, email, avatar_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [fullName, specialization || null, phone || null, email || null, avatarUrl || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM mechanics WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listAll({ search, status, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(full_name ILIKE $${params.length} OR specialization ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM mechanics ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT m.*,
            (SELECT COUNT(*) FROM services s WHERE s.mechanic_id = m.id AND s.status_id NOT IN (SELECT id FROM service_status WHERE code = 'completed')) AS active_jobs
       FROM mechanics m ${where}
      ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function listActive() {
  const { rows } = await query(`SELECT id, full_name, specialization FROM mechanics WHERE status = 'active' ORDER BY full_name`);
  return rows;
}

async function update(id, { fullName, specialization, phone, email, status, avatarUrl }) {
  const { rows } = await query(
    `UPDATE mechanics SET
       full_name = COALESCE($1, full_name),
       specialization = COALESCE($2, specialization),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       status = COALESCE($5, status),
       avatar_url = COALESCE($6, avatar_url),
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [fullName, specialization, phone, email, status, avatarUrl, id]
  );
  return rows[0];
}

async function remove(id) {
  await query('DELETE FROM mechanics WHERE id = $1', [id]);
}

module.exports = { create, findById, listAll, listActive, update, remove };
