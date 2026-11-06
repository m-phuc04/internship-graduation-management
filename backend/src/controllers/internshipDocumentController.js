import internshipDocumentService from "../services/internshipDocumentService.js";

// ==========================================
// 1. Phía Trưởng Bộ Môn (TBM / Quản trị)
// ==========================================

export const getDocuments = async (req, res, next) => {
  try {
    const { academicTermId, search } = req.query;
    const documents = await internshipDocumentService.getAllDocuments({
      academicTermId,
      search,
    });
    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

export const createDocument = async (req, res, next) => {
  try {
    const { title, description, academicTermId } = req.body;
    const document = await internshipDocumentService.createDocument({
      file: req.file,
      title,
      description,
      academicTermId: academicTermId || null,
      userId: req.user?._id || null,
    });
    res.status(201).json({
      success: true,
      message: "Tải lên tài liệu thực tập thành công",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await internshipDocumentService.deleteDocument(
      id,
      req.user?._id,
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. Phía Giảng viên Giám sát (GVGS)
// ==========================================

export const getLecturerSupervisedInternships = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const list = await internshipDocumentService.getLecturerSupervisedInternships(
      req.user?._id,
      academicTermId,
    );
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

export const getLecturerGuides = async (req, res, next) => {
  try {
    const { academicTermId, search, internshipId } = req.query;
    const docs = await internshipDocumentService.getLecturerGuides(
      req.user?._id,
      {
        academicTermId,
        search,
        internshipId,
      },
    );
    res.status(200).json({
      success: true,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

export const createLecturerGuide = async (req, res, next) => {
  try {
    const { title, description, scope, internshipId, category, academicTermId } = req.body;
    const doc = await internshipDocumentService.createLecturerGuide({
      userId: req.user?._id,
      file: req.file,
      title,
      description,
      scope,
      internshipId,
      category,
      academicTermId,
    });
    res.status(201).json({
      success: true,
      message: "Tải lên tài liệu hướng dẫn thực tập thành công",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLecturerGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, scope, internshipId, category } = req.body;
    const doc = await internshipDocumentService.updateLecturerGuide(
      id,
      req.user?._id,
      {
        title,
        description,
        scope,
        internshipId,
        category,
        file: req.file,
      },
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật tài liệu hướng dẫn thành công",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLecturerGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await internshipDocumentService.deleteLecturerGuide(
      id,
      req.user?._id,
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getLecturerSubmissions = async (req, res, next) => {
  try {
    const { academicTermId, search, internshipId } = req.query;
    const result = await internshipDocumentService.getLecturerSubmissions(
      req.user?._id,
      {
        academicTermId,
        search,
        internshipId,
      },
    );
    res.status(200).json({
      success: true,
      data: result.submissions,
      stats: result.stats,
      studentsStatus: result.studentsStatus,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. Phía Sinh viên (Student)
// ==========================================

export const getStudentGuides = async (req, res, next) => {
  try {
    const { academicTermId, search } = req.query;
    const data = await internshipDocumentService.getStudentGuides(
      req.user?._id,
      {
        academicTermId,
        search,
      },
    );
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentSubmissions = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const docs = await internshipDocumentService.getStudentSubmissions(
      req.user?._id,
      {
        academicTermId,
      },
    );
    res.status(200).json({
      success: true,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudentSubmission = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const doc = await internshipDocumentService.createStudentSubmission({
      userId: req.user?._id,
      file: req.file,
      title,
      description,
      category,
    });
    res.status(201).json({
      success: true,
      message: "Nộp file tài liệu thực tập thành công",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudentSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await internshipDocumentService.deleteStudentSubmission(
      id,
      req.user?._id,
    );
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDocuments,
  createDocument,
  deleteDocument,
  getLecturerSupervisedInternships,
  getLecturerGuides,
  createLecturerGuide,
  updateLecturerGuide,
  deleteLecturerGuide,
  getLecturerSubmissions,
  getStudentGuides,
  getStudentSubmissions,
  createStudentSubmission,
  deleteStudentSubmission,
};
