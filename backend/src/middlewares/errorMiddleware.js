// Middleware xử lý lỗi tập trung của ứng dụng
const errorMiddleware = (err, req, res, _next) => {
  console.error("Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Lỗi máy chủ nội bộ";
  let errorCode = err.errorCode || undefined;

  // Xử lý lỗi trùng lặp khóa trong MongoDB (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = "DUPLICATE_KEY_ERROR";
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const isCompany = err.message?.includes("companies") || err.keyValue?.code?.length <= 10;
    const isAcademicTerm = err.message?.includes("academicterms");
    if (field === "code") {
      if (isCompany) {
        message = "Mã doanh nghiệp đã tồn tại. Vui lòng sử dụng mã khác hoặc để trống.";
        errorCode = "COMPANY_CODE_EXISTS";
      } else if (isAcademicTerm) {
        message = "Mã học kỳ đã tồn tại. Vui lòng sử dụng mã khác.";
        errorCode = "ACADEMIC_TERM_CODE_EXISTS";
      } else {
        message = "Mã định danh đã tồn tại trên hệ thống.";
      }
    } else {
      message = `Dữ liệu ${field ? `'${field}'` : ""} đã tồn tại trên hệ thống.`;
    }
  }

  // Xử lý lỗi kiểm tra hợp lệ dữ liệu của Mongoose (ValidationError)
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
