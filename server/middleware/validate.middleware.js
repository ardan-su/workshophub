const ApiError = require('../utils/ApiError');

/**
 * Minimal dependency-free validator.
 *
 * Usage:
 *   router.post('/', validate({
 *     email: { required: true, type: 'email' },
 *     year: { required: true, type: 'number', min: 1950, max: 2100 },
 *   }), controller.create)
 *
 * Rule options: required, type ('string'|'number'|'email'|'date'|'boolean'),
 * minLength, maxLength, min, max, oneOf: [...]
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = {};
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];
      const isEmpty = value === undefined || value === null || value === '';

      if (rules.required && isEmpty) {
        errors[field] = `${field} is required.`;
        continue;
      }
      if (isEmpty) continue; // optional & not provided, skip further checks

      if (rules.type === 'number') {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors[field] = `${field} must be a number.`;
          continue;
        }
        if (rules.min !== undefined && num < rules.min) errors[field] = `${field} must be at least ${rules.min}.`;
        if (rules.max !== undefined && num > rules.max) errors[field] = `${field} must be at most ${rules.max}.`;
      }

      if (rules.type === 'email') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(value)) errors[field] = `${field} must be a valid email address.`;
      }

      if (rules.type === 'date') {
        if (Number.isNaN(Date.parse(value))) errors[field] = `${field} must be a valid date.`;
      }

      if (rules.type === 'string' || rules.type === undefined) {
        if (rules.minLength && String(value).length < rules.minLength) {
          errors[field] = `${field} must be at least ${rules.minLength} characters.`;
        }
        if (rules.maxLength && String(value).length > rules.maxLength) {
          errors[field] = `${field} must be at most ${rules.maxLength} characters.`;
        }
      }

      if (rules.oneOf && !rules.oneOf.includes(value)) {
        errors[field] = `${field} must be one of: ${rules.oneOf.join(', ')}.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ApiError(422, 'Validation failed.', errors));
    }
    next();
  };
}

module.exports = { validate };
