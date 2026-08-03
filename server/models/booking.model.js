const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT b.*, v.brand, v.model, v.license_plate, u.full_name AS customer_name, u.phone AS customer_phone
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN customers c ON c.id = b.customer_id
    JOIN users u ON u.id = c.user_id
`;

async function create({ customerId, vehicleId, serviceType, requestedDate, requestedTime, notes }) {
  const { rows } = await query(
    `INSERT INTO bookings (customer_id, vehicle_id, service_type, requested_date, requested_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [customerId, vehicleId, serviceType, requestedDate, requestedTime, notes || null]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] || null;
}

async function listByCustomer(customerId) {
  const { rows } = await query(`${BASE_SELECT} WHERE b.customer_id = $1 ORDER BY b.created_at DESC`, [customerId]);
  return rows;
}

async function listAll({ status, search, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  const clauses = [];

  if (status) {
    params.push(status);
    clauses.push(`b.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(u.full_name ILIKE $${params.length} OR v.license_plate ILIKE $${params.length} OR b.service_type ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) FROM bookings b JOIN vehicles v ON v.id=b.vehicle_id JOIN customers c ON c.id=b.customer_id JOIN users u ON u.id=c.user_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `${BASE_SELECT} ${where} ORDER BY b.requested_date ASC, b.requested_time ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0];
}

async function reschedule(id, { requestedDate, requestedTime }) {
  const { rows } = await query(
    `UPDATE bookings SET requested_date = $1, requested_time = $2, status = 'rescheduled', updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [requestedDate, requestedTime, id]
  );
  return rows[0];
}

async function countByStatus(status) {
  const { rows } = await query('SELECT COUNT(*) FROM bookings WHERE status = $1', [status]);
  return Number(rows[0].count);
}

module.exports = { create, findById, listByCustomer, listAll, updateStatus, reschedule, countByStatus };
