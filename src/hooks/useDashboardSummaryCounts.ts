import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface DashboardSummaryCounts {
  cleanAirCount: number;
  poultryCounts: {
    conventional: number;
    retrofitted: number;
    tunnelVent: number;
  };
  chickenCounts: {
    layer: number;
    broiler: number;
    breeder: number;
    grandParents: number;
  };
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDashboardSummaryCounts(): DashboardSummaryCounts {
  const [cleanAirCount, setCleanAirCount] = useState<number>(0);
  const [poultryCounts, setPoultryCounts] = useState({
    conventional: 0,
    retrofitted: 0,
    tunnelVent: 0,
  });
  const [chickenCounts, setChickenCounts] = useState({
    layer: 0,
    broiler: 0,
    breeder: 0,
    grandParents: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSummaryCounts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch active sites with poultry_type and chicken_type
      const { data: activeSites, error: sitesErr } = await supabase
        .from('inspection_sites')
        .select('id, poultry_type, chicken_type, is_active')
        .neq('is_active', false);

      if (sitesErr) throw sitesErr;

      const sitesList = activeSites || [];

      // 2. Compute poultry counts (active sites only)
      let conventional = 0;
      let retrofitted = 0;
      let tunnelVent = 0;

      sitesList.forEach((s) => {
        const pt = (s.poultry_type || '').trim().toUpperCase();
        if (pt === 'CONVENTIONAL') conventional++;
        else if (pt === 'RETROFITTED') retrofitted++;
        else if (pt === 'TUNNEL VENT' || pt === 'TUNNEL_VENT' || pt === 'TUNNEL') tunnelVent++;
      });

      setPoultryCounts({
        conventional,
        retrofitted,
        tunnelVent,
      });

      // 3. Compute chicken counts (active sites only)
      let layer = 0;
      let broiler = 0;
      let breeder = 0;
      let grandParents = 0;

      sitesList.forEach((s) => {
        const ct = (s.chicken_type || '').trim().toUpperCase();
        if (ct === 'LAYER') layer++;
        else if (ct === 'BROILER') broiler++;
        else if (ct === 'BREEDER') breeder++;
        else if (
          ct === 'GRAND PARENTS/GP' ||
          ct === 'GP' ||
          ct === 'GRAND_PARENTS' ||
          ct === 'GRAND PARENTS'
        ) {
          grandParents++;
        }
      });

      setChickenCounts({
        layer,
        broiler,
        breeder,
        grandParents,
      });

      // 4. Compute Sites with clean air / low ppm (< 5 ppm)
      // Active sites whose most recent tag's average ppm is below 5 ppm using sensor_data
      const activeSiteIds = sitesList.map((s) => s.id);
      if (activeSiteIds.length === 0) {
        setCleanAirCount(0);
        return;
      }

      // Query latest schedules for active sites
      const { data: schedules, error: schedErr } = await supabase
        .from('inspection_schedules')
        .select('id, inspection_site_id, scheduled_date, created_at')
        .in('inspection_site_id', activeSiteIds)
        .order('scheduled_date', { ascending: false });

      if (schedErr) {
        console.warn('Could not fetch inspection schedules for clean air count:', schedErr);
      }

      const latestScheduleMap = new Map<number, number>();
      (schedules || []).forEach((sc) => {
        if (!latestScheduleMap.has(sc.inspection_site_id)) {
          latestScheduleMap.set(sc.inspection_site_id, sc.id);
        }
      });

      const latestScheduleIds = Array.from(new Set(latestScheduleMap.values()));
      if (latestScheduleIds.length === 0) {
        setCleanAirCount(0);
        return;
      }

      // Query tags for these latest schedules
      const { data: tags, error: tagsErr } = await supabase
        .from('inspection_tags')
        .select('id, inspection_site_id, inspection_schedule_id, created_at')
        .in('inspection_schedule_id', latestScheduleIds)
        .order('created_at', { ascending: false });

      if (tagsErr) {
        console.warn('Could not fetch inspection tags for clean air count:', tagsErr);
      }

      const mostRecentTagPerSite = new Map<number, number>();
      (tags || []).forEach((t) => {
        if (t.inspection_site_id && !mostRecentTagPerSite.has(t.inspection_site_id)) {
          mostRecentTagPerSite.set(t.inspection_site_id, t.id);
        }
      });

      const mostRecentTagIds = Array.from(new Set(mostRecentTagPerSite.values()));
      if (mostRecentTagIds.length === 0) {
        setCleanAirCount(0);
        return;
      }

      // Query sensor_data for these most recent tags
      const { data: sensorReadings, error: sensorErr } = await supabase
        .from('sensor_data')
        .select('inspection_tag_id, ammonia')
        .in('inspection_tag_id', mostRecentTagIds)
        .not('ammonia', 'is', null);

      if (sensorErr) {
        console.warn('Could not fetch sensor_data for clean air count:', sensorErr);
      }

      const ammoniaByTag = new Map<number, number[]>();
      (sensorReadings || []).forEach((r) => {
        if (r.inspection_tag_id && r.ammonia !== null && r.ammonia !== undefined) {
          const list = ammoniaByTag.get(r.inspection_tag_id) || [];
          list.push(Number(r.ammonia));
          ammoniaByTag.set(r.inspection_tag_id, list);
        }
      });

      let cleanSites = 0;
      mostRecentTagPerSite.forEach((tagId) => {
        const readings = ammoniaByTag.get(tagId);
        // If a site has no readings, do NOT count it
        if (readings && readings.length > 0) {
          const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
          if (avg < 5.0) {
            cleanSites++;
          }
        }
      });

      setCleanAirCount(cleanSites);
    } catch (err) {
      console.error('Error fetching dashboard summary counts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

  return {
    cleanAirCount,
    poultryCounts,
    chickenCounts,
    loading,
    refresh: fetchSummaryCounts,
  };
}

export default useDashboardSummaryCounts;
