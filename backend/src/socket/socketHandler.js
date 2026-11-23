import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/token.js";
import env from "../config/env.js";

let io = null;

export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Middleware xác thực kết nối Socket.IO
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Xác thực Socket thất bại: Không tìm thấy Token"));
      }

      const decoded = verifyAccessToken(token);
      socket.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
      next();
    } catch (err) {
      return next(new Error("Xác thực Socket thất bại: Token không hợp lệ"));
    }
  });

  // Xử lý sự kiện kết nối Socket.IO
  io.on("connection", (socket) => {
    const userId = socket.user?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      // Dọn dẹp tài nguyên khi ngắt kết nối nếu cần
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export default {
  initSocketServer,
  getIO,
};

