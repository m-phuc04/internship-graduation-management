import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AcademicTermProvider } from './context/AcademicTermContext';
import { UserProfileProvider } from './context/UserProfileContext';
import { ChatProvider } from './context/ChatContext';
import FloatingChatBox from './components/chat/FloatingChatBox';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts & Pages
import TbmLayout from './components/layout/TbmLayout';
import StudentLayout from './components/layout/StudentLayout';
import LecturerLayout from './components/layout/LecturerLayout';
import CompanyLayout from './components/layout/CompanyLayout';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AcademicTermManagement from './pages/admin/AcademicTermManagement';
import StudentManagement from './pages/tbm/StudentManagement';
import LecturerManagement from './pages/tbm/LecturerManagement';
import CompanyManagement from './pages/tbm/CompanyManagement';
import InternshipManagement from './pages/tbm/InternshipManagement';
import TbmEvaluationManagement from './pages/tbm/TbmEvaluationManagement';
import TbmThesisManagement from './pages/tbm/TbmThesisManagement';
import TbmThesisEvaluationManagement from './pages/tbm/TbmThesisEvaluationManagement';
import TbmDashboard from './pages/tbm/TbmDashboard';
import MyInternshipPage from './pages/student/MyInternshipPage';
import RegisterInternshipPage from './pages/student/RegisterInternshipPage';
import StudentReportPage from './pages/student/StudentReportPage';
import MyThesisPage from './pages/student/MyThesisPage';
import RegisterThesisPage from './pages/student/RegisterThesisPage';
import StudentThesisProgressPage from './pages/student/StudentThesisProgressPage';
import StudentDashboard from './pages/student/StudentDashboard';
import LecturerInternshipPage from './pages/lecturer/LecturerInternshipPage';
import LecturerReportPage from './pages/lecturer/LecturerReportPage';
import LecturerThesesPage from './pages/lecturer/LecturerThesesPage';
import LecturerThesisProgressPage from './pages/lecturer/LecturerThesisProgressPage';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import CompanyEvaluationPage from './pages/company/CompanyEvaluationPage';
import CompanyDashboard from './pages/company/CompanyDashboard';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import HomePage from './pages/HomePage';

import CompanyPublicEvaluationPage from './pages/public/CompanyPublicEvaluationPage';

// Dynamic Profile Redirect Component
const RoleBasedProfileRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user?.role) {
    case 'ADMIN':
    case 'TBM':
      return <Navigate to="/tbm/profile" replace />;
    case 'LECTURER':
      return <Navigate to="/lecturer/profile" replace />;
    case 'STUDENT':
      return <Navigate to="/student/profile" replace />;
    case 'COMPANY':
      return <Navigate to="/company/profile" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-slate-500 font-medium">Đang tải thông tin xác thực...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/permissions" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AcademicTermProvider>
            <ChatProvider>
              <UserProfileProvider>
                <ErrorBoundary>
                  <FloatingChatBox />
                  <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/company-evaluation/:token" element={<CompanyPublicEvaluationPage />} />

                {/* Public / Other User Profile Routes */}
                <Route
                  path="/profile/user/:id"
                  element={
                    <ProtectedRoute>
                      <PublicProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/:id"
                  element={
                    <ProtectedRoute>
                      <PublicProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Global /profile redirect */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <RoleBasedProfileRedirect />
                    </ProtectedRoute>
                  }
                />

              {/* TBM & ADMIN Master Data & Management Routes (Protected with TBM and ADMIN roles) */}
              <Route
                path="/tbm"
                element={
                  <ProtectedRoute allowedRoles={['TBM', 'ADMIN']}>
                    <TbmLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/tbm/dashboard" replace />} />
                <Route path="dashboard" element={<TbmDashboard />} />
                <Route path="academic-terms" element={<AcademicTermManagement />} />
                <Route path="students" element={<StudentManagement />} />
                <Route path="lecturers" element={<LecturerManagement />} />
                <Route path="companies" element={<CompanyManagement />} />
                <Route path="internships" element={<InternshipManagement />} />
                <Route path="evaluations" element={<TbmEvaluationManagement />} />
                <Route path="theses" element={<TbmThesisManagement />} />
                <Route path="thesis-evaluations" element={<TbmThesisEvaluationManagement />} />
                <Route path="profile" element={<ProfilePage />} />
                {/* Permissions: Only ADMIN allowed */}
                <Route
                  path="permissions"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminPermissionsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

            {/* Student Internship & Reports Routes (Protected with STUDENT role) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="internship" element={<MyInternshipPage />} />
              <Route path="internship/register" element={<RegisterInternshipPage />} />
              <Route path="reports" element={<StudentReportPage />} />
              <Route path="thesis" element={<MyThesisPage />} />
              <Route path="thesis/register" element={<RegisterThesisPage />} />
              <Route path="thesis/progress" element={<StudentThesisProgressPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Lecturer Supervision & Reports Routes (Protected with LECTURER, TBM roles) */}
            <Route
              path="/lecturer"
              element={
                <ProtectedRoute allowedRoles={['LECTURER', 'TBM']}>
                  <LecturerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/lecturer/dashboard" replace />} />
              <Route path="dashboard" element={<LecturerDashboard />} />
              <Route path="internships" element={<LecturerInternshipPage />} />
              <Route path="reports" element={<LecturerReportPage />} />
              <Route path="theses" element={<LecturerThesesPage />} />
              <Route path="theses/progress" element={<LecturerThesisProgressPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Company Evaluation Routes (Protected with COMPANY role) */}
            <Route
              path="/company"
              element={
                <ProtectedRoute allowedRoles={['COMPANY']}>
                  <CompanyLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/company/dashboard" replace />} />
              <Route path="dashboard" element={<CompanyDashboard />} />
              <Route path="evaluations" element={<CompanyEvaluationPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Admin Management Routes (Protected with ADMIN role) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <TbmLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/permissions" replace />} />
              <Route path="permissions" element={<AdminPermissionsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="dashboard" element={<TbmDashboard />} />
              <Route path="academic-terms" element={<AcademicTermManagement />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="lecturers" element={<LecturerManagement />} />
              <Route path="companies" element={<CompanyManagement />} />
              <Route path="internships" element={<InternshipManagement />} />
              <Route path="evaluations" element={<TbmEvaluationManagement />} />
              <Route path="theses" element={<TbmThesisManagement />} />
              <Route path="thesis-evaluations" element={<TbmThesisEvaluationManagement />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
          </UserProfileProvider>
          </ChatProvider>
          </AcademicTermProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
