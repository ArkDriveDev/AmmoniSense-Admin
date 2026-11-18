import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DoughnutSlice } from '../components/charts/DashboardDoughnutCard';

export interface SiteStatusCounts {
  safeSites: number;
  warningSites: number;
  criticalSites: number;
  sitesWithReadings: number;
  excludedNoReadings: number;
  totalActiveSites: number;
}

export interface DashboardSummaryCounts {
  siteStatus: SiteStatusCounts;
  siteStatusSlices: DoughnutSlice[];
  poultryCounts: {
    conventional: number;
    retrofitted: number;
    tunnelVent: number;
    [key: string]: number;
  };
  poultrySlices: DoughnutSlice[];
  chickenCounts: {
    layer: number;
    broiler: number;
    breeder: number;
    grandParents: number;
    [key: string]: number;
  };
  chickenSlices: DoughnutSlice[];
  loading: boolean;
  refresh: () => Promise<void>;

  // Backwards compatibility aliases
  readingsStatus: {
    safe: number;
    warning: number;
    critical: number;
    total: number;
  };
  readingsStatusSlices: DoughnutSlice[];
  cleanAirCount: number;
  airQuality: {
    cleanAirSites: number;
    notCleanAirSites: number;
    excludedNoReadings: number;
    totalWithReadings: number;
  };
}

export function normalizePoultryType(pt?: string | null): string {
  if (!pt) return '';
  const clean = pt.trim().toUpperCase().replace(/[-_]/g, ' ');
  if (clean === 'CONVENTIONAL') return 'Conventional';
  if (clean === 'RETROFITTED') return 'Retrofitted';
  if (clean === 'TUNNEL VENT' || clean === 'TUNNEL') return 'Tunnel Vent';
  return clean.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
}

export function normalizeChickenType(ct?: string | null): string {
  if (!ct) return '';
  const clean = ct.trim().toUpperCase().replace(/[-_]/g, ' ');
  if (clean === 'LAYER') return 'Layer';
  if (clean === 'BROILER') return 'Broiler';
  if (clean === 'BREEDER') return 'Breeder';
  if (
    clean === 'GRAND PARENTS/GP' ||
    clean === 'GRAND PARENTS' ||
    clean === 'GP' ||
    clean === 'GRAND_PARENTS'
  ) {
    return 'Grand Parents / GP';
  }
  return clean.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
}

const POULTRY_COLOR_MAP: Record<string, string> = {
  'Conventional': '#2563eb',
  'Retrofitted': '#06b6d4',
  'Tunnel Vent': '#8b5cf6',
};

const CHICKEN_COLOR_MAP: Record<string, string> = {
  'Layer': '#10b981',
  'Broiler': '#f59e0b',
  'Breeder': '#ec4899',
  'Grand Parents / GP': '#6366f1',
};

