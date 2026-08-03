/**
 * Throw this from anywhere in a controller/model to produce a clean
 * HTTP error response via the centralized error middleware, e.g.:
 *   throw new ApiError(404, 'Vehicle not found');
 */
class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

module.exports = ApiError;
