const { verifyToken } = require('../utils/jwt.util');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/db');

/**
 * Verifies the Bearer token, confirms the user still exists & is active,
 * and attaches { id, role, username, email } to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Authentication required. Please log in.');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      throw new ApiError(401, 'Session expired or invalid. Please log in again.');
    }

    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, r.name AS role,
              c.id AS customer_id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN customers c ON c.user_id = u.id
        WHERE u.id = $1`,
      [payload.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      throw new ApiError(401, 'Account not found or deactivated.');
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
