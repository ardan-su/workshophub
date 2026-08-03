/**
 * Wraps an async Express route handler so any thrown/rejected error
 * is forwarded to the centralized error middleware instead of crashing
 * the process or requiring try/catch in every controller.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
