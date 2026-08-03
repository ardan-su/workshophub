const { query } = require('../config/db');

async function generateInvoiceNumber() {
  const { rows } = await query(`SELECT COUNT(*) FROM transactions WHERE created_at::date = CURRENT_DATE`);
  const seq = Number(rows[0].count) + 1;
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${datePart}-${String(seq).padStart(3, '0')}`;
}

async function create({ serviceId, customerId, amount, paymentMethod }) {
  const invoiceNumber = await generateInvoiceNumber();
  const { rows } = await query(
    `INSERT INTO transactions (service_id, customer_id, invoice_number, amount, payment_method)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [serviceId, customerId, invoiceNumber, amount, paymentMethod || 'cash']
  );
  return rows[0];
}

async function markPaid(id) {
  const { rows } = await query(
    `UPDATE transactions SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(
    `SELECT t.*, u.full_name AS customer_name, s.service_type
       FROM transactions t
       JOIN customers c ON c.id = t.customer_id
       JOIN users u ON u.id = c.user_id
       JOIN services s ON s.id = t.service_id
      WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listByCustomer(customerId) {
  const { rows } = await query(
    `SELECT t.*, s.service_type FROM transactions t JOIN services s ON s.id = t.service_id
      WHERE t.customer_id = $1 ORDER BY t.created_at DESC`,
    [customerId]
  );
  return rows;
}

async function listAll({ status, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE t.status = $${params.length}`;
  }
  const countRes = await query(`SELECT COUNT(*) FROM transactions t ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT t.*, u.full_name AS customer_name, s.service_type
       FROM transactions t
       JOIN customers c ON c.id = t.customer_id
       JOIN users u ON u.id = c.user_id
       JOIN services s ON s.id = t.service_id
       ${where}
      ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function revenueTotal({ from, to } = {}) {
  const params = [];
  let where = "WHERE status = 'paid'";
  if (from) {
    params.push(from);
    where += ` AND paid_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND paid_at <= $${params.length}`;
  }
  const { rows } = await query(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions ${where}`, params);
  return Number(rows[0].total);
}

async function revenueToday() {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'paid' AND paid_at::date = CURRENT_DATE`
  );
  return Number(rows[0].total);
}

async function revenueByDay(days = 14) {
  const { rows } = await query(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COALESCE(SUM(t.amount), 0) AS total
       FROM generate_series(
              (CURRENT_DATE - ($1::int - 1))::timestamp,
              CURRENT_DATE::timestamp,
              interval '1 day'
            ) d(day)
       LEFT JOIN transactions t ON t.paid_at::date = d.day::date AND t.status = 'paid'
      GROUP BY d.day ORDER BY d.day`,
    [days]
  );
  return rows.map((r) => ({ date: r.date, total: Number(r.total) }));
}

module.exports = { create, markPaid, findById, listByCustomer, listAll, revenueTotal, revenueToday, revenueByDay };
