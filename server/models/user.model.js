const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar_url,
         u.is_active, u.created_at, r.name AS role, c.id AS customer_id,
         c.address, c.city
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN customers c ON c.user_id = u.id
`;

async function findByEmailOrUsername(identifier) {
  const { rows } = await query(
    `SELECT u.*, r.name AS role FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1 OR u.username = $1`,
    [identifier]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

async function emailOrUsernameTaken(email, username) {
  const { rows } = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
  return rows.length > 0;
}

async function createUser({ roleId, username, email, passwordHash, fullName, phone }) {
  const { rows } = await query(
    `INSERT INTO users (role_id, username, email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username, email, full_name, phone, is_active, created_at`,
    [roleId, username, email, passwordHash, fullName, phone || null]
  );
  return rows[0];
}

async function updateProfile(id, { fullName, phone, avatarUrl }) {
  const { rows } = await query(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       phone = COALESCE($2, phone),
       avatar_url = COALESCE($3, avatar_url),
       updated_at = NOW()
     WHERE id = $4
     RETURNING id, username, email, full_name, phone, avatar_url`,
    [fullName, phone, avatarUrl, id]
  );
  return rows[0];
}

async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id]);
}

async function listCustomers({ search, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = "WHERE r.name = 'customer'";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
  }

  const countRes = await query(
    `SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `${BASE_SELECT} ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function setActive(id, isActive) {
  const { rows } = await query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, is_active',
    [isActive, id]
  );
  return rows[0];
}

async function deleteUser(id) {
  await query('DELETE FROM users WHERE id = $1', [id]);
}

async function countByRole(role) {
  const { rows } = await query(
    `SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = $1`,
    [role]
  );
  return Number(rows[0].count);
}

module.exports = {
  findByEmailOrUsername,
  findById,
  emailOrUsernameTaken,
  createUser,
  updateProfile,
  updatePassword,
  listCustomers,
  setActive,
  deleteUser,
  countByRole,
};
