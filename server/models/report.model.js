const { query } = require('../config/db');

function dateRangeClause(column, from, to, params) {
  const clauses = [];
  if (from) {
    params.push(from);
    clauses.push(`${column} >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    clauses.push(`${column} <= $${params.length}`);
  }
  return clauses;
}

async function serviceReport({ from, to }) {
  const params = [];
  const clauses = dateRangeClause('s.created_at::date', from, to, params);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const byStatus = await query(
    `SELECT ss.label, ss.code, COUNT(s.id) AS count
       FROM services s JOIN service_status ss ON ss.id = s.status_id
       ${where}
      GROUP BY ss.label, ss.code, ss.sort_order ORDER BY ss.sort_order`,
    params
  );

  const totals = await query(
    `SELECT COUNT(*) AS total_services,
            COALESCE(SUM(final_cost), 0) AS total_final_cost,
            COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600), 0) AS avg_turnaround_hours
       FROM services s ${where}`,
    params
  );

  return {
    byStatus: byStatus.rows.map((r) => ({ ...r, count: Number(r.count) })),
    totalServices: Number(totals.rows[0].total_services),
    totalFinalCost: Number(totals.rows[0].total_final_cost),
    avgTurnaroundHours: Number(totals.rows[0].avg_turnaround_hours).toFixed(1),
  };
}

async function bookingReport({ from, to }) {
  const params = [];
  const clauses = dateRangeClause('b.created_at::date', from, to, params);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const byStatus = await query(
    `SELECT status, COUNT(*) AS count FROM bookings b ${where} GROUP BY status`,
    params
  );

  return {
    byStatus: byStatus.rows.map((r) => ({ ...r, count: Number(r.count) })),
  };
}

async function revenueReport({ from, to }) {
  const params = [];
  const clauses = dateRangeClause('t.paid_at::date', from, to, params);
  const paidClauses = ["t.status = 'paid'", ...clauses];
  const where = `WHERE ${paidClauses.join(' AND ')}`;

  const totals = await query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM transactions t ${where}`, params);

  const byMethod = await query(
    `SELECT payment_method, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM transactions t ${where} GROUP BY payment_method`,
    params
  );

  return {
    total: Number(totals.rows[0].total),
    count: Number(totals.rows[0].count),
    byMethod: byMethod.rows.map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) })),
  };
}

async function inventoryReport() {
  const lowStock = await query('SELECT * FROM spare_parts WHERE quantity <= min_stock_threshold ORDER BY quantity ASC');
  const totals = await query(
    `SELECT COUNT(*) AS total_parts, COALESCE(SUM(quantity), 0) AS total_units, COALESCE(SUM(quantity * unit_price), 0) AS total_value
       FROM spare_parts`
  );
  const movement = await query(`
    SELECT type, COALESCE(SUM(quantity), 0) AS total
      FROM inventory WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY type
  `);

  return {
    totalParts: Number(totals.rows[0].total_parts),
    totalUnits: Number(totals.rows[0].total_units),
    totalValue: Number(totals.rows[0].total_value),
    lowStockCount: lowStock.rows.length,
    lowStockItems: lowStock.rows,
    last30DaysMovement: movement.rows.map((r) => ({ type: r.type, total: Number(r.total) })),
  };
}

module.exports = { serviceReport, bookingReport, revenueReport, inventoryReport };
