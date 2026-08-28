const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error("Bạn chưa đăng nhập");
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error("Bạn không có quyền thực hiện thao tác này");
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

export { authorizeRoles };
export default authorizeRoles;
