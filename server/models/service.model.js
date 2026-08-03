const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT s.*, ss.code AS status_code, ss.label AS status_label, ss.sort_order AS status_sort,
         v.brand, v.model, v.license_plate, v.year, v.color,
         u.full_name AS customer_name, u.phone AS customer_phone,
         m.full_name AS mechanic_name
    FROM services s
    JOIN service_status ss ON ss.id = s.status_id
    JOIN vehicles v ON v.id = s.vehicle_id
    JOIN customers c ON c.id = s.customer_id
    JOIN users u ON u.id = c.user_id
    LEFT JOIN mechanics m ON m.id = s.mechanic_id
`;

async function getAllStatuses() {
  const { rows } = await query('SELECT * FROM service_status ORDER BY sort_order');
  return rows;
}

async function getStatusByCode(code) {
  const { rows } = await query('SELECT * FROM service_status WHERE code = $1', [code]);
  return rows[0] || null;
}

async function getStatusById(id) {
  const { rows } = await query('SELECT * FROM service_status WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ bookingId, customerId, vehicleId, serviceType, estimatedCost }) {
  const waiting = await getStatusByCode('waiting');
  const { rows } = await query(
    `INSERT INTO services (booking_id, customer_id, vehicle_id, status_id, service_type, estimated_cost)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [bookingId || null, customerId, vehicleId, waiting.id, serviceType, estimatedCost || 0]
  );
  await recalculateQueuePositions();
  return findById(rows[0].id);
}

async function findById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  return rows[0] || null;
}

async function listByCustomer(customerId) {
  const { rows } = await query(`${BASE_SELECT} WHERE s.customer_id = $1 ORDER BY s.created_at DESC`, [customerId]);
  return rows;
}

async function listActiveByCustomer(customerId) {
  const { rows } = await query(
    `${BASE_SELECT} WHERE s.customer_id = $1 AND ss.code <> 'completed' ORDER BY s.created_at DESC`,
    [customerId]
  );
  return rows;
}

async function listAll({ status, mechanicId, search, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  const clauses = [];

  if (status) {
    params.push(status);
    clauses.push(`ss.code = $${params.length}`);
  }
  if (mechanicId) {
    params.push(mechanicId);
    clauses.push(`s.mechanic_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(u.full_name ILIKE $${params.length} OR v.license_plate ILIKE $${params.length} OR s.service_type ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) FROM services s JOIN service_status ss ON ss.id=s.status_id
     JOIN vehicles v ON v.id=s.vehicle_id JOIN customers c ON c.id=s.customer_id JOIN users u ON u.id=c.user_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `${BASE_SELECT} ${where} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function assignMechanic(serviceId, mechanicId) {
  const { rows } = await query(
    `UPDATE services SET mechanic_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [mechanicId, serviceId]
  );
  return rows[0];
}

async function updateStatus(serviceId, statusCode) {
  const status = await getStatusByCode(statusCode);
  if (!status) throw new Error(`Unknown status code: ${statusCode}`);

  const extra = {};
  if (statusCode === 'repairing') extra.started_at = 'started_at = COALESCE(started_at, NOW()),';
  if (statusCode === 'completed') extra.completed_at = 'completed_at = NOW(),';

  const { rows } = await query(
    `UPDATE services SET
       status_id = $1,
       ${extra.started_at || ''}
       ${extra.completed_at || ''}
       updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status.id, serviceId]
  );

  await recalculateQueuePositions();
  return findById(serviceId);
}

async function updateNotes(serviceId, { repairNotes, estimatedCost, finalCost, estimatedCompletion }) {
  const { rows } = await query(
    `UPDATE services SET
       repair_notes = COALESCE($1, repair_notes),
       estimated_cost = COALESCE($2, estimated_cost),
       final_cost = COALESCE($3, final_cost),
       estimated_completion = COALESCE($4, estimated_completion),
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [repairNotes, estimatedCost, finalCost, estimatedCompletion, serviceId]
  );
  return rows[0];
}

/**
 * Recomputes queue_position for every service that is not yet completed,
 * ordered by creation time (FIFO). Called whenever a service is created
 * or its status changes, so customers always see an accurate live position.
 */
async function recalculateQueuePositions() {
  await query(`
    WITH ranked AS (
      SELECT s.id, ROW_NUMBER() OVER (ORDER BY s.created_at ASC) AS rn
        FROM services s
        JOIN service_status ss ON ss.id = s.status_id
       WHERE ss.code <> 'completed'
    )
    UPDATE services SET queue_position = ranked.rn
      FROM ranked WHERE services.id = ranked.id;
  `);
  await query(`UPDATE services SET queue_position = NULL WHERE status_id = (SELECT id FROM service_status WHERE code = 'completed')`);
}

async function countInQueue() {
  const { rows } = await query(
    `SELECT COUNT(*) FROM services s JOIN service_status ss ON ss.id = s.status_id WHERE ss.code = 'waiting'`
  );
  return Number(rows[0].count);
}

async function countUnderRepair() {
  const { rows } = await query(
    `SELECT COUNT(*) FROM services s JOIN service_status ss ON ss.id = s.status_id
      WHERE ss.code IN ('checked_in','inspection','repairing','waiting_parts','quality_check')`
  );
  return Number(rows[0].count);
}

async function countCompletedToday() {
  const { rows } = await query(
    `SELECT COUNT(*) FROM services s JOIN service_status ss ON ss.id = s.status_id
      WHERE ss.code = 'completed' AND s.completed_at::date = CURRENT_DATE`
  );
  return Number(rows[0].count);
}

async function statusBreakdown() {
  const { rows } = await query(`
    SELECT ss.code, ss.label, COUNT(s.id) AS count
      FROM service_status ss
      LEFT JOIN services s ON s.status_id = ss.id
     GROUP BY ss.code, ss.label, ss.sort_order
     ORDER BY ss.sort_order
  `);
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

module.exports = {
  getAllStatuses,
  getStatusByCode,
  getStatusById,
  create,
  findById,
  listByCustomer,
  listActiveByCustomer,
  listAll,
  assignMechanic,
  updateStatus,
  updateNotes,
  recalculateQueuePositions,
  countInQueue,
  countUnderRepair,
  countCompletedToday,
  statusBreakdown,
};
