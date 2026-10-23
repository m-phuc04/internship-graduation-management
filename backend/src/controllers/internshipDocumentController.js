import internshipDocumentService from "../services/internshipDocumentService.js";

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
    const { description, academicTermId } = req.body;
    const document = await internshipDocumentService.createDocument({
      file: req.file,
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

export default {
  getDocuments,
  createDocument,
  deleteDocument,
};

