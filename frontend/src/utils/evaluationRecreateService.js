// Service managing evaluation re-creation requests and TBM evaluation resets
const STORAGE_KEY = 'eval_recreate_requests';
const DELETED_EVALS_KEY = 'tbm_deleted_evaluations';
const NOTIFICATIONS_KEY = 'eval_recreate_notifications';

export const evaluationRecreateService = {
  // Get all re-creation requests
  getAllRequests: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Get request for a specific internship
  getRequestByInternshipId: (internshipId) => {
    if (!internshipId) return null;
    const all = evaluationRecreateService.getAllRequests();
    return all.find((r) => String(r.internshipId) === String(internshipId)) || null;
  },

  // Student creates a re-creation request
  createRequest: ({
    internshipId,
    studentId,
    studentCode,
    studentName,
    className,
    companyName,
    position,
    termName,
    score,
    evaluationDate,
    reason,
  }) => {
    const all = evaluationRecreateService.getAllRequests();
    // Filter out previous requests for this internship
    const filtered = all.filter((r) => String(r.internshipId) !== String(internshipId));

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newReq = {
      _id: reqId,
      internshipId,
      studentId,
      studentCode: studentCode || '—',
      studentName: studentName || 'Sinh viên',
      className: className || '—',
      companyName: companyName || 'Doanh nghiệp',
      position: position || 'Thực tập sinh',
      termName: termName || 'Học kỳ hiện tại',
      score: score !== undefined && score !== null ? Number(score) : null,
      evaluationDate: evaluationDate || new Date().toISOString(),
      reason: reason.trim(),
      status: 'PENDING', // PENDING | APPROVED | REJECTED
      createdAt: new Date().toISOString(),
    };

    filtered.unshift(newReq);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // Create Notification for TBM in system
    try {
      const noti = {
        _id: `noti_recreate_${reqId}`,
        recipientRole: 'TBM',
        title: 'Yêu cầu tạo lại link đánh giá',
        message: `Sinh viên ${studentName || 'Sinh viên'} (${studentCode || '—'}) đã gửi yêu cầu tạo lại link đánh giá TTDN tại doanh nghiệp ${companyName || 'Doanh nghiệp'}.`,
        type: 'EVALUATION_RECREATE',
        referenceId: reqId,
        referenceModel: 'CompanyEvaluationRequest',
        link: '/tbm/evaluations',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      const existingNotis = evaluationRecreateService.getTbmNotifications();
      const updatedNotis = [noti, ...existingNotis.filter((n) => n.referenceId !== reqId)];
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotis));
    } catch {
      // ignore
    }

    return newReq;
  },

  // TBM approves request
  approveRequest: (requestId) => {
    const all = evaluationRecreateService.getAllRequests();
    let updatedItem = null;
    const updated = all.map((r) => {
      if (r._id === requestId) {
        updatedItem = {
          ...r,
          status: 'APPROVED',
          approvedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return r;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updatedItem;
  },

  // TBM rejects request
  rejectRequest: (requestId, rejectReason) => {
    const all = evaluationRecreateService.getAllRequests();
    let updatedItem = null;
    const updated = all.map((r) => {
      if (r._id === requestId) {
        updatedItem = {
          ...r,
          status: 'REJECTED',
          rejectReason: (rejectReason || '').trim() || 'Trưởng Bộ Môn không chấp thuận yêu cầu tạo lại link.',
          rejectedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return r;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updatedItem;
  },

  // TBM Deletes / Resets an evaluation result
  deleteEvaluation: (internshipId) => {
    if (!internshipId) return;
    try {
      const data = localStorage.getItem(DELETED_EVALS_KEY);
      const list = data ? JSON.parse(data) : [];
      if (!list.includes(String(internshipId))) {
        list.push(String(internshipId));
        localStorage.setItem(DELETED_EVALS_KEY, JSON.stringify(list));
      }
      // Also update any approved re-creation requests so student can create new link
      const allReqs = evaluationRecreateService.getAllRequests();
      const updatedReqs = allReqs.map((r) => {
        if (String(r.internshipId) === String(internshipId)) {
          return { ...r, status: 'APPROVED', approvedAt: new Date().toISOString() };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReqs));
    } catch {
      // ignore
    }
  },

  // Check if an evaluation was deleted
  isEvaluationDeleted: (internshipId) => {
    if (!internshipId) return false;
    try {
      const data = localStorage.getItem(DELETED_EVALS_KEY);
      const list = data ? JSON.parse(data) : [];
      return list.includes(String(internshipId));
    } catch {
      return false;
    }
  },

  // TBM Notifications for Re-creation requests
  getTbmNotifications: () => {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getUnreadTbmCount: () => {
    const list = evaluationRecreateService.getTbmNotifications();
    return list.filter((n) => !n.isRead).length;
  },

  markNotificationAsRead: (id) => {
    try {
      const list = evaluationRecreateService.getTbmNotifications();
      const updated = list.map((n) => (n._id === id ? { ...n, isRead: true } : n));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  markAllNotificationsAsRead: () => {
    try {
      const list = evaluationRecreateService.getTbmNotifications();
      const updated = list.map((n) => ({ ...n, isRead: true }));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },
};

export default evaluationRecreateService;
