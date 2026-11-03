import { isProduction } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err.type === 'entity.parse.failed') {
    error = new ApiError(400, 'Request body is not valid JSON');
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation, e.g. a question pointing at a deleted survey
    error = new ApiError(400, 'Referenced record does not exist');
  }

  const status = error.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: {
      message: status >= 500 && isProduction ? 'Internal server error' : error.message,
      ...(error.details && { details: error.details }),
    },
  });
}
