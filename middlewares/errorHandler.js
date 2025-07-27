// Inline response handler functions
const success = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data })
  };
  return res.status(statusCode).json(response);
};

const error = (res, statusCode = 400, message = 'Error occurred', details = null) => {
  const response = {
    success: false,
    message,
    ...(details && { details })
  };
  return res.status(statusCode).json(response);
};

const validationError = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};

const notFound = (res, resource = 'Resource') => {
  return res.status(404).json({
    success: false,
    message: `${resource} not found`
  });
};

const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    message
  });
};

const serverError = (res, message = 'Internal server error', error = null) => {
  if (error) {
    console.error('Server Error:', error);
  }
  return res.status(500).json({
    success: false,
    message
  });
};


//  Global Error Handler Middleware

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message
    }));
    return validationError(res, errors);
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    return error(res, 400, `${field} already exists`);
  }

  // Sequelize foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return error(res, 400, 'Referenced record does not exist');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return unauthorized(res, 'Token expired');
  }

  // Validation errors (from validate.js)
  if (err.name === 'ValidationError') {
    return validationError(res, err.errors);
  }

  // Custom application errors
  if (err.statusCode) {
    return error(res, err.statusCode, err.message);
  }

  // Default server error
  return serverError(res, 'Internal server error', err);
};


// Async Error Handler Wrapper
// Wraps async route handlers to catch errors

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


// Not Found Handler

const notFoundHandler = (req, res) => {
  notFound(res, 'Route');
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
}; 