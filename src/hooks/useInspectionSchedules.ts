import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { InspectionSchedule, InspectionScheduleSummary, ScheduleStatus } from '../types/schema';

export function useInspectionSchedules() {
  const [schedules, setSchedules] = useState<InspectionScheduleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Query inspection_schedule_summary view
      const { data, error: schedErr } = await supabase
        .from('inspection_schedule_summary')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (schedErr) {
        // Fallback to direct inspection_schedules table with join
        const { data: rawData, error: rawErr } = await supabase
          .from('inspection_schedules')
          .select(`
            *,
            inspection_sites (
              id,
              site_name,
              site_code
            )
          `)
          .order('scheduled_date', { ascending: false });

        if (rawErr) throw rawErr;

        const mapped: InspectionScheduleSummary[] = (rawData || []).map((s: InspectionSchedule & { inspection_sites?: { site_name: string; site_code: string } | null }) => ({
          schedule_id: s.id,
          schedule_name: s.schedule_name,
          scheduled_date: s.scheduled_date,
          schedule_status: s.status || 'SCHEDULED',
          status: s.status || 'SCHEDULED',
          started_at: s.started_at || null,
          completed_at: s.completed_at || null,
          inspection_site_id: s.inspection_site_id,
          site_name: s.inspection_sites?.site_name || `Site #${s.inspection_site_id}`,
          site_code: s.inspection_sites?.site_code || 'N/A',
          tag_count: 0,
          photo_count: 0,
          avg_ammonia: null,
          max_ammonia: null,
          critical_readings: 0,
          created_by: s.created_by || null,
          created_by_name: null,
        }));
        setSchedules(mapped);
      } else {
        const normalized: InspectionScheduleSummary[] = (data || []).map((s: any) => ({
          ...s,
          status: s.schedule_status || s.status || 'SCHEDULED',
          schedule_status: s.schedule_status || s.status || 'SCHEDULED',
        }));
        setSchedules(normalized);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inspection schedules';
      console.error('Error fetching inspection schedules:', err);
      setError(message);
    } finally {
      setLoading(false);
    }