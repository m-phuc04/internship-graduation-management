import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import academicTermApi from '../api/academicTermApi';

const AcademicTermContext = createContext(null);

export const AcademicTermProvider = ({ children }) => {
  const [terms, setTerms] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [selectedTermId, setSelectedTermId] = useState(() => {
    return localStorage.getItem('selectedAcademicTermId') || null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch all terms from backend
  const refreshTerms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await academicTermApi.getAllTerms();
      if (res?.success && Array.isArray(res.data)) {
        const termList = res.data;
        setTerms(termList);

        const currentActive = termList.find((t) => t.status === 'ACTIVE') || null;
        setActiveTerm(currentActive);

        // If no selected term in localStorage, default to active term
        const savedId = localStorage.getItem('selectedAcademicTermId');
        if (!savedId && currentActive) {
          setSelectedTermId(currentActive._id);
          localStorage.setItem('selectedAcademicTermId', currentActive._id);
        } else if (savedId) {
          const found = termList.find((t) => t._id === savedId);
          if (!found && currentActive) {
            setSelectedTermId(currentActive._id);
            localStorage.setItem('selectedAcademicTermId', currentActive._id);
          }
        }
      }
    } catch (err) {
      // If error (e.g. not logged in yet), try fetching active term as fallback
      try {
        const activeRes = await academicTermApi.getActiveTerm();
        if (activeRes?.success && activeRes.data) {
          const act = activeRes.data;
          setActiveTerm(act);
          setTerms([act]);
          setSelectedTermId(act._id);
        }
      } catch (fallbackErr) {
        console.error('Lỗi khi tải thông tin học kỳ:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTerms();
  }, [refreshTerms]);

  // Set current selected term
  const setCurrentTerm = useCallback((termOrId) => {
    const id = typeof termOrId === 'object' && termOrId !== null ? termOrId._id : termOrId;
    if (id) {
      setSelectedTermId(id);
      localStorage.setItem('selectedAcademicTermId', id);
    }
  }, []);

  // Compute currentTerm object
  const currentTerm = useMemo(() => {
    if (!terms.length) return null;
    if (selectedTermId) {
      const found = terms.find((t) => t._id === selectedTermId);
      if (found) return found;
    }
    return activeTerm || terms[0] || null;
  }, [terms, selectedTermId, activeTerm]);

  const value = useMemo(
    () => ({
      terms,
      activeTerm,
      currentTerm,
      selectedTermId: currentTerm?._id || null,
      setCurrentTerm,
      refreshTerms,
      loading,
    }),
    [terms, activeTerm, currentTerm, setCurrentTerm, refreshTerms, loading],
  );

  return (
    <AcademicTermContext.Provider value={value}>
      {children}
    </AcademicTermContext.Provider>
  );
};

export const useAcademicTerm = () => {
  const context = useContext(AcademicTermContext);
  if (!context) {
    return {
      terms: [],
      activeTerm: null,
      currentTerm: null,
      selectedTermId: null,
      setCurrentTerm: () => {},
      refreshTerms: () => {},
      loading: false,
    };
  }
  return context;
};

export default AcademicTermContext;
