'use client';

import { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [onAuthSuccess, setOnAuthSuccess] = useState(null);
  const [showLiveDemoModal, setShowLiveDemoModal] = useState(false);

  const openAuthModal = (onSuccessCallback, error = '') => {
    setAuthError(error);
    setOnAuthSuccess(() => onSuccessCallback);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setAuthError('');
    setOnAuthSuccess(null);
  };

  const openLiveDemoModal = () => setShowLiveDemoModal(true);
  const closeLiveDemoModal = () => setShowLiveDemoModal(false);

  return (
    <ModalContext.Provider
      value={{
        showAuthModal,
        authError,
        openAuthModal,
        closeAuthModal,
        onAuthSuccess,
        showLiveDemoModal,
        openLiveDemoModal,
        closeLiveDemoModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
