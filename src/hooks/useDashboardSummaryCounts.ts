import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface AirQualitySummary {
  cleanAirSites: number;
  notCleanAirSites: number;
  excludedNoReadings: number;
  totalWithReadings: number;
}

export interface DashboardSummaryCounts {
  cleanAirCount: number;
  airQuality: AirQualitySummary;
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
  const [airQuality, setAirQuality] = useState<AirQualitySummary>({
    cleanAirSites: 0,
    notCleanAirSites: 0,
    excludedNoReadings: 0,
    totalWithReadings: 0,
  });
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
      // Join: inspection_sites -> inspection_schedules (inspection_site_id) -> inspection_tags (inspection_schedule_id) -> sensor_data (inspection_tag_id)
      const activeSiteIds = sitesList.map((s) => s.id);
      if (activeSiteIds.length === 0) {
        setCleanAirCount(0);
        setAirQuality({
          cleanAirSites: 0,
          notCleanAirSites: 0,
          excludedNoReadings: 0,
          totalWithReadings: 0,
        });
        return;
      }

      // Query schedules for active sites
      const { data: schedules, error: schedErr } = await supabase
        .from('inspection_schedules')
        .select('id, inspection_site_id, scheduled_date')
        .in('inspection_site_id', activeSiteIds);

      if (schedErr) {
        console.warn('Could not fetch inspection schedules for clean air count:', schedErr);
      }

      const scheduleToSiteMap = new Map<number, number>();
      const scheduleIds: number[] = [];
      (schedules || []).forEach((sc) => {
        if (sc.id && sc.inspection_site_id) {
          scheduleToSiteMap.set(sc.id, sc.inspection_site_id);
          scheduleIds.push(sc.id);
        }
      });

      if (scheduleIds.length === 0) {
        setCleanAirCount(0);
        setAirQuality({
          cleanAirSites: 0,
          notCleanAirSites: 0,
          excludedNoReadings: activeSiteIds.length,
          totalWithReadings: 0,
        });
        return;
      }

      // Query tags for these schedules ordered by created_at descending
      const { data: tags, error: tagsErr } = await supabase
        .from('inspection_tags')
        .select('id, inspection_schedule_id, created_at')
        .in('inspection_schedule_id', scheduleIds)
        .order('created_at', { ascending: false });

      if (tagsErr) {
        console.warn('Could not fetch inspection tags for clean air count:', tagsErr);
      }

      // Pick the latest tag per site (by tag created_at descending)
      const latestTagPerSite = new Map<number, number>();
      (tags || []).forEach((t) => {
        if (t.inspection_schedule_id) {
          const siteId = scheduleToSiteMap.get(t.inspection_schedule_id);
          if (siteId && !latestTagPerSite.has(siteId)) {
            latestTagPerSite.set(siteId, t.id);
          }
        }
      });

      const latestTagIds = Array.from(latestTagPerSite.values());
      if (latestTagIds.length === 0) {
        setCleanAirCount(0);
        setAirQuality({
          cleanAirSites: 0,
          notCleanAirSites: 0,
          excludedNoReadings: activeSiteIds.length,
          totalWithReadings: 0,
        });
        return;
      }

      // Query sensor_data for these most recent tags
      const { data: sensorReadings, error: sensorErr } = await supabase
        .from('sensor_data')
        .select('inspection_tag_id, ammonia')
        .in('inspection_tag_id', latestTagIds)
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
      let notCleanSites = 0;
      let excludedNoReadings = 0;

      activeSiteIds.forEach((siteId) => {
        const tagId = latestTagPerSite.get(siteId);
        if (!tagId) {
          excludedNoReadings++;
          return;
        }
        const readings = ammoniaByTag.get(tagId);
        if (!readings || readings.length === 0) {
          excludedNoReadings++;
          return;
        }
        const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
        if (avg < 5.0) {
          cleanSites++;
        } else {
          notCleanSites++;
        }
      });

      setCleanAirCount(cleanSites);
      setAirQuality({
        cleanAirSites: cleanSites,
        notCleanAirSites: notCleanSites,
        excludedNoReadings,
        totalWithReadings: cleanSites + notCleanSites,
      });
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
    airQuality,
    poultryCounts,
    chickenCounts,
    loading,
    refresh: fetchSummaryCounts,
  };
}

export default useDashboardSummaryCounts;
