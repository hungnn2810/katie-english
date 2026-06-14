'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  open: boolean;
  message: string;
  severity: Severity;
}

interface ToastContextValue {
  showToast: (message: string, severity?: Severity) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' });

  const showToast = useCallback((message: string, severity: Severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  function handleClose() {
    setToast((t) => ({ ...t, open: false }));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={handleClose}
          variant="filled"
          sx={{ borderRadius: 3, minWidth: 280, boxShadow: 6, fontSize: 14 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
