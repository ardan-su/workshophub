const { query, getClient } = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Manual stock-in (e.g. new delivery from a supplier).
 */
async function stockIn({ sparePartId, quantity, reference, userId }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE', [sparePartId]);
    if (part.rows.length === 0) throw new ApiError(404, 'Spare part not found.');

    await client.query('UPDATE spare_parts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2', [quantity, sparePartId]);
    const { rows } = await client.query(
      `INSERT INTO inventory (spare_part_id, type, quantity, reference, created_by)
       VALUES ($1, 'in', $2, $3, $4) RETURNING *`,
      [sparePartId, quantity, reference || 'Manual stock-in', userId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Manual stock-out (e.g. damaged goods, correction) not tied to a service.
 */
async function stockOut({ sparePartId, quantity, reference, userId }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE', [sparePartId]);
    if (part.rows.length === 0) throw new ApiError(404, 'Spare part not found.');
    if (part.rows[0].quantity < quantity) throw new ApiError(400, 'Not enough stock available for this reduction.');

    await client.query('UPDATE spare_parts SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [quantity, sparePartId]);
    const { rows } = await client.query(
      `INSERT INTO inventory (spare_part_id, type, quantity, reference, created_by)
       VALUES ($1, 'out', $2, $3, $4) RETURNING *`,
      [sparePartId, quantity, reference || 'Manual stock-out', userId]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Attaches a spare part usage to a service (job card) and automatically
 * reduces stock in the same transaction, recording it in the ledger.
 * This is the "Automatic stock reduction" feature.
 */
async function usePartForService({ serviceId, sparePartId, quantity, userId }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE', [sparePartId]);
    if (part.rows.length === 0) throw new ApiError(404, 'Spare part not found.');
    if (part.rows[0].quantity < quantity) {
      throw new ApiError(400, `Not enough stock for "${part.rows[0].name}". Available: ${part.rows[0].quantity}.`);
    }

    const unitPrice = part.rows[0].unit_price;

    await client.query(
      `INSERT INTO service_spare_parts (service_id, spare_part_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
      [serviceId, sparePartId, quantity, unitPrice]
    );
    await client.query('UPDATE spare_parts SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [quantity, sparePartId]);
    await client.query(
      `INSERT INTO inventory (spare_part_id, type, quantity, reference, service_id, created_by)
       VALUES ($1, 'out', $2, $3, $4, $5)`,
      [sparePartId, quantity, `Used on service #${serviceId}`, serviceId, userId]
    );
    // Roll the parts cost into the service's estimated cost automatically
    await client.query(
      `UPDATE services SET estimated_cost = estimated_cost + $1, updated_at = NOW() WHERE id = $2`,
      [unitPrice * quantity, serviceId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await query(
    `SELECT ssp.*, sp.name AS part_name, sp.sku
       FROM service_spare_parts ssp JOIN spare_parts sp ON sp.id = ssp.spare_part_id
      WHERE ssp.service_id = $1 ORDER BY ssp.created_at DESC`,
    [serviceId]
  );
  return rows;
}

async function partsUsedByService(serviceId) {
  const { rows } = await query(
    `SELECT ssp.*, sp.name AS part_name, sp.sku
       FROM service_spare_parts ssp JOIN spare_parts sp ON sp.id = ssp.spare_part_id
      WHERE ssp.service_id = $1 ORDER BY ssp.created_at DESC`,
    [serviceId]
  );
  return rows;
}

async function history({ sparePartId, page, limit }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (sparePartId) {
    params.push(sparePartId);
    where = `WHERE i.spare_part_id = $${params.length}`;
  }
  const countRes = await query(`SELECT COUNT(*) FROM inventory i ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT i.*, sp.name AS part_name, sp.sku, u.full_name AS created_by_name
       FROM inventory i
       JOIN spare_parts sp ON sp.id = i.spare_part_id
       LEFT JOIN users u ON u.id = i.created_by
       ${where}
      ORDER BY i.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

module.exports = { stockIn, stockOut, usePartForService, partsUsedByService, history };
