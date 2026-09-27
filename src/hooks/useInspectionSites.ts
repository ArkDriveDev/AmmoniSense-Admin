import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { InspectionSite, InspectionSiteSummary } from '../types/schema';

export interface InspectionSiteWithSummary extends InspectionSite {
  summary?: InspectionSiteSummary;
  schedule_count?: number;
  tag_count?: number;
  photo_count?: number;
  avg_ammonia?: number | null;
  critical_readings?: number;
  last_inspection_at?: string | null;
}

export function useInspectionSites() {
  const [sites, setSites] = useState<InspectionSiteWithSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspectionSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch sites directly from inspection_sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from('inspection_sites')
        .select('*')
        .order('site_name');

      if (sitesErr) throw sitesErr;

      // 2. Fetch summary metrics from inspection_site_summary view
      const summaryMap = new Map<number, InspectionSiteSummary>();
      try {
        const { data: summaryData, error: summaryErr } = await supabase
          .from('inspection_site_summary')
          .select('*');

        if (!summaryErr && summaryData) {
          summaryData.forEach((s: InspectionSiteSummary) => {
            summaryMap.set(s.inspection_site_id, s);
          });
        }
      } catch (err) {
        console.warn('Could not fetch inspection_site_summary view:', err);
      }

      // Merge sites with summary metrics
      const mergedSites: InspectionSiteWithSummary[] = (sitesData || []).map((s: InspectionSite) => {
        const sum = summaryMap.get(s.id);
        return {
          ...s,
          summary: sum,
          schedule_count: sum?.schedule_count || 0,
          tag_count: sum?.tag_count || 0,
          photo_count: sum?.photo_count || 0,
          avg_ammonia: sum?.avg_ammonia ?? null,
          critical_readings: sum?.critical_readings || 0,
          last_inspection_at: sum?.last_inspection_at || null,
        };
      });

      setSites(mergedSites);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inspection sites';
      console.error('Error fetching inspection sites:', err);
      setError(message);
    } finally {
      setLoading(false);
    }