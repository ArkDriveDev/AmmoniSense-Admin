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