export function useDashboardSummaryCounts(dashboardSites?: any[]): DashboardSummaryCounts {
  const [siteStatus, setSiteStatus] = useState<SiteStatusCounts>({
    safeSites: 0,
    warningSites: 0,
    criticalSites: 0,
    sitesWithReadings: 0,
    excludedNoReadings: 0,
    totalActiveSites: 0,
  });

  const [rawSites, setRawSites] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch site-based ammonia status:
  // SAFE: worst reading < 5
  // WARNING: worst reading >= 5 and < 25
  // CRITICAL: worst reading >= 25
  // Join: inspection_sites -> inspection_schedules -> inspection_tags -> sensor_data
  const fetchSiteStatus = useCallback(async () => {
    try {
      // 1. Fetch active sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from('inspection_sites')
        .select('id, poultry_type, chicken_type, is_active');

      if (sitesErr) {
        console.warn('Could not fetch inspection_sites for site status:', sitesErr);
        return;
      }

      const activeSitesList = (sitesData || []).filter((s) => s.is_active !== false);
      setRawSites(sitesData || []);

      const activeSiteIds = activeSitesList.map((s) => s.id);
      if (activeSiteIds.length === 0) {
        setSiteStatus({
          safeSites: 0,
          warningSites: 0,
          criticalSites: 0,
          sitesWithReadings: 0,
          excludedNoReadings: 0,
          totalActiveSites: 0,
        });
        return;
      }

      // 2. Fetch schedules for these active sites
      const { data: schedules, error: schedErr } = await supabase
        .from('inspection_schedules')
        .select('id, inspection_site_id')
        .in('inspection_site_id', activeSiteIds);

      if (schedErr) {
        console.warn('Could not fetch inspection_schedules for site status:', schedErr);
      }

      const scheduleToSiteMap = new Map<number, number>();
      const scheduleIds: number[] = [];
      (schedules || []).forEach((sc) => {
        if (sc.id && sc.inspection_site_id) {
          scheduleToSiteMap.set(sc.id, sc.inspection_site_id);
          scheduleIds.push(sc.id);
        }
      });

      // 3. Fetch tags for these schedules
      const tagToSiteMap = new Map<number, number>();
      const tagIds: number[] = [];
      if (scheduleIds.length > 0) {
        const { data: tags, error: tagsErr } = await supabase
          .from('inspection_tags')
          .select('id, inspection_schedule_id')
          .in('inspection_schedule_id', scheduleIds);

        if (tagsErr) {
          console.warn('Could not fetch inspection_tags for site status:', tagsErr);
        }

        (tags || []).forEach((t) => {
          if (t.id && t.inspection_schedule_id) {
            const siteId = scheduleToSiteMap.get(t.inspection_schedule_id);
            if (siteId) {
              tagToSiteMap.set(t.id, siteId);
              tagIds.push(t.id);
            }
          }
        });
      }

      // 4. Fetch sensor_data for these tags and compute worst_ppm & reading_count per site
      const siteMaxPpm = new Map<number, number>();
      const siteReadingCount = new Map<number, number>();

      if (tagIds.length > 0) {
        const { data: sensorRows, error: sensorErr } = await supabase
          .from('sensor_data')
          .select('inspection_tag_id, ammonia')
          .in('inspection_tag_id', tagIds)
          .not('ammonia', 'is', null);

        if (sensorErr) {
          console.warn('Could not fetch sensor_data for site status:', sensorErr);
        }

        (sensorRows || []).forEach((r) => {
          const siteId = tagToSiteMap.get(r.inspection_tag_id);
          if (siteId && r.ammonia !== null && r.ammonia !== undefined) {
            const a = Number(r.ammonia);
            const currMax = siteMaxPpm.get(siteId);
            if (currMax === undefined || a > currMax) {
              siteMaxPpm.set(siteId, a);
            }
            siteReadingCount.set(siteId, (siteReadingCount.get(siteId) || 0) + 1);
          }
        });
      }

      // 5. Bucket each site into exactly one category
      let safeSites = 0;
      let warningSites = 0;
      let criticalSites = 0;
      let excludedNoReadings = 0;

      activeSiteIds.forEach((siteId) => {
        const count = siteReadingCount.get(siteId) || 0;
        const worstPpm = siteMaxPpm.get(siteId);

        if (count === 0 || worstPpm === undefined) {
          excludedNoReadings++;
        } else if (worstPpm >= 25) {
          criticalSites++;
        } else if (worstPpm >= 5) {
          warningSites++;
        } else {
          safeSites++;
        }
      });

      const sitesWithReadings = safeSites + warningSites + criticalSites;

      setSiteStatus({
        safeSites,
        warningSites,
        criticalSites,
        sitesWithReadings,
        excludedNoReadings,
        totalActiveSites: activeSiteIds.length,
      });
    } catch (err) {
      console.error('Error fetching site ammonia status summary:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await fetchSiteStatus();
    } finally {
      setLoading(false);
    }
  }, [fetchSiteStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Use sites from props if available and non-empty, otherwise use fetched sites
  const effectiveSites = useMemo(() => {
    if (dashboardSites && dashboardSites.length > 0) {
      return dashboardSites;
    }
    return rawSites;
  }, [dashboardSites, rawSites]);

  // Compute active sites (is_active !== false)
  const activeSites = useMemo(() => {
    return effectiveSites.filter((s) => s.is_active !== false);
  }, [effectiveSites]);

  // Compute Poultry Slices & Counts
  const { poultryCounts, poultrySlices } = useMemo(() => {
    const standardPoultry = ['Conventional', 'Retrofitted', 'Tunnel Vent'];
    const tally = new Map<string, number>();
    standardPoultry.forEach((label) => tally.set(label, 0));

    activeSites.forEach((s) => {
      const label = normalizePoultryType(s.poultry_type);
      if (label) {
        tally.set(label, (tally.get(label) || 0) + 1);
      }
    });

    const counts = {
      conventional: tally.get('Conventional') || 0,
      retrofitted: tally.get('Retrofitted') || 0,
      tunnelVent: tally.get('Tunnel Vent') || 0,
    };

    const slices: DoughnutSlice[] = Array.from(tally.entries()).map(([label, value]) => ({
      label,
      value,
      color: POULTRY_COLOR_MAP[label] || '#64748b',
    }));

    return { poultryCounts: counts, poultrySlices: slices };
  }, [activeSites]);

  // Compute Chicken Slices & Counts
  const { chickenCounts, chickenSlices } = useMemo(() => {
    const standardChicken = ['Layer', 'Broiler', 'Breeder', 'Grand Parents / GP'];
    const tally = new Map<string, number>();
    standardChicken.forEach((label) => tally.set(label, 0));

    activeSites.forEach((s) => {
      const label = normalizeChickenType(s.chicken_type);
      if (label) {
        tally.set(label, (tally.get(label) || 0) + 1);
      }
    });

    const counts = {
      layer: tally.get('Layer') || 0,
      broiler: tally.get('Broiler') || 0,
      breeder: tally.get('Breeder') || 0,
      grandParents: tally.get('Grand Parents / GP') || 0,
    };

    const slices: DoughnutSlice[] = Array.from(tally.entries()).map(([label, value]) => ({
      label,
      value,
      color: CHICKEN_COLOR_MAP[label] || '#64748b',
    }));

    return { chickenCounts: counts, chickenSlices: slices };
  }, [activeSites]);

  // Chart 1: Sites by Ammonia Status Slices
  // All three slices must always be present, even if one is zero
  const siteStatusSlices: DoughnutSlice[] = useMemo(() => {
    return [
      { label: 'Safe (<5 PPM)', value: siteStatus.safeSites, color: '#10b981' },
      { label: 'Warning (5–24.99 PPM)', value: siteStatus.warningSites, color: '#f59e0b' },
      { label: 'Critical (≥25 PPM)', value: siteStatus.criticalSites, color: '#ef4444' },
    ];
  }, [siteStatus]);

  return {
    siteStatus,
    siteStatusSlices,
    poultryCounts,
    poultrySlices,
    chickenCounts,
    chickenSlices,
    loading,
    refresh,

    // Deprecated compatibility fields
    readingsStatus: {
      safe: siteStatus.safeSites,
      warning: siteStatus.warningSites,
      critical: siteStatus.criticalSites,
      total: siteStatus.sitesWithReadings,
    },
    readingsStatusSlices: siteStatusSlices,
    cleanAirCount: siteStatus.safeSites,
    airQuality: {
      cleanAirSites: siteStatus.safeSites,
      notCleanAirSites: siteStatus.warningSites + siteStatus.criticalSites,
      excludedNoReadings: siteStatus.excludedNoReadings,
      totalWithReadings: siteStatus.sitesWithReadings,
    },
  };
}

export default useDashboardSummaryCounts;
