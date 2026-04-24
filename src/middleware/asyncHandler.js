// Wrap async route handlers so thrown errors reach the Express error middleware.
// We use this explicit wrapper instead of `express-async-errors` for Node 24 compat.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
