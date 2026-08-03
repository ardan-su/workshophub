const ApiError = require('../utils/ApiError');

/**
 * Catches every error forwarded via next(err) (including from asyncHandler)
 * and turns it into a consistent JSON response. Also maps common
 * PostgreSQL error codes to friendly, non-leaky messages.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }

  // PostgreSQL unique_violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      errors: err.detail || null,
    });
  }

  // PostgreSQL foreign_key_violation
  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'This action conflicts with related data. Remove dependent records first.',
      errors: err.detail || null,
    });
  }

  // Multer file size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Uploaded file is too large.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body.' });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error. Please try again later.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
