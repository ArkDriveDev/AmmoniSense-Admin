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
