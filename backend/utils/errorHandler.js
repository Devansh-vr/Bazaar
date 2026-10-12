/**
 * 404 handler for unmatched routes.
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

/**
 * Centralized error handler. Keeps response shape consistent and
 * avoids leaking stack traces / internals outside development.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode && err.statusCode !== 200 ? err.statusCode : 500;
  let message = err.message || "Internal Server Error";

  // Mongoose validation error (e.g. missing/invalid required field)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose duplicate key error (e.g. unique email constraint)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `An account with this ${field} already exists`;
  }

  // Malformed ObjectId passed to a findById-style query
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier";
  }

  const response = { success: false, message };

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
