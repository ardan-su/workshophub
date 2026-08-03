const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT v.*, u.full_name AS customer_name, u.email AS customer_email
    FROM vehicles v
    JOIN customers c ON c.id = v.customer_id
    JOIN users u ON u.id = c.user_id
`;

async function create({ customerId, brand, model, year, licensePlate, color, mileage, photoUrl }) {
  const { rows } = await query(
    `INSERT INTO vehicles (customer_id, brand, model, year, license_plate, color, mileage, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [customerId, brand, model, year, licensePlate.toUpperCase(), color || null, mileage || 0, photoUrl || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE v.id = $1`, [id]);
  return rows[0] || null;
}

async function listByCustomer(customerId) {
  const { rows } = await query(`${BASE_SELECT} WHERE v.customer_id = $1 ORDER BY v.created_at DESC`, [customerId]);
  return rows;
}

async function listAll({ search, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';

  if (search) {
    params.push(`%${search}%`);
    where = `WHERE v.brand ILIKE $${params.length} OR v.model ILIKE $${params.length}
              OR v.license_plate ILIKE $${params.length} OR u.full_name ILIKE $${params.length}`;
  }

  const countRes = await query(
    `SELECT COUNT(*) FROM vehicles v JOIN customers c ON c.id = v.customer_id JOIN users u ON u.id = c.user_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `${BASE_SELECT} ${where} ORDER BY v.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function update(id, { brand, model, year, licensePlate, color, mileage, photoUrl }) {
  const { rows } = await query(
    `UPDATE vehicles SET
       brand = COALESCE($1, brand),
       model = COALESCE($2, model),
       year = COALESCE($3, year),
       license_plate = COALESCE($4, license_plate),
       color = COALESCE($5, color),
       mileage = COALESCE($6, mileage),
       photo_url = COALESCE($7, photo_url),
       updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [brand, model, year, licensePlate ? licensePlate.toUpperCase() : null, color, mileage, photoUrl, id]
  );
  return rows[0];
}

async function remove(id) {
  await query('DELETE FROM vehicles WHERE id = $1', [id]);
}

async function belongsToCustomer(vehicleId, customerId) {
  const { rows } = await query('SELECT id FROM vehicles WHERE id = $1 AND customer_id = $2', [vehicleId, customerId]);
  return rows.length > 0;
}

async function history(vehicleId) {
  const { rows } = await query(
    `SELECT s.id, s.service_type, s.status_id, ss.label AS status_label, ss.code AS status_code,
            s.repair_notes, s.estimated_cost, s.final_cost, s.started_at, s.completed_at, s.created_at,
            m.full_name AS mechanic_name
       FROM services s
       JOIN service_status ss ON ss.id = s.status_id
       LEFT JOIN mechanics m ON m.id = s.mechanic_id
      WHERE s.vehicle_id = $1
      ORDER BY s.created_at DESC`,
    [vehicleId]
  );
  return rows;
}

async function count() {
  const { rows } = await query('SELECT COUNT(*) FROM vehicles');
  return Number(rows[0].count);
}

module.exports = { create, findById, listByCustomer, listAll, update, remove, belongsToCustomer, history, count };
