import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface SiteSensorMetric {
  siteId: number;
  siteName: string;
  totalTags: number;
  totalReadings: number;
  avgPpm: number;
  maxPpm: number;
  criticalCount: number;
  lastInspectionDate: string | null;
}

export interface SiteSensorAggregate {
  totalSites: number;
  totalSchedules: number;
  totalTags: number;
  totalReadings: number;
  overallAvgPpm: number;
}

export function useSiteSensorAnalytics(knownSites: { id: number; site_name: string; is_active?: boolean }[] = []) {
  const [siteMetrics, setSiteMetrics] = useState<SiteSensorMetric[]>([]);
  const [aggregate, setAggregate] = useState<SiteSensorAggregate>({
    totalSites: 0,
    totalSchedules: 0,
    totalTags: 0,
    totalReadings: 0,
    overallAvgPpm: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. One query to fetch sensor_data joined with inspection_tags
      const { data: sensorRows, error: sensorErr } = await supabase
        .from('sensor_data')
        .select(`
          id,
          ammonia,
          created_at,
          inspection_tag_id,
          inspection_tags!inner (
            id,
            inspection_site_id,
            inspection_schedule_id,
            created_at
          )
        `)
        .not('ammonia', 'is', null);

      if (sensorErr) {
        console.warn('Could not fetch sensor_data analytics:', sensorErr);
      }

      const rows = sensorRows || [];

      // Map site names from knownSites
      const siteNameMap = new Map<number, string>();
      knownSites.forEach((s) => siteNameMap.set(s.id, s.site_name));

      // Group per site
      interface SiteAccumulator {
        siteId: number;
        siteName: string;
        tagIds: Set<number>;
        scheduleIds: Set<number>;
        readingsCount: number;
        ppmSum: number;
        maxPpm: number;
        criticalCount: number;
        lastInspection: string | null;
      }

      const siteMap = new Map<number, SiteAccumulator>();
      const allUniqueScheduleIds = new Set<number>();
      const allUniqueTagIds = new Set<number>();
      let totalPpmSum = 0;
      let totalReadingsCount = 0;

      rows.forEach((r: any) => {
        const tag = r.inspection_tags;
        if (!tag || !tag.inspection_site_id) return;

        const siteId = Number(tag.inspection_site_id);
        const nh3 = Number(r.ammonia);
        if (isNaN(nh3)) return;

        totalPpmSum += nh3;
        totalReadingsCount++;

        if (tag.id) allUniqueTagIds.add(Number(tag.id));
        if (tag.inspection_schedule_id) allUniqueScheduleIds.add(Number(tag.inspection_schedule_id));

        let acc = siteMap.get(siteId);
        if (!acc) {
          acc = {
            siteId,
            siteName: siteNameMap.get(siteId) || `Site #${siteId}`,
            tagIds: new Set<number>(),
            scheduleIds: new Set<number>(),
            readingsCount: 0,
            ppmSum: 0,
            maxPpm: 0,
            criticalCount: 0,
            lastInspection: null,
          };
          siteMap.set(siteId, acc);
        }

        acc.readingsCount++;
        acc.ppmSum += nh3;
        if (nh3 > acc.maxPpm) acc.maxPpm = nh3;
        if (nh3 >= 25) acc.criticalCount++;

        if (tag.id) acc.tagIds.add(Number(tag.id));
        if (tag.inspection_schedule_id) acc.scheduleIds.add(Number(tag.inspection_schedule_id));

        const dateCandidate = r.created_at || tag.created_at;
        if (dateCandidate) {
          if (!acc.lastInspection || new Date(dateCandidate).getTime() > new Date(acc.lastInspection).getTime()) {
            acc.lastInspection = dateCandidate;
          }
        }
      });

      // Ensure any known active sites are also included even if they have 0 sensor readings
      knownSites.forEach((ks) => {
        if (!siteMap.has(ks.id) && ks.is_active !== false) {
          siteMap.set(ks.id, {
            siteId: ks.id,
            siteName: ks.site_name,
            tagIds: new Set<number>(),
            scheduleIds: new Set<number>(),
            readingsCount: 0,
            ppmSum: 0,
            maxPpm: 0,
            criticalCount: 0,
            lastInspection: null,
          });
        }
      });

      const metricsList: SiteSensorMetric[] = Array.from(siteMap.values()).map((acc) => ({
        siteId: acc.siteId,
        siteName: acc.siteName,
        totalTags: acc.tagIds.size,
        totalReadings: acc.readingsCount,
        avgPpm: acc.readingsCount > 0 ? Math.round((acc.ppmSum / acc.readingsCount) * 10) / 10 : 0,
        maxPpm: Math.round(acc.maxPpm * 10) / 10,
        criticalCount: acc.criticalCount,
        lastInspectionDate: acc.lastInspection,
      }));

      // Sort by site name
      metricsList.sort((a, b) => a.siteName.localeCompare(b.siteName));

      const overallAvg = totalReadingsCount > 0 ? Math.round((totalPpmSum / totalReadingsCount) * 10) / 10 : 0;

      setSiteMetrics(metricsList);
      setAggregate({
        totalSites: metricsList.length,
        totalSchedules: allUniqueScheduleIds.size,
        totalTags: allUniqueTagIds.size,
        totalReadings: totalReadingsCount,
        overallAvgPpm: overallAvg,
      });
    } catch (err) {
      console.error('Error fetching site sensor analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [knownSites]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    siteMetrics,
    aggregate,
    loading,
    refresh: fetchAnalytics,
  };
}

export default useSiteSensorAnalytics;
