import React, { useState, useEffect, useCallback, useMemo } from 'react';
import evaluationApi from '../../api/evaluationApi';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import EvaluationDetailModal from '../../components/evaluations/EvaluationDetailModal';

import {
  Award,
  Building2,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  CheckSquare,
  Square,
  AlertCircle,
  Users,
  Check,
  X,
  Eye,
  EyeOff,
  Lock,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

const EVAL_STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PUBLISHED', label: 'Đã công bố điểm' },
  { value: 'HIDDEN', label: 'Đã ẩn điểm' },
  { value: 'UNPUBLISHED', label: 'Chưa công bố điểm' },
  { value: 'SUBMITTED', label: 'Đã có điểm' },
  { value: 'UNASSESSED', label: 'Chưa có điểm' },
];

const TbmEvaluationManagement = () => {
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const isTermActive = currentTerm?.status === 'ACTIVE';

  // Trạng thái danh sách đánh giá
  const [evaluations, setEvaluations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal chi tiết
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Modal xử lýs

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [targetInternship, setTargetInternship] = useState(null);
  const [deleteEvalModalOpen, setDeleteEvalModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal xử lý: Publish All Scores
  const [publishAllModalOpen, setPublishAllModalOpen] = useState(false);
  const [allTermInternships, setAllTermInternships] = useState([]);
  const [loadingAllInternships, setLoadingAllInternships] = useState(false);
  const [selectedPublishIds, setSelectedPublishIds] = useState([]);
  const [publishing, setPublishing] = useState(false);

  // Modal xử lý: Hide Single Score
  const [hideSingleModalOpen, setHideSingleModalOpen] = useState(false);
  const [targetHideItem, setTargetHideItem] = useState(null);
  const [hideReason, setHideReason] = useState('');

  // Modal xử lý: Republish Single Score
  const [republishSingleModalOpen, setRepublishSingleModalOpen] = useState(false);
  const [targetRepublishItem, setTargetRepublishItem] = useState(null);
  const [republishReason, setRepublishReason] = useState('');

  // Modal xử lý: Hide Bulk Scores
  const [hideBulkModalOpen, setHideBulkModalOpen] = useState(false);
  const [selectedHideIds, setSelectedHideIds] = useState([]);
  const [hideBulkReason, setHideBulkReason] = useState('');
  const [hideBulkSearch, setHideBulkSearch] = useState('');
  const [hiding, setHiding] = useState(false);

  const { showToast } = useToast();

  const handleOpenComplete = (intern) => {
    setTargetInternship(intern);
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!targetInternship) return;
    setActionLoading(true);
    try {
      const res = await internshipApi.complete(targetInternship._id);
      if (res?.success || res?.status === 200 || !res?.error) {
        showToast('Đã hoàn tất đánh giá thực tập và khóa phiếu thành công!', 'success');
        setCompleteModalOpen(false);
        setEvaluations((prev) =>
          prev.map((it) =>
            String(it._id) === String(targetInternship._id)
              ? {
                  ...it,
                  status: 'COMPLETED',
                  evaluation: {
                    ...(it.evaluation || {}),
                    status: 'CONFIRMED',
                  },
                }
              : it
          )
        );
        setTargetInternship(null);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Không thể hoàn tất phiếu đánh giá', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      let filterStatus = status;

      let res = await evaluationApi.getForTbm({
        page,
        limit: 10,
        search,
        status: filterStatus,
        academicTermId: currentTerm?._id || '',
      });

      if ((!res?.success || !res?.data?.length) && currentTerm?._id && !search && !filterStatus) {
        const fallbackRes = await evaluationApi.getForTbm({
          page,
          limit: 10,
          search,
          status: filterStatus,
        });
        if (fallbackRes?.success && fallbackRes?.data?.length) {
          res = fallbackRes;
        }
      }

      if (res?.success) {
        let list = res.data || [];
        if (status === 'PUBLISHED') {
          list = list.filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished));
        } else if (status === 'HIDDEN') {
          list = list.filter((it) => it.scorePublishStatus === 'HIDDEN');
        } else if (status === 'UNPUBLISHED') {
          list = list.filter((it) => it.scorePublishStatus === 'UNPUBLISHED' || (!it.isScorePublished && it.scorePublishStatus !== 'HIDDEN'));
        }
        setEvaluations(list);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách phiếu đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  // Mở modal công bố điểm hàng loạt
  const handleOpenPublishAllModal = async () => {
    setPublishAllModalOpen(true);
    setLoadingAllInternships(true);
    try {
      const res = await evaluationApi.getForTbm({
        page: 1,
        limit: 1000,
        academicTermId: currentTerm?._id || '',
      });

      let list = [];
      if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else {
        list = evaluations;
      }

      setAllTermInternships(list);

      // Tự động chọn tất cả sinh viên đã có điểm hợp lệ
      const validIds = list
        .filter((it) => {
          const hasScore = Boolean(
            it.evaluation?.score !== undefined &&
            it.evaluation?.score !== null &&
            !isNaN(it.evaluation?.score)
          );
          return hasScore;
        })
        .map((it) => it._id);

      setSelectedPublishIds(validIds);
    } catch (err) {
      console.error('Failed to load all internships for publish modal:', err);
      setAllTermInternships(evaluations);
      const validIds = evaluations
        .filter((it) => it.evaluation?.score !== undefined && it.evaluation?.score !== null)
        .map((it) => it._id);
      setSelectedPublishIds(validIds);
    } finally {
      setLoadingAllInternships(false);
    }
  };

  // Danh sách sắp xếp cho modal công bố hàng loạt:
  // Đủ điều kiện (đã có điểm hợp lệ) hiển thị ở TRÊN
  // Chưa đủ điều kiện (chưa có điểm) ở DƯỚI (vô hiệu hóa / màu xám)
  const sortedBulkList = useMemo(() => {
    const list = [...allTermInternships];
    return list.sort((a, b) => {
      const aHasScore = Boolean(
        a.evaluation?.score !== undefined && a.evaluation?.score !== null && !isNaN(a.evaluation?.score)
      );
      const bHasScore = Boolean(
        b.evaluation?.score !== undefined && b.evaluation?.score !== null && !isNaN(b.evaluation?.score)
      );

      if (aHasScore && !bHasScore) return -1;
      if (!aHasScore && bHasScore) return 1;

      // Nếu cả hai đều có điểm, hồ sơ chưa công bố sẽ hiển thị trước
      if (aHasScore && bHasScore) {
        if (!a.isScorePublished && b.isScorePublished) return -1;
        if (a.isScorePublished && !b.isScorePublished) return 1;
      }

      return 0;
    });
  }, [allTermInternships]);

  const eligibleCount = useMemo(() => {
    return allTermInternships.filter((it) => {
      return (
        it.evaluation?.score !== undefined &&
        it.evaluation?.score !== null &&
        !isNaN(it.evaluation?.score)
      );
    }).length;
  }, [allTermInternships]);

  const ineligibleCount = useMemo(() => {
    return allTermInternships.length - eligibleCount;
  }, [allTermInternships, eligibleCount]);

  const toggleSelectPublish = (id, hasScore) => {
    if (!hasScore) return; // Do not allow interaction
    setSelectedPublishIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllEligible = () => {
    const allEligibleIds = allTermInternships
      .filter((it) => it.evaluation?.score !== undefined && it.evaluation?.score !== null)
      .map((it) => it._id);

    if (selectedPublishIds.length === allEligibleIds.length) {
      setSelectedPublishIds([]);
    } else {
      setSelectedPublishIds(allEligibleIds);
    }
  };

  const handleConfirmBulkPublish = async () => {
    if (selectedPublishIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một sinh viên đủ điều kiện để công bố điểm.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const res = await evaluationApi.tbmPublishScoresBulk({
        internshipIds: selectedPublishIds,
      });

      if (res?.success || res?.status === 200) {
        const pubCount = res?.data?.publishedCount ?? selectedPublishIds.length;
        const skipCount = res?.data?.skippedCount ?? 0;
        let successMsg = `Đã công bố điểm cho ${pubCount} sinh viên đủ điều kiện thành công!`;
        if (skipCount > 0) {
          successMsg += ` (Bỏ qua ${skipCount} sinh viên chưa có điểm)`;
        }
        showToast(successMsg, 'success');
        setPublishAllModalOpen(false);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi công bố điểm hàng loạt', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Xử lý ẩn điểm cho từng sinh viên
  const handleOpenHideSingle = (item) => {
    setTargetHideItem(item);
    setHideReason('');
    setHideSingleModalOpen(true);
  };

  const handleConfirmHideSingle = async () => {
    if (!targetHideItem) return;
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmHideScore(targetHideItem._id, {
        reason: hideReason.trim(),
      });
      if (res?.success || res?.status === 200) {
        showToast('Đã ẩn điểm đánh giá thành công! Điểm không còn hiển thị với sinh viên.', 'success');
        setHideSingleModalOpen(false);
        setTargetHideItem(null);
        setHideReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể ẩn điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý công bố lại điểm cho từng sinh viên
  const handleOpenRepublishSingle = (item) => {
    setTargetRepublishItem(item);
    setRepublishReason('');
    setRepublishSingleModalOpen(true);
  };

  const handleConfirmRepublishSingle = async () => {
    if (!targetRepublishItem) return;
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmRepublishScore(targetRepublishItem._id, {
        reason: republishReason.trim(),
      });
      if (res?.success || res?.status === 200) {
        showToast('Đã công bố lại điểm thành công!', 'success');
        setRepublishSingleModalOpen(false);
        setTargetRepublishItem(null);
        setRepublishReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể công bố lại điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý công bố điểm cho từng sinh viên
  const handlePublishSingle = async (item) => {
    setActionLoading(true);
    try {
      const res = await evaluationApi.tbmPublishScore(item._id);
      if (res?.success || res?.status === 200) {
        showToast('Công bố điểm thành công!', 'success');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể công bố điểm', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý ẩn điểm hàng loạt
  const handleOpenHideBulkModal = async () => {
    setHideBulkModalOpen(true);
    setLoadingAllInternships(true);
    setHideBulkReason('');
    setHideBulkSearch('');
    try {
      const res = await evaluationApi.getForTbm({
        page: 1,
        limit: 1000,
        academicTermId: currentTerm?._id || '',
      });

      let list = [];
      if (res?.success && Array.isArray(res.data)) {
        list = res.data;
      } else {
        list = evaluations;
      }

      setAllTermInternships(list);

      const publishedIds = list
        .filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished))
        .map((it) => it._id);

      setSelectedHideIds(publishedIds);
    } catch (err) {
      console.error('Failed to load published internships for hide modal:', err);
      setAllTermInternships(evaluations);
      const publishedIds = evaluations
        .filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished))
        .map((it) => it._id);
      setSelectedHideIds(publishedIds);
    } finally {
      setLoadingAllInternships(false);
    }
  };

  const handleConfirmBulkHide = async () => {
    if (selectedHideIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một sinh viên để ẩn điểm.', 'error');
      return;
    }

    setHiding(true);
    try {
      const res = await evaluationApi.tbmHideScoresBulk({
        internshipIds: selectedHideIds,
        reason: hideBulkReason.trim(),
      });

      if (res?.success || res?.status === 200) {
        const hCount = res?.data?.hiddenCount ?? selectedHideIds.length;
        showToast(`Đã ẩn điểm của ${hCount} sinh viên thành công!`, 'success');
        setHideBulkModalOpen(false);
        setSelectedHideIds([]);
        setHideBulkReason('');
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi ẩn điểm hàng loạt', 'error');
    } finally {
      setHiding(false);
    }
  };

  const toggleSelectHide = (id) => {
    setSelectedHideIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const publishedBulkList = useMemo(() => {
    return allTermInternships.filter(
      (it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished)
    );
  }, [allTermInternships]);

  const filteredHideBulkList = useMemo(() => {
    if (!hideBulkSearch.trim()) return publishedBulkList;
    const q = hideBulkSearch.toLowerCase().trim();
    return publishedBulkList.filter((item) => {
      const studentName = (item.studentId?.userId?.fullName || '').toLowerCase();
      const studentCode = (item.studentId?.studentCode || '').toLowerCase();
      const companyName = (item.companyId?.name || '').toLowerCase();
      return (
        studentName.includes(q) ||
        studentCode.includes(q) ||
        companyName.includes(q)
      );
    });
  }, [publishedBulkList, hideBulkSearch]);

  const toggleSelectAllHide = () => {
    const currentIds = filteredHideBulkList.map((it) => it._id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedHideIds.includes(id));
    if (allSelected) {
      setSelectedHideIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setSelectedHideIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const [exportingData, setExportingData] = useState(false);

  const handleExportEvaluations = async () => {
    if (!evaluations || evaluations.length === 0) {
      showToast('Không có dữ liệu đánh giá phù hợp để xuất file', 'info');
      return;
    }

    try {
      setExportingData(true);
      let listToExport = evaluations;

      if (pagination?.total && pagination.total > evaluations.length) {
        try {
          const res = await evaluationApi.getForTbm({
            page: 1,
            limit: pagination.total,
            search,
            status,
            academicTermId: currentTerm?._id || '',
          });
          if (res?.success && res.data) {
            let list = res.data || [];
            if (status === 'PUBLISHED') {
              list = list.filter((it) => it.scorePublishStatus === 'PUBLISHED' || (!it.scorePublishStatus && it.isScorePublished));
            } else if (status === 'HIDDEN') {
              list = list.filter((it) => it.scorePublishStatus === 'HIDDEN');
            } else if (status === 'UNPUBLISHED') {
              list = list.filter((it) => it.scorePublishStatus === 'UNPUBLISHED' || (!it.isScorePublished && it.scorePublishStatus !== 'HIDDEN'));
            }
            if (list.length > 0) listToExport = list;
          }
        } catch {
          listToExport = evaluations;
        }
      }

      const termCode = currentTerm?.code ? currentTerm.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'HocKy';
      const termName = currentTerm?.name ? `${currentTerm.name} - ${currentTerm.academicYear || ''}` : '';
      const statusLabel = EVAL_STATUS_FILTERS.find((o) => o.value === status)?.label || 'Tất cả trạng thái';

      const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };

      let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th { background-color: #123891; color: #ffffff; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11pt; }
            td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; vertical-align: middle; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .header-title { font-size: 14pt; font-weight: bold; color: #123891; text-align: center; }
            .header-sub { font-size: 11pt; text-align: center; color: #475569; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="10" class="header-title">BẢNG TỔNG HỢP ĐÁNH GIÁ THỰC TẬP DOANH NGHIỆP (TTDN)</td></tr>
            ${termName ? `<tr><td colspan="10" class="header-sub">Học kỳ: ${escapeHtml(termName)}</td></tr>` : ''}
            <tr><td colspan="10" class="header-sub">Bộ lọc trạng thái: ${escapeHtml(statusLabel)}${search ? ` | Từ khóa tìm kiếm: "${escapeHtml(search.trim())}"` : ''} (Số lượng: ${listToExport.length} sinh viên)</td></tr>
            <tr><td colspan="10"></td></tr>
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th style="width: 120px;">MSSV</th>
                <th style="width: 220px;">Họ và tên sinh viên</th>
                <th style="width: 120px;">Lớp</th>
                <th style="width: 260px;">Doanh nghiệp tiếp nhận</th>
                <th style="width: 180px;">Vị trí thực tập</th>
                <th style="width: 200px;">Giảng viên giám sát</th>
                <th style="width: 110px;">Điểm số</th>
                <th style="width: 120px;">Kết quả</th>
                <th style="width: 160px;">Trạng thái công bố</th>
              </tr>
            </thead>
            <tbody>
      `;

      listToExport.forEach((item, idx) => {
        const studentName = item.studentId?.userId?.fullName || '—';
        const studentCode = item.studentId?.studentCode || '—';
        const className = item.studentId?.className || item.studentId?.class || '—';
        const companyName = item.companyId?.name || item.companyId?.companyName || '—';
        const position = item.position || 'Thực tập sinh';
        const lecturerName = item.lecturerId?.userId?.fullName
          ? `${item.lecturerId?.academicTitle ? item.lecturerId.academicTitle + ' ' : ''}${item.lecturerId.userId.fullName}`
          : 'Chưa phân công';

        const hasValidScore = Boolean(
          item.evaluation?.score !== undefined &&
          item.evaluation?.score !== null &&
          !isNaN(item.evaluation?.score)
        );
        const scoreStr = hasValidScore ? (Number(item.evaluation.score) % 1 === 0 ? Number(item.evaluation.score).toFixed(1) : item.evaluation.score) : 'Chưa có điểm';

        const isItemPass = hasValidScore && Number(item.evaluation.score) >= 4.0;
        const isItemFail = hasValidScore && Number(item.evaluation.score) < 4.0;
        const resultStr = isItemPass ? 'Đạt (PASS)' : isItemFail ? 'Rớt (FAIL)' : 'Đang thực hiện';

        const isHidden = item.scorePublishStatus === 'HIDDEN';
        const isPublished = item.scorePublishStatus === 'PUBLISHED' || (!item.scorePublishStatus && item.isScorePublished);
        const publishStatusStr = isHidden ? 'Đã ẩn' : isPublished ? 'Đã công bố' : 'Chưa công bố';

        tableHtml += `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${escapeHtml(studentCode)}</td>
            <td class="text-left">${escapeHtml(studentName)}</td>
            <td class="text-center">${escapeHtml(className)}</td>
            <td class="text-left">${escapeHtml(companyName)}</td>
            <td class="text-left">${escapeHtml(position)}</td>
            <td class="text-left">${escapeHtml(lecturerName)}</td>
            <td class="text-center">${escapeHtml(scoreStr)}</td>
            <td class="text-center">${escapeHtml(resultStr)}</td>
            <td class="text-center">${escapeHtml(publishStatusStr)}</td>
          </tr>
        `;
      });

      tableHtml += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\uFEFF' + tableHtml], {
        type: 'application/vnd.ms-excel;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_sach_danh_gia_TTDN_${termCode}_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Xuất danh sách đánh giá TTDN thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khi xuất file', 'error');
    } finally {
      setExportingData(false);
    }
  };

  const handleOpenDeleteEvaluation = (item) => {
    setDeleteTarget(item);
    setDeleteEvalModalOpen(true);
  };

  const handleConfirmDeleteEvaluation = async () => {
    if (!deleteTarget) return;

    setActionLoading(true);
    try {
      const evalId = deleteTarget.evaluation?._id || deleteTarget._id;
      const res = await evaluationApi.tbmDeleteEvaluation(evalId);

      if (res?.success || res?.status === 200) {
        setEvaluations((prev) =>
          prev.map((it) => {
            if (String(it._id) === String(deleteTarget._id)) {
              return {
                ...it,
                evaluation: null,
                isScorePublished: false,
                status: it.status === 'COMPLETED' ? 'APPROVED' : it.status,
              };
            }
            return it;
          })
        );

        showToast(res?.message || 'Đã xóa kết quả đánh giá thành công!', 'success');
        setDeleteEvalModalOpen(false);
        setDeleteTarget(null);
        await fetchEvaluations();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Không thể xóa kết quả đánh giá', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Thẻ tiêu đề */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#123891] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tổng hợp Đánh giá Thực tập Doanh nghiệp (TTDN)
            </h1>
          </div>
        </div>

        {/* Nút Công Bố & Ẩn Điểm & Xuất file */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={!isTermActive}
            onClick={handleOpenHideBulkModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isTermActive ? 'Học kỳ đã đóng, không thể thao tác' : 'Mở hộp thoại ẩn điểm các sinh viên đã được công bố điểm'}
          >
            <EyeOff className="w-4 h-4" />
            <span>Ẩn điểm đã công bố</span>
          </button>

          <button
            type="button"
            disabled={!isTermActive}
            onClick={handleOpenPublishAllModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isTermActive ? 'Học kỳ đã đóng, không thể thao tác' : 'Mở hộp thoại công bố điểm cho toàn bộ sinh viên có điểm'}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Công bố điểm tất cả</span>
          </button>

          <button
            type="button"
            onClick={handleExportEvaluations}
            disabled={exportingData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0"
            title="Xuất danh sách đánh giá TTDN ra Excel"
            aria-label="Xuất danh sách"
          >
            <FileSpreadsheet className={`w-4 h-4 shrink-0 ${exportingData ? 'animate-bounce text-[#123891]' : ''}`} />
            <span>Xuất file</span>
          </button>
        </div>
      </div>

      {/* Nội dung chính: Danh sách đánh giá */}
      <div className="space-y-4">
        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="w-full md:w-96">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Tìm theo SV, MSSV, DN tiếp nhận..."
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
            {/* Bộ chọn học kỳ */}
            <select
              value={currentTerm?._id || ''}
              onChange={(e) => {
                if (setCurrentTerm && e.target.value) {
                  setCurrentTerm(e.target.value);
                  setPage(1);
                }
              }}
              className="w-full sm:w-auto min-w-[200px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
            >
              {Array.isArray(terms) &&
                terms.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : '• Đã đóng'}
                  </option>
                ))}
            </select>

            {/* Bộ lọc theo trạng thái */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto min-w-[180px] bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#123891] cursor-pointer"
            >
              {EVAL_STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner thông báo học kỳ đã đóng */}
        {!isTermActive && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Học kỳ đã đóng ({currentTerm?.name || 'Học kỳ cũ'}):</strong> Dữ liệu đánh giá TTDN đã được khóa và chỉ cho phép xem chi tiết. Các thao tác công bố, ẩn điểm và sửa đổi đã bị vô hiệu hóa.
            </span>
          </div>
        )}

        {/* Bảng kết quả đánh giá */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={7} />
            </div>
          ) : evaluations.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Chưa có dữ liệu đánh giá"
              description="Không tìm thấy phiếu đánh giá thực tập nào phù hợp với bộ lọc."
            />
          ) : (<>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-14">STT</th>
                    <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                    <th className="py-3.5 px-4">Doanh nghiệp tiếp nhận</th>
                    <th className="py-3.5 px-4">Giảng viên Giám sát</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Điểm số</th>
                    <th className="py-3.5 px-4 text-center">Kết quả</th>
                    <th className="py-3.5 px-4 text-center">Công bố điểm</th>
                    <th className="py-3.5 px-4 pr-6 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {evaluations.map((item, idx) => {
                    const hasValidScore = Boolean(
                      item.evaluation?.score !== undefined &&
                      item.evaluation?.score !== null &&
                      !isNaN(item.evaluation?.score)
                    );
                    const isItemPass = item.isPass || hasValidScore;
                    const isItemFail = item.isFail && !hasValidScore;
                    const isHidden = item.scorePublishStatus === 'HIDDEN';
                    const isPublished = !isHidden && Boolean(item.scorePublishStatus === 'PUBLISHED' || item.isScorePublished);

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-50/70 transition group"
                      >
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                          {(page - 1) * (pagination?.limit || 10) + idx + 1}
                        </td>

                        {/* Sinh viên */}
                        <td className="py-3.5 px-4 pl-6">
                          <div className="font-bold text-slate-900 group-hover:text-[#102d7d] transition">
                            {item.studentId?.userId?.fullName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {item.studentId?.studentCode} • {item.studentId?.className}
                          </div>
                        </td>

                        {/* Doanh nghiệp */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <div className="font-semibold text-slate-800">
                            {item.companyId?.name || item.companyId?.companyName || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {item.position || 'Thực tập sinh'}
                          </div>
                        </td>

                        {/* Giảng viên giám sát */}
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {item.lecturerId ? (
                            <div>
                              <div className="font-semibold text-[#102d7d]">
                                {item.lecturerId?.academicTitle} {item.lecturerId?.userId?.fullName}
                              </div>
                              
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân công</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Điểm số */}
                        <td className="py-3.5 px-4">
                          {hasValidScore ? (
                            <div className="inline-flex items-baseline gap-1 font-bold text-[#102d7d] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              <span className="text-sm">
                                {Number(item.evaluation.score) % 1 === 0
                                  ? Number(item.evaluation.score).toFixed(1)
                                  : item.evaluation.score}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chưa có điểm</span>
                          )}
                        </td>

                        {/* Kết quả */}
                        <td className="py-3.5 px-4 text-center">
                          {isItemPass ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PASS (Đạt)</span>
                            </span>
                          ) : isItemFail ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              FAIL (Rớt)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Đang thực hiện
                            </span>
                          )}
                        </td>

                        {/* Column: Công Bố Điểm */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isHidden ? (
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 shadow-2xs"
                              title={
                                item.publishHistory?.[item.publishHistory.length - 1]?.reason
                                  ? `Lý do ẩn: ${item.publishHistory[item.publishHistory.length - 1].reason}`
                                  : 'Điểm đã được ẩn'
                              }
                            >
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>Đã ẩn</span>
                            </span>
                          ) : isPublished ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã công bố</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
                              <span>Chưa công bố</span>
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Nút Xem chi tiết (luôn hiển thị) */}
                            <button
                              type="button"
                              onClick={() => {
                                setDetailItem(item);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-[#123891] rounded-lg transition cursor-pointer"
                              title="Xem chi tiết phiếu đánh giá"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Các thao tác khác chỉ cho phép khi học kỳ đang mở (isTermActive) */}
                            {isTermActive ? (
                              <>
                                {/* Ẩn điểm đã công bố */}
                                {isPublished && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHideSingle(item)}
                                    className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                    title="Ẩn điểm đã công bố của sinh viên này"
                                  >
                                    <EyeOff className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Công bố lại điểm (cho sinh viên Đã ẩn) */}
                                {isHidden && hasValidScore && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRepublishSingle(item)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                    title="Công bố lại điểm cho sinh viên này"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Công bố điểm lần đầu */}
                                {!isPublished && !isHidden && hasValidScore && (
                                  <button
                                    type="button"
                                    onClick={() => handlePublishSingle(item)}
                                    className="p-1.5 text-blue-600 hover:text-[#102d7d] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                    title="Công bố điểm cho sinh viên này"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}

                                {hasValidScore && item.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenComplete(item)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                    title="Hoàn tất và khóa kết quả"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}

                                {hasValidScore && item.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteEvaluation(item)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                    title="Xóa kết quả đánh giá"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="p-1 text-slate-300" title="Học kỳ đã đóng - Chỉ xem chi tiết">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Danh sách thẻ Mobile (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {evaluations.map((item, idx) => {
                const hasValidScore = Boolean(
                  item.evaluation?.score !== undefined &&
                  item.evaluation?.score !== null &&
                  !isNaN(item.evaluation?.score)
                );
                const isItemPass = item.isPass || hasValidScore;
                const isItemFail = item.isFail && !hasValidScore;
                const isHidden = item.scorePublishStatus === 'HIDDEN';
                const isPublished = !isHidden && Boolean(item.scorePublishStatus === 'PUBLISHED' || item.isScorePublished);

                return (
                  <div
                    key={item._id}
                    className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition"
                  >
                    {/* Đầu thẻ: STT + Tên sinh viên + Huy hiệu kết quả thống nhất */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-mono text-slate-400 font-bold">#{(page - 1) * 10 + idx + 1}</span>
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {item.studentId?.userId?.fullName || 'Chưa cập nhật'}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          MSSV: {item.studentId?.studentCode} • {item.studentId?.className || ''}
                        </div>
                      </div>

                      {/* Single Unified Result Badge: PASS (Đạt) / FAIL (Rớt) / Đang thực hiện */}
                      {isItemPass ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>PASS (Đạt)</span>
                        </span>
                      ) : isItemFail ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                          FAIL (Rớt)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          Đang thực hiện
                        </span>
                      )}
                    </div>

                    {/* Doanh nghiệp & Vị trí thực tập */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.companyId?.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Vị trí: {item.position}
                      </div>
                    </div>

                    {/* Điểm tổng kết */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Điểm tổng kết</span>
                      {hasValidScore ? (
                        <div className="inline-flex items-baseline gap-1 font-bold text-[#102d7d]">
                          <span className="text-sm font-mono">
                            {Number(item.evaluation.score) % 1 === 0
                              ? Number(item.evaluation.score).toFixed(1)
                              : item.evaluation.score}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">/ 10</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa có điểm</span>
                      )}
                    </div>

                    {/* Huy hiệu trạng thái công bố & Các thao tác */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <div>
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã công bố</span>
                          </span>
                        ) : isHidden ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            <span>Đang ẩn</span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 italic">Chưa công bố</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailItem(item);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết phiếu đánh giá"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isTermActive ? (
                          <>
                            {isPublished && (
                              <button
                                type="button"
                                onClick={() => handleOpenHideSingle(item)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                title="Ẩn điểm"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}

                            {isHidden && hasValidScore && (
                              <button
                                type="button"
                                onClick={() => handleOpenRepublishSingle(item)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Công bố lại"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {!isPublished && !isHidden && hasValidScore && (
                              <button
                                type="button"
                                onClick={() => handlePublishSingle(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Công bố điểm"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {hasValidScore && item.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenComplete(item)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Hoàn tất và khóa"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="p-1 text-slate-300" title="Học kỳ đã đóng">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}

          {/* Phân trang */}
          {pagination && pagination.pages > 1 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pagination.pages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CÔNG BỐ ĐIỂM TẤT CẢ (BULK PUBLISH MODAL) */}
      {publishAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Tiêu đề Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Xác nhận công bố điểm Thực tập Doanh nghiệp</h3>
              <button
                type="button"
                onClick={() => setPublishAllModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tóm tắt đầu mục modal & Các bộ điều khiển */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 shrink-0 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAllEligible}
                  className="font-bold text-[#123891] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  {selectedPublishIds.length === eligibleCount && eligibleCount > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#123891]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả sinh viên có điểm</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-[#123891] font-semibold">
                    Đủ điều kiện có điểm: <strong>{eligibleCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100/70 text-rose-800 font-semibold">
                    Chưa có điểm: <strong>{ineligibleCount}</strong>
                  </span>
                  <span className="text-slate-600 ml-1">
                    (Đã chọn <strong className="text-[#123891] font-bold">{selectedPublishIds.length}</strong>)
                  </span>
                </div>
              </div>

              {ineligibleCount > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Có <strong>{ineligibleCount}</strong> sinh viên chưa có điểm đánh giá từ Giảng viên Giám sát.
                  </p>
                </div>
              )}
            </div>

            {/* Thân modal: Danh sách sinh viên */}
            <div className="p-6 overflow-y-auto space-y-2.5 text-xs flex-1">
              {loadingAllInternships ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#123891]" />
                  <span>Đang tải danh sách sinh viên...</span>
                </div>
              ) : sortedBulkList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Không có hồ sơ thực tập nào trong đợt này.
                </div>
              ) : (
                sortedBulkList.map((item) => {
                  const hasScore = Boolean(
                    item.evaluation?.score !== undefined &&
                    item.evaluation?.score !== null &&
                    !isNaN(item.evaluation?.score)
                  );
                  const isChecked = selectedPublishIds.includes(item._id);
                  const isPublished = Boolean(item.isScorePublished);

                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectPublish(item._id, hasScore)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        !hasScore
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed select-none opacity-60'
                          : isChecked
                          ? 'bg-emerald-50/60 border-emerald-300 text-slate-800 cursor-pointer shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {/* Bên trái: Hộp kiểm + Thông tin sinh viên */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={!hasScore}
                          checked={isChecked}
                          onChange={() => {}} // Handled by container onClick
                          className={`w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 ${
                            !hasScore ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${hasScore ? 'text-slate-900' : 'text-slate-400'}`}>
                              {item.studentId?.userId?.fullName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              ({item.studentId?.studentCode || '—'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            DN: <strong>{item.companyId?.name || item.companyId?.companyName || '—'}</strong>
                            {item.lecturerId?.userId?.fullName && (
                              <span> • GVGS: {item.lecturerId?.academicTitle || 'ThS.'} {item.lecturerId?.userId?.fullName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bên phải: Trạng thái điểm / Huy hiệu vô hiệu hóa */}
                      <div className="shrink-0 text-right">
                        {hasScore ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-baseline gap-1 font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                              <span className="text-sm">
                                {Number(item.evaluation.score) % 1 === 0
                                  ? Number(item.evaluation.score).toFixed(1)
                                  : item.evaluation.score}
                              </span>
                              <span className="text-[10px] text-slate-500">/ 10</span>
                            </div>
                            {isPublished && (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                ✓ Đã công bố trước đó
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>Chưa có điểm — Không thể công bố</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chân trang modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPublishAllModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={publishing || selectedPublishIds.length === 0}
                onClick={handleConfirmBulkPublish}
                className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang công bố...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Xác nhận công bố ({selectedPublishIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CÁC MODAL */}

      {/* 2. Modal xác nhận hoàn thành / khóa hồ sơ */}
      {completeModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-slate-900 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Hoàn tất kết quả thực tập</h3>
                <p className="text-xs text-slate-500">Khóa điểm và chuyển sang trạng thái COMPLETED</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xác nhận hoàn tất đợt thực tập cho sinh viên{' '}
              <strong>{targetInternship.studentId?.userId?.fullName}</strong> ({targetInternship.studentId?.studentCode})? Sau khi khóa, điểm số sẽ không thể chỉnh sửa.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCompleteModalOpen(false);
                  setTargetInternship(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Đang lưu...' : 'Xác nhận hoàn tất'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal xóa đánh giá */}
      {deleteEvalModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700 pb-3 border-b border-rose-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-900">Xóa kết quả chấm điểm</h3>
                <p className="text-xs text-rose-600">Cho phép Giảng viên Giám sát chấm lại</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa kết quả đánh giá của sinh viên{' '}
              <strong>{deleteTarget.studentId?.userId?.fullName}</strong> ({deleteTarget.studentId?.studentCode})? Sau khi xóa, Giảng viên Giám sát sẽ có thể chấm điểm lại.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteEvalModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeleteEvaluation}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal ẩn điểm đơn lẻ */}
      {hideSingleModalOpen && targetHideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#123891] pb-3 border-b border-blue-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#123891]">Ẩn điểm đã công bố</h3>
                <p className="text-xs text-slate-500">Tạm thời không hiển thị điểm với sinh viên</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Bạn có chắc chắn muốn ẩn điểm của sinh viên{' '}
                <strong>{targetHideItem.studentId?.userId?.fullName}</strong> (MSSV:{' '}
                <strong>{targetHideItem.studentId?.studentCode}</strong>)?
              </p>
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-[#123891] space-y-1">
                <p className="font-bold text-[#123891]">Lưu ý sau khi ẩn điểm:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  <li>Điểm số sẽ <strong>ngay lập tức không hiển thị</strong> trên Cổng sinh viên.</li>
                  <li>Điểm, nhận xét và dữ liệu đánh giá <strong>vẫn được giữ nguyên</strong> trong Database.</li>
                  <li>Trạng thái cập nhật thành <strong>Đã ẩn</strong> và bạn có thể công bố lại bất cứ khi nào.</li>
                </ul>
              </div>
            </div>

            {/* Lý do ẩn điểm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Lý do ẩn điểm</span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </label>
              <textarea
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                placeholder="Nhập lý do ẩn điểm (ví dụ: Cần rà soát cột điểm, kiểm tra lại hồ sơ...)"
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#123891] transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setHideSingleModalOpen(false);
                  setTargetHideItem(null);
                  setHideReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmHideSingle}
                className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{actionLoading ? 'Đang ẩn...' : 'Xác nhận ẩn điểm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal công bố lại điểm đơn lẻ */}
      {republishSingleModalOpen && targetRepublishItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#123891] pb-3 border-b border-blue-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#123891]">Công bố lại điểm TTDN</h3>
                <p className="text-xs text-slate-500">Hiển thị lại điểm số cho sinh viên</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Xác nhận công bố lại điểm cho sinh viên{' '}
                <strong>{targetRepublishItem.studentId?.userId?.fullName}</strong> (MSSV:{' '}
                <strong>{targetRepublishItem.studentId?.studentCode}</strong>).
              </p>
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-[#123891] space-y-1">
                <p>
                  Điểm số được công bố lại: <strong>{targetRepublishItem.evaluation?.score} / 10</strong>
                </p>
                <p className="text-slate-600">
                  (Sử dụng dữ liệu điểm đã lưu trước đó, không tạo bản ghi mới và không gửi lại thông báo trùng lặp).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Ghi chú công bố lại</span>
                <span className="text-[11px] font-normal text-slate-400">Tùy chọn</span>
              </label>
              <textarea
                value={republishReason}
                onChange={(e) => setRepublishReason(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do công bố lại..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#123891] transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setRepublishSingleModalOpen(false);
                  setTargetRepublishItem(null);
                  setRepublishReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRepublishSingle}
                className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{actionLoading ? 'Đang công bố...' : 'Xác nhận công bố lại'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal ẩn điểm hàng loạt */}
      {hideBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Tiêu đề Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">Ẩn điểm đã công bố hàng loạt</h3>
              <button
                type="button"
                onClick={() => setHideBulkModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh công cụ: Tìm kiếm & Chọn nhanh */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0">
              {/* Thanh tìm kiếm */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={hideBulkSearch}
                  onChange={(e) => setHideBulkSearch(e.target.value)}
                  placeholder="Tìm theo tên sinh viên, MSSV, doanh nghiệp..."
                  className="w-full text-xs pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#123891] focus:ring-1 focus:ring-[#123891]/20 transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAllHide}
                  className="font-bold text-[#123891] hover:underline inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {filteredHideBulkList.length > 0 &&
                  filteredHideBulkList.every((it) => selectedHideIds.includes(it._id)) ? (
                    <CheckSquare className="w-4 h-4 text-[#123891]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả ({filteredHideBulkList.length})</span>
                </button>

                <span className="text-slate-600 text-xs">
                  (Đã chọn <strong className="text-[#123891] font-bold">{selectedHideIds.length}</strong>)
                </span>
              </div>
            </div>

            {/* Danh sách */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
              {loadingAllInternships ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#123891]" />
                  <span>Đang tải danh sách sinh viên...</span>
                </div>
              ) : publishedBulkList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không có sinh viên nào đang ở trạng thái đã công bố điểm trong học kỳ này.
                </div>
              ) : filteredHideBulkList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không tìm thấy sinh viên nào khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                filteredHideBulkList.map((item) => {
                  const isChecked = selectedHideIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectHide(item._id)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-[#123891]">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-[#123891]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {item.studentId?.userId?.fullName || 'Sinh viên'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MSSV: <strong>{item.studentId?.studentCode}</strong> • {item.companyId?.name || 'Doanh nghiệp'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-baseline gap-1 font-bold text-[#123891] bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          <span className="text-sm">{item.evaluation?.score}</span>
                          <span className="text-[10px] text-slate-500">/ 10</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chân trang modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setHideBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={hiding || selectedHideIds.length === 0}
                onClick={handleConfirmBulkHide}
                className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {hiding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang ẩn...</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Xác nhận ẩn điểm ({selectedHideIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal chi tiết đánh giá */}
      <EvaluationDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailItem(null);
        }}
        internship={detailItem}
        onDeleteEvaluation={isTermActive ? handleOpenDeleteEvaluation : null}
      />
    </div>
  );
};

export default TbmEvaluationManagement;
