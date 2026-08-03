const { query } = require('../config/db');
const { ok } = require('../utils/response.util');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const global = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) throw new ApiError(422, 'Query parameter "q" is required.');
  const like = `%${q}%`;

  const [customers, vehicles, bookings, spareParts, invoices] = await Promise.all([
    query(
      `SELECT u.id, u.full_name, u.email, u.username, 'customer' AS type
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'customer' AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.username ILIKE $1)
        LIMIT 8`,
      [like]
    ),
    query(
      `SELECT v.id, v.brand, v.model, v.license_plate, 'vehicle' AS type
         FROM vehicles v
        WHERE v.brand ILIKE $1 OR v.model ILIKE $1 OR v.license_plate ILIKE $1
        LIMIT 8`,
      [like]
    ),
    query(
      `SELECT b.id, b.service_type, b.status, b.requested_date, 'booking' AS type
         FROM bookings b
        WHERE b.service_type ILIKE $1
        LIMIT 8`,
      [like]
    ),
    query(
      `SELECT sp.id, sp.name, sp.sku, sp.quantity, 'sparepart' AS type
         FROM spare_parts sp
        WHERE sp.name ILIKE $1 OR sp.sku ILIKE $1
        LIMIT 8`,
      [like]
    ),
    query(
      `SELECT t.id, t.invoice_number, t.amount, t.status, 'invoice' AS type
         FROM transactions t
        WHERE t.invoice_number ILIKE $1
        LIMIT 8`,
      [like]
    ),
  ]);

  ok(res, {
    customers: customers.rows,
    vehicles: vehicles.rows,
    bookings: bookings.rows,
    spareParts: spareParts.rows,
    invoices: invoices.rows,
  });
});

module.exports = { global };
