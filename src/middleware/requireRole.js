import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

// Usage: router.get("/foo", requireAuth, requireRole("coach"), handler)
export function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowed.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Requires role: ${allowed.join(" or ")}`),
      );
    }
    next();
  };
}
