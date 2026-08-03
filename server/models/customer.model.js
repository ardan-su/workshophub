const { query } = require('../config/db');

async function createProfile(userId, { address, city }) {
  const { rows } = await query(
    `INSERT INTO customers (user_id, address, city) VALUES ($1, $2, $3) RETURNING *`,
    [userId, address || null, city || null]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await query('SELECT * FROM customers WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT c.*, u.full_name, u.email, u.phone, u.username, u.avatar_url
       FROM customers c JOIN users u ON u.id = c.user_id
      WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateProfile(id, { address, city, notes }) {
  const { rows } = await query(
    `UPDATE customers SET
       address = COALESCE($1, address),
       city = COALESCE($2, city),
       notes = COALESCE($3, notes),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [address, city, notes, id]
  );
  return rows[0];
}

async function deleteById(id) {
  await query('DELETE FROM customers WHERE id = $1', [id]);
}

module.exports = { createProfile, findByUserId, findById, updateProfile, deleteById };
