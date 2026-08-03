/**
 * Consistent response envelope used across every endpoint so the
 * frontend can rely on a single shape: { success, message, data }.
 */
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function created(res, data = null, message = 'Created') {
  return ok(res, data, message, 201);
}

function fail(res, message = 'Something went wrong', status = 400, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { ok, created, fail };
