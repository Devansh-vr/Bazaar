// Express 4 does not automatically catch rejected promises thrown inside
// async route handlers. Wrapping handlers with this forwards any error
// to the centralized error-handling middleware instead of crashing the
// process or hanging the request.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
