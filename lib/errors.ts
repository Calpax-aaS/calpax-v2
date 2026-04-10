export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  readonly status = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  readonly status = 422
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}
