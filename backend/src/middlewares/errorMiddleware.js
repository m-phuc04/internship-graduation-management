const errorMiddleware = (err, req, res, next) => {
  console.error("Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errorCode = err.errorCode || undefined;

  // Handle MongoDB duplicate key error (11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = "DUPLICATE_KEY_ERROR";
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (field === "code") {
      message = "Mã học kỳ đã tồn tại. Vui lòng sử dụng mã khác.";
      errorCode = "ACADEMIC_TERM_CODE_EXISTS";
    } else {
      message = `Dữ liệu ${field ? `'${field}'` : ""} đã tồn tại trên hệ thống.`;
    }
  }

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    const firstMessage = Object.values(err.errors || {})[0]?.message;
    message = firstMessage || err.message;
    errorCode = "VALIDATION_ERROR";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });
};

export default errorMiddleware;
