import { useState, useEffect, useCallback } from 'react';
import { InspectionReportData } from '../types/inspectionReport';
import { fetchInspectionReportData } from '../services/reportService';

export * from '../types/inspectionReport';
export * from '../utils/reportUtils';

export function useInspectionReport(scheduleId: number | null) {
  const [data, setData] = useState<InspectionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!scheduleId) return;
    setLoading(true);
    setError(null);
    try {
      const reportData = await fetchInspectionReportData(scheduleId);
      setData(reportData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load report data';
      console.error('[useInspectionReport]', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export default useInspectionReport;
