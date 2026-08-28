import Company from "../models/Company.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Internship from "../models/Internship.js";
import AppError from "../utils/AppError.js";

// ====================
// Get All Companies with Search, Filter & Pagination
// ====================
const getAllCompanies = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const companyQuery = {};

  if (status) {
    companyQuery.status = status.toUpperCase();
  }

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    companyQuery.$or = [
      { name: searchRegex },
      { code: searchRegex },
      { email: searchRegex },
      { contactPerson: searchRegex },
      { contactEmail: searchRegex },
    ];
  }

  const [companies, total] = await Promise.all([
    Company.find(companyQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Company.countDocuments(companyQuery),
  ]);

  // Compute active interns count for each company
  const companiesWithCounts = await Promise.all(
    companies.map(async (comp) => {
      const activeInternsCount = await Internship.countDocuments({
        companyId: comp._id,
        status: { $in: ["APPROVED", "INTERNING"] },
      });
      const totalInternsCount = await Internship.countDocuments({
        companyId: comp._id,
      });

      return {
        ...comp,
        activeInternsCount,
        totalInternsCount,
      };
    }),
  );

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    companies: companiesWithCounts,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// ====================
// Get Company By ID
// ====================
const getCompanyById = async (id) => {
  const company = await Company.findById(id);

  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  // Fetch linked internships
  const internships = await Internship.find({ companyId: company._id })
    .populate({
      path: "studentId",
      select: "studentCode className userId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "lecturerId",
      select: "lecturerCode academicTitle userId",
      populate: { path: "userId", select: "fullName email" },
    })
    .lean();

  return {
    ...company.toObject(),
    internships,
    totalInternshipsCount: internships.length,
  };
};

// ====================
// Create Company
// ====================
const createCompany = async ({
  name,
  code,
  address,
  email,
  phone,
  website,
  contactPerson,
  contactEmail,
  description,
  status = "ACTIVE",
}) => {
  if (!name || !address) {
    throw new AppError("Tên công ty và địa chỉ là bắt buộc", 400);
  }

  const trimmedName = name.trim();
  const trimmedCode = code ? code.trim().toUpperCase() : null;

  // Check code uniqueness if provided
  if (trimmedCode) {
    const existingCompany = await Company.findOne({ code: trimmedCode });
    if (existingCompany) {
      throw new AppError("Mã công ty này đã tồn tại", 409);
    }
  }

  let userId = null;
  const companyEmail = email ? email.trim().toLowerCase() : (contactEmail ? contactEmail.trim().toLowerCase() : null);

  if (companyEmail) {
    const existingUser = await User.findOne({ email: companyEmail });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash("1111", 12);
      const user = await User.create({
        fullName: trimmedName,
        email: companyEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : null,
        role: "COMPANY",
        isActive: status !== "INACTIVE",
      });
      userId = user._id;
    } else {
      userId = existingUser._id;
    }
  }

  const company = await Company.create({
    userId,
    name: trimmedName,
    code: trimmedCode,
    address: address.trim(),
    email: email ? email.trim().toLowerCase() : null,
    phone: phone ? phone.trim() : null,
    website: website ? website.trim() : null,
    contactPerson: contactPerson ? contactPerson.trim() : null,
    contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
    description: description ? description.trim() : null,
    status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  });

  return company;
};

// ====================
// Update Company
// ====================
const updateCompany = async (id, updateData) => {
  const company = await Company.findById(id);
  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  const {
    name,
    code,
    address,
    email,
    phone,
    website,
    contactPerson,
    contactEmail,
    description,
    status,
  } = updateData;

  // Check code uniqueness if changed
  if (code && code.trim().toUpperCase() !== company.code) {
    const existingCompany = await Company.findOne({
      code: code.trim().toUpperCase(),
      _id: { $ne: company._id },
    });
    if (existingCompany) {
      throw new AppError("Mã công ty này đã được sử dụng", 409);
    }
    company.code = code.trim().toUpperCase();
  }

  if (name !== undefined) company.name = name.trim();
  if (address !== undefined) company.address = address.trim();
  if (email !== undefined) company.email = email ? email.trim().toLowerCase() : null;
  if (phone !== undefined) company.phone = phone ? phone.trim() : null;
  if (website !== undefined) company.website = website ? website.trim() : null;
  if (contactPerson !== undefined) company.contactPerson = contactPerson ? contactPerson.trim() : null;
  if (contactEmail !== undefined) company.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;
  if (description !== undefined) company.description = description ? description.trim() : null;
  if (status !== undefined) company.status = status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  await company.save();

  return company;
};

// ====================
// Delete Company (Safety Check)
// ====================
const deleteCompany = async (id) => {
  const company = await Company.findById(id);
  if (!company) {
    throw new AppError("Không tìm thấy thông tin doanh nghiệp", 404);
  }

  const internshipCount = await Internship.countDocuments({
    companyId: company._id,
  });

  if (internshipCount > 0) {
    throw new AppError(
      `Không thể xóa doanh nghiệp vì đang có ${internshipCount} hồ sơ thực tập liên kết. Vui lòng chuyển trạng thái sang INACTIVE.`,
      400,
    );
  }

  await Company.findByIdAndDelete(id);

  return { message: "Xóa doanh nghiệp thành công" };
};

export default {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};
