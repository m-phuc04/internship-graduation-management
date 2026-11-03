import React, { useState, useEffect, useCallback } from 'react';
import internshipDocumentApi from '../../api/internshipDocumentApi';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Download,
  FileSpreadsheet,
  File,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <FileText className="w-5 h-5 text-rose-600" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileText className="w-5 h-5 text-blue-600" />;
  }
  return <File className="w-5 h-5 text-slate-500" />;
};

const StudentInternshipDocumentsPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internshipDocumentApi.getAll({
        academicTermId: currentTerm?._id || '',
        search,
      });
      if (res?.success) {
        setDocuments(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách tài liệu thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, search, showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = (doc) => {
    const fileUrl = doc.fileUrl.startsWith('http')
      ? doc.fileUrl
      : `${window.location.origin}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', doc.fileName || 'tai-lieu');
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tài Liệu &amp; Biểu Mẫu Thực Tập
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <SearchInput
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Tìm theo tên file, ghi chú..."
            className="w-full md:w-96"
          />
        </div>

        {/* Table of Documents */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={4} cols={4} />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Chưa có tài liệu thực tập nào"
              description="Hiện tại Trưởng Bộ Môn chưa đăng tải tài liệu hoặc biểu mẫu thực tập nào cho học kỳ này."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-16">STT</th>
                    <th className="py-3.5 px-4 pl-6">File</th>
                    <th className="py-3.5 px-4">Ghi chú</th>
                    <th className="py-3.5 px-4 pr-6 text-right w-36"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {documents.map((doc, idx) => (
                    <tr key={doc._id} className="hover:bg-slate-50/60 transition group">
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                        {idx + 1}
                      </td>

                      {/* File Info */}
                      <td className="py-3.5 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80">
                            {getFileIcon(doc.fileName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-[#123891] transition truncate max-w-md">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.createdAt)}</span>
                              {doc.academicTermId?.termName && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#123891] font-medium">{doc.academicTermId.termName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {doc.description ? (
                          <span className="leading-relaxed">{doc.description}</span>
                        ) : (
                          <span className="text-slate-400 italic">Không có ghi chú</span>
                        )}
                      </td>

                      {/* Thao tác (Tải về) */}
                      <td className="py-3.5 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                            title="Tải về file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải về</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentInternshipDocumentsPage;
