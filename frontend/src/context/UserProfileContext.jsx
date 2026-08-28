import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import UserProfileModal from '../components/common/UserProfileModal';

const UserProfileContext = createContext(null);

export const UserProfileProvider = ({ children }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [modalState, setModalState] = useState({
    isOpen: false,
    userId: null,
    initialData: null,
  });

  const getMyProfilePath = (role) => {
    switch (role) {
      case 'ADMIN':
      case 'TBM':
        return '/tbm/profile';
      case 'LECTURER':
        return '/lecturer/profile';
      case 'STUDENT':
        return '/student/profile';
      case 'COMPANY':
        return '/company/profile';
      default:
        return '/profile';
    }
  };

  const openUserProfile = useCallback((userIdOrObject, initialData = null) => {
    if (!userIdOrObject) return;

    let targetId = null;
    let targetEmail = null;

    if (typeof userIdOrObject === 'string') {
      targetId = userIdOrObject;
    } else if (typeof userIdOrObject === 'object') {
      targetId =
        userIdOrObject.userId?._id ||
        userIdOrObject.userId ||
        userIdOrObject._id ||
        userIdOrObject.id;
      targetEmail =
        userIdOrObject.userId?.email ||
        userIdOrObject.email;
    }

    // Check if the clicked user is the current logged in user
    const isSelf =
      Boolean(targetId && currentUser?._id && String(targetId) === String(currentUser._id)) ||
      Boolean(targetEmail && currentUser?.email && String(targetEmail).toLowerCase() === String(currentUser.email).toLowerCase());

    if (isSelf) {
      // User clicked on themselves -> redirect to their personal profile page
      navigate(getMyProfilePath(currentUser?.role));
      return;
    }

    // Otherwise, open public profile modal for other users
    if (typeof userIdOrObject === 'string') {
      setModalState({
        isOpen: true,
        userId: userIdOrObject,
        initialData: initialData,
      });
    } else if (typeof userIdOrObject === 'object') {
      const id = userIdOrObject.userId?._id || userIdOrObject.userId || userIdOrObject._id || userIdOrObject.id;
      setModalState({
        isOpen: true,
        userId: id ? String(id) : null,
        initialData: {
          user: userIdOrObject.userId || (userIdOrObject.fullName ? userIdOrObject : null),
          student: userIdOrObject.student || (userIdOrObject.studentCode ? userIdOrObject : null),
          lecturer: userIdOrObject.lecturer || (userIdOrObject.lecturerCode ? userIdOrObject : null),
          company: userIdOrObject.company || (userIdOrObject.companyName ? userIdOrObject : null),
        },
      });
    }
  }, [currentUser, navigate]);

  const closeUserProfile = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  return (
    <UserProfileContext.Provider value={{ openUserProfile, closeUserProfile }}>
      {children}
      <UserProfileModal
        isOpen={modalState.isOpen}
        onClose={closeUserProfile}
        userId={modalState.userId}
        initialData={modalState.initialData}
      />
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    return {
      openUserProfile: () => {},
      closeUserProfile: () => {},
    };
  }
  return context;
};

export default UserProfileContext;

