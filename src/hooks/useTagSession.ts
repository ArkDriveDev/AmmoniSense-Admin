import { useState, useEffect, useCallback } from 'react';
import { fetchSessionData, SessionDataResult } from '../services/sessionService';

export interface UseTagSessionOptions {
  inspectionTagId?: number | null;
  sessionId?: string | null;
  enabled?: boolean;
}

export function useTagSession(options: UseTagSessionOptions) {
  const { inspectionTagId, sessionId, enabled = true } = options;

  const [data, setData] = useState<SessionDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled || (!inspectionTagId && !sessionId)) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchSessionData({ inspectionTagId, sessionId });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch session readings';
      console.error('Error in useTagSession:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [inspectionTagId, sessionId, enabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh: loadData,
  };
}

export default useTagSession;
