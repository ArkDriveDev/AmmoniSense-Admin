import { useState, useCallback } from 'react';

export function useSyncFeedback() {
  const [syncToast, setSyncToast] = useState<{
    isOpen: boolean;
    message: string;
    color: 'primary' | 'success' | 'warning' | 'danger';
    duration?: number;
  }>({
    isOpen: false,
    message: '',
    color: 'primary',
    duration: 3000
  });

  const dismissSyncToast = useCallback(() => {
    setSyncToast(prev => ({ ...prev, isOpen: false }));
  }, []);

  const triggerSync = useCallback(async (action: () => Promise<any> | void, initiatingMsg = 'Refreshing data from server...') => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncToast({
        isOpen: true,
        message: 'Device is offline. Unable to synchronize data.',
        color: 'warning',
        duration: 3500
      });
      return false;
    }

    setSyncToast({
      isOpen: true,
      message: initiatingMsg,
      color: 'primary',
      duration: 1500