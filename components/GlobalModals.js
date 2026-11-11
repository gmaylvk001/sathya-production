'use client';

import { useModal } from '@/context/ModalContext';
import { AuthModal } from './AuthModal';
import LiveDemoModal from './LiveDemoModal';
import RegionSelectorModal from './RegionSelectorModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const GlobalModals = () => {
  const {
    showAuthModal,
    authError,
    onAuthSuccess,
    closeAuthModal,
    showLiveDemoModal,
    closeLiveDemoModal,
  } = useModal();

  return (
    <>
      <ToastContainer position="top-right" autoClose={4000} />
      <RegionSelectorModal />
      {showAuthModal && (
        <AuthModal
          error={authError}
          onClose={closeAuthModal}
          onSuccess={() => {
            closeAuthModal();
            if (typeof onAuthSuccess === 'function') {
              onAuthSuccess();
            }
          }}
        />
      )}
      {showLiveDemoModal && <LiveDemoModal onClose={closeLiveDemoModal} />}
    </>
  );
};

export default GlobalModals;
