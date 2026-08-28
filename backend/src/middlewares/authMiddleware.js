import { verifyAccessToken } from "../utils/token.js";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const error = new Error("Access token không được cung cấp");

      error.statusCode = 401;

      throw error;
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      const error = new Error("Authorization header không hợp lệ");

      error.statusCode = 401;

      throw error;
    }

    const token = parts[1];

    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      error.statusCode = 401;
      error.message = "Access token đã hết hạn";
    }

    if (error.name === "JsonWebTokenError") {
      error.statusCode = 401;
      error.message = "Access token không hợp lệ";
    }

    next(error);
  }
};

export default authMiddleware;
