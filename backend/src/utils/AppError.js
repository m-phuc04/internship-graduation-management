class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);

    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
