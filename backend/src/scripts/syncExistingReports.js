import connectDatabase from "../config/database.js";
import Internship from "../models/Internship.js";
import InternshipDocument from "../models/InternshipDocument.js";
import InternshipReport from "../models/InternshipReport.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";

const syncExistingReports = async () => {
  try {
    await connectDatabase();
    console.log("=== BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU BÁO CÁO THỰC TẬP TTDN ===");

    // 1. Đồng bộ từ InternshipDocument sang Internship.reportFile (Ví dụ: Trần Thị Bích)
    const reportDocs = await InternshipDocument.find({
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    }).sort({ createdAt: -1 });

    console.log(`Tìm thấy ${reportDocs.length} tài liệu nộp loại Báo cáo thực tập trong InternshipDocument.`);

    let syncedFromDocsCount = 0;
    for (const doc of reportDocs) {
      if (!doc.internshipId && !doc.studentId) continue;

      let internship = null;
      if (doc.internshipId) {
        internship = await Internship.findById(doc.internshipId);
      }
      if (!internship && doc.studentId) {
        internship = await Internship.findOne({
          $or: [{ studentId: doc.studentId }, { secondStudentId: doc.studentId }],
          status: { $ne: "CANCELLED" },
        }).sort({ createdAt: -1 });
      }

      if (internship) {
        let needsUpdate = false;
        if (!internship.reportFile || !internship.reportFile.fileUrl) {
          internship.reportFile = {
            originalName: doc.title || doc.fileName,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize || 0,
            fileType: doc.fileType || null,
            uploadedAt: doc.createdAt || new Date(),
          };
          needsUpdate = true;
        }

        if (!doc.internshipId) {
          doc.internshipId = internship._id;
          await doc.save();
        }

        if (needsUpdate) {
          await internship.save();
          syncedFromDocsCount++;

          // Đồng bộ InternshipReport FINAL
          let finalReport = await InternshipReport.findOne({
            internshipId: internship._id,
            reportType: "FINAL",
          });
          if (finalReport) {
            finalReport.file = {
              originalName: doc.title || doc.fileName,
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              mimeType: doc.fileType || "application/octet-stream",
              size: doc.fileSize || 0,
              uploadedAt: doc.createdAt || new Date(),
            };
            finalReport.status = "SUBMITTED";
            finalReport.submittedAt = doc.createdAt || new Date();
            await finalReport.save();
          } else {
            await InternshipReport.create({
              internshipId: internship._id,
              studentId: doc.studentId || internship.studentId,
              reportType: "FINAL",
              title: "Báo cáo thực tập doanh nghiệp (Bản chính thức)",
              content: "File báo cáo tổng kết thực tập doanh nghiệp đã nộp bởi sinh viên",
              file: {
                originalName: doc.title || doc.fileName,
                fileName: doc.fileName,
                fileUrl: doc.fileUrl,
                mimeType: doc.fileType || "application/octet-stream",
                size: doc.fileSize || 0,
                uploadedAt: doc.createdAt || new Date(),
              },
              status: "SUBMITTED",
              submittedAt: doc.createdAt || new Date(),
            });
          }
          console.log(`✓ Đã đồng bộ reportFile cho hồ sơ Internship ID: ${internship._id} từ Doc: ${doc.fileName}`);
        }
      }
    }

    // 2. Đồng bộ từ Internship.reportFile sang InternshipDocument (Ví dụ: Nguyễn Văn An)
    const internshipsWithFile = await Internship.find({
      "reportFile.fileUrl": { $exists: true, $ne: null },
    }).populate("studentId");

    console.log(`Tìm thấy ${internshipsWithFile.length} hồ sơ có reportFile trong Internship.`);

    let syncedToDocsCount = 0;
    for (const item of internshipsWithFile) {
      if (!item.reportFile?.fileUrl) continue;

      const existingDoc = await InternshipDocument.findOne({
        internshipId: item._id,
        documentType: "SUBMISSION",
        category: { $regex: /báo cáo/i },
      });

      if (!existingDoc) {
        await InternshipDocument.create({
          academicTermId: item.academicTermId || null,
          supervisorId: item.lecturerId || null,
          internshipId: item._id,
          studentId: item.studentId?._id || item.studentId,
          documentType: "SUBMISSION",
          scope: "SPECIFIC",
          title: item.reportFile.originalName || "Báo cáo thực tập",
          fileName: item.reportFile.fileName || item.reportFile.originalName || "bao_cao_thuc_tap.docx",
          fileUrl: item.reportFile.fileUrl,
          fileSize: item.reportFile.fileSize || 0,
          fileType: item.reportFile.fileType || "application/octet-stream",
          category: "Báo cáo thực tập",
          description: "File báo cáo thực tập đồng bộ từ hồ sơ sinh viên",
          status: "SUBMITTED",
          uploadedBy: item.studentId?.userId || null,
          createdAt: item.reportFile.uploadedAt || new Date(),
        });
        syncedToDocsCount++;
        console.log(`✓ Đã tạo bản ghi InternshipDocument cho hồ sơ Internship ID: ${item._id} (${item.reportFile.fileName})`);
      }
    }

    console.log("==========================================");
    console.log(`ĐỒNG BỘ HOÀN TẤT:`);
    console.log(`- Đã cập nhật reportFile: ${syncedFromDocsCount} hồ sơ`);
    console.log(`- Đã tạo InternshipDocument: ${syncedToDocsCount} bản ghi`);
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi khi đồng bộ dữ liệu báo cáo:", error);
    process.exit(1);
  }
};

syncExistingReports();

