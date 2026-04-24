export class ApiError extends Error {
  constructor(status, message, code = null, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(401, message, code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(403, message, code);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found", code = "NOT_FOUND") {
    super(404, message, code);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(409, message, code);
  }
}
