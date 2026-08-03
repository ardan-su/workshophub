const { query } = require('../config/db');

async function create({ name, sku, category, unitPrice, quantity, minStockThreshold }) {
  const { rows } = await query(
    `INSERT INTO spare_parts (name, sku, category, unit_price, quantity, min_stock_threshold)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, sku, category || null, unitPrice, quantity || 0, minStockThreshold || 5]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM spare_parts WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listAll({ search, lowStockOnly, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR category ILIKE $${params.length})`);
  }
  if (lowStockOnly) {
    clauses.push('quantity <= min_stock_threshold');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) FROM spare_parts ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT * FROM spare_parts ${where} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function listAllSimple() {
  const { rows } = await query('SELECT id, name, sku, unit_price, quantity FROM spare_parts ORDER BY name');
  return rows;
}

async function update(id, { name, category, unitPrice, minStockThreshold }) {
  const { rows } = await query(
    `UPDATE spare_parts SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       unit_price = COALESCE($3, unit_price),
       min_stock_threshold = COALESCE($4, min_stock_threshold),
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, category, unitPrice, minStockThreshold, id]
  );
  return rows[0];
}

async function adjustQuantity(id, delta) {
  const { rows } = await query(
    `UPDATE spare_parts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [delta, id]
  );
  return rows[0];
}

async function remove(id) {
  await query('DELETE FROM spare_parts WHERE id = $1', [id]);
}

async function lowStockList() {
  const { rows } = await query('SELECT * FROM spare_parts WHERE quantity <= min_stock_threshold ORDER BY quantity ASC');
  return rows;
}

async function lowStockCount() {
  const { rows } = await query('SELECT COUNT(*) FROM spare_parts WHERE quantity <= min_stock_threshold');
  return Number(rows[0].count);
}

module.exports = { create, findById, listAll, listAllSimple, update, adjustQuantity, remove, lowStockList, lowStockCount };
