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

    // Join Conversation Room
    socket.on("join_conversation", (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // Leave Conversation Room
    socket.on("leave_conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Typing Indicators
    socket.on("typing", ({ conversationId, userName }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("user_typing", {
          conversationId,
          userId,
          userName,
        });
      }
    });

    socket.on("stop_typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
          conversationId,
          userId,
        });
      }
    });

    socket.on("disconnect", () => {
      // Clean up if needed
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const emitNewMessage = (conversation, message) => {
  if (!io) return;

  // Emit to conversation room (for currently active viewers)
  io.to(`conversation:${conversation._id}`).emit("new_message", {
    conversationId: conversation._id,
    message,
  });

  // Emit to each participant's personal room for badge / notifications
  if (Array.isArray(conversation.participants)) {
    conversation.participants.forEach((p) => {
      const pUserId = String(p.user?._id || p.user);
      io.to(`user:${pUserId}`).emit("conversation_updated", {
        conversationId: conversation._id,
        message,
        unreadCount: p.unreadCount,
      });
    });
  }
};

export const emitMessageRead = (conversationId, readerId) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit("messages_read", {
    conversationId,
    readerId,
  });
};

export default {
  initSocketServer,
  getIO,
  emitNewMessage,
  emitMessageRead,
};

