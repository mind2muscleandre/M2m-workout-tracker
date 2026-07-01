// ============================================
// Network status hook
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useSyncStore } from '../lib/offlineSync';

/**
 * Hook to monitor network status and trigger sync
 * Uses a simple fetch-based approach (no extra dependency needed)
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const { syncNow, checkStatus } = useSyncStore();

  const checkConnection = useCallback(async () => {
    try {
      // Simple connectivity check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setIsOnline(true);
      return true;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Check on mount and periodically
  useEffect(() => {
    checkConnection();
    checkStatus();

    const interval = setInterval(async () => {
      const online = await checkConnection();
      if (online) {
        // Auto-sync when back online
        syncNow();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkConnection, checkStatus, syncNow]);

  return { isOnline };
}
