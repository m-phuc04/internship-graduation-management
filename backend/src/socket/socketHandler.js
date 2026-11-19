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

  // Socket Authentication Middleware
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

  // Connection Handler
  io.on("connection", (socket) => {
    const userId = socket.user?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      // Clean up if needed
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

