import thesisDocumentService from "../services/thesisDocumentService.js";
import AppError from "../utils/AppError.js";

const getUserId = (req) => req.user?.userId || req.user?._id || req.user?.id;

export const getLecturerSupervisedTheses = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const theses = await thesisDocumentService.getLecturerSupervisedTheses(
      getUserId(req),
      academicTermId,
    );
    res.status(200).json({
      success: true,
      data: theses,
    });
  } catch (error) {
    next(error);
  }
};

export const getLecturerGuides = async (req, res, next) => {
  try {
    const { academicTermId, search, thesisId } = req.query;
    const docs = await thesisDocumentService.getLecturerGuides(getUserId(req), {
      academicTermId,
      search,
      thesisId,
    });
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
    const { description, scope, thesisId, academicTermId } = req.body;
    const file = req.file;

    const doc = await thesisDocumentService.createLecturerGuide({
      userId: getUserId(req),
      file,
      description,
      scope,
      thesisId,
      academicTermId,
    });

    res.status(201).json({
      success: true,
      message: "Tải lên tài liệu khóa luận thành công",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLecturerGuide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await thesisDocumentService.deleteLecturerGuide(id, getUserId(req));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getLecturerSubmissions = async (req, res, next) => {
  try {
    const { academicTermId, search, thesisId } = req.query;
    const submissions = await thesisDocumentService.getLecturerSubmissions(
      getUserId(req),
      {
        academicTermId,
        search,
        thesisId,
      },
    );
    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentGuides = async (req, res, next) => {
  try {
    const { academicTermId, search } = req.query;
    const result = await thesisDocumentService.getStudentGuides(getUserId(req), {
      academicTermId,
      search,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentSubmissions = async (req, res, next) => {
  try {
    const { academicTermId } = req.query;
    const submissions = await thesisDocumentService.getStudentSubmissions(
      getUserId(req),
      { academicTermId },
    );
    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudentSubmission = async (req, res, next) => {
  try {
    const { description } = req.body;
    const file = req.file;

    const doc = await thesisDocumentService.createStudentSubmission({
      userId: getUserId(req),
      file,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Nộp file tài liệu khóa luận thành công",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudentSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await thesisDocumentService.deleteStudentSubmission(
      id,
      getUserId(req),
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  getLecturerSupervisedTheses,
  getLecturerGuides,
  createLecturerGuide,
  deleteLecturerGuide,
  getLecturerSubmissions,
  getStudentGuides,
  getStudentSubmissions,
  createStudentSubmission,
  deleteStudentSubmission,
};
