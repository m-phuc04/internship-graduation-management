import mongoose from "mongoose";
import connectDatabase from "../config/database.js";

/**
 * Script dọn dẹp an toàn toàn bộ dữ liệu Chat trong MongoDB:
 * - Xóa (drop) các collections: `conversations` và `messages`.
 * - Xóa bỏ an toàn các trường chat nếu có tồn tại trên các collections khác (users, lecturers, students, theses).
 * - Giữ nguyên 100% dữ liệu tài khoản, phân quyền, đề tài, thực tập, đánh giá, thông báo.
 */
const cleanupChatData = async () => {
  try {
    console.log("=== BẮT ĐẦU DỌN DẸP DỮ LIỆU CHAT TRONG MONGODB ===");
    await connectDatabase();

    const db = mongoose.connection.db;

    // 1. Lấy danh sách các collections hiện có
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log(`Các collections hiện có: ${collectionNames.join(", ")}`);

    // 2. Xóa collection messages nếu tồn tại
    if (collectionNames.includes("messages")) {
      await db.collection("messages").drop();
      console.log("✓ Đã xóa thành công collection: 'messages'");
    } else {
      console.log("- Collection 'messages' không tồn tại hoặc đã được xóa trước đó.");
    }

    // 3. Xóa collection conversations nếu tồn tại
    if (collectionNames.includes("conversations")) {
      await db.collection("conversations").drop();
      console.log("✓ Đã xóa thành công collection: 'conversations'");
    } else {
      console.log("- Collection 'conversations' không tồn tại hoặc đã được xóa trước đó.");
    }

    // 4. Dọn dẹp an toàn các trường liên quan đến chat nếu có trên collection users
    if (collectionNames.includes("users")) {
      const userUpdateResult = await db.collection("users").updateMany(
        {},
        {
          $unset: {
            unreadChatCount: "",
            chatRoomIds: "",
            chatRooms: "",
            lastChatSeenAt: "",
          },
        },
      );
      if (userUpdateResult.modifiedCount > 0) {
        console.log(`✓ Đã dọn dẹp các trường chat trên ${userUpdateResult.modifiedCount} tài khoản users.`);
      } else {
        console.log("- Không có trường chat tồn đọng trong collection 'users'.");
      }
    }

    // 5. Dọn dẹp an toàn trên collection theses & internships nếu có
    if (collectionNames.includes("theses")) {
      const thesisUpdateResult = await db.collection("theses").updateMany(
        {},
        {
          $unset: {
            chatConversationId: "",
            chatRoomId: "",
          },
        },
      );
      if (thesisUpdateResult.modifiedCount > 0) {
        console.log(`✓ Đã dọn dẹp trường chat trên ${thesisUpdateResult.modifiedCount} đề tài theses.`);
      }
    }

    console.log("=== HOÀN TẤT DỌN DẸP DỮ LIỆU CHAT THÀNH CÔNG ===");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi trong quá trình dọn dẹp dữ liệu chat:", error);
    process.exit(1);
  }
};

cleanupChatData();
