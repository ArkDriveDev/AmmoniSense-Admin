import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DoughnutSlice } from '../components/charts/DashboardDoughnutCard';

export interface ReadingsStatusSummary {
  safe: number;
  warning: number;
  critical: number;
  total: number;
}

export interface DashboardSummaryCounts {
  readingsStatus: ReadingsStatusSummary;
  readingsStatusSlices: DoughnutSlice[];
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

  // Backwards compatibility for previous references
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
  const [readingsStatus, setReadingsStatus] = useState<ReadingsStatusSummary>({
    safe: 0,
    warning: 0,
    critical: 0,
    total: 0,
  });

  const [rawSites, setRawSites] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch readings by status directly from sensor_data:
  // SAFE (< 5), WARNING (5–24.99), CRITICAL (>= 25)
  const fetchReadingsStatus = useCallback(async () => {
    try {
      const [safeRes, warningRes, criticalRes, totalRes] = await Promise.all([
        supabase.from('sensor_data').select('*', { count: 'exact', head: true }).lt('ammonia', 5),
        supabase.from('sensor_data').select('*', { count: 'exact', head: true }).gte('ammonia', 5).lt('ammonia', 25),
        supabase.from('sensor_data').select('*', { count: 'exact', head: true }).gte('ammonia', 25),
        supabase.from('sensor_data').select('*', { count: 'exact', head: true }).not('ammonia', 'is', null),
      ]);

      let safe = safeRes.count ?? 0;
      let warning = warningRes.count ?? 0;
      let critical = criticalRes.count ?? 0;
      let total = totalRes.count ?? (safe + warning + critical);

      if (safeRes.error || warningRes.error || criticalRes.error || totalRes.error) {
        console.warn('Falling back to direct sensor_data select:', safeRes.error || warningRes.error || criticalRes.error);
        const { data: readings } = await supabase
          .from('sensor_data')
          .select('ammonia')
          .not('ammonia', 'is', null);

        safe = 0;
        warning = 0;
        critical = 0;
        (readings || []).forEach((r) => {
          if (r.ammonia !== null && r.ammonia !== undefined) {
            const a = Number(r.ammonia);
            if (a < 5) safe++;
            else if (a < 25) warning++;
            else critical++;
          }
        });
        total = safe + warning + critical;
      }

      setReadingsStatus({ safe, warning, critical, total });
    } catch (err) {
      console.error('Error fetching sensor_data readings by status:', err);
    }
  }, []);

  // 2. Fetch sites if not passed from dashboard
  const fetchSites = useCallback(async () => {
    try {
      const { data: sitesData, error: sitesErr } = await supabase
        .from('inspection_sites')
        .select('id, poultry_type, chicken_type, is_active');

      if (sitesErr) {
        console.warn('Could not fetch inspection_sites for summary counts:', sitesErr);
      } else if (sitesData) {
        setRawSites(sitesData);
      }
    } catch (err) {
      console.error('Error fetching inspection sites for summary counts:', err);
    }
  }, []);

  const fetchSummaryCounts = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchReadingsStatus(), fetchSites()]);
    } finally {
      setLoading(false);
    }
  }, [fetchReadingsStatus, fetchSites]);

  useEffect(() => {
    fetchSummaryCounts();
  }, [fetchSummaryCounts]);

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

  // Chart 1: Ammonia Readings by Status Slices
  // All three slices must always be present, even if one is zero
  const readingsStatusSlices: DoughnutSlice[] = useMemo(() => {
    return [
      { label: 'Safe (<5 PPM)', value: readingsStatus.safe, color: '#10b981' },
      { label: 'Warning (5–24.99 PPM)', value: readingsStatus.warning, color: '#f59e0b' },
      { label: 'Critical (≥25 PPM)', value: readingsStatus.critical, color: '#ef4444' },
    ];
  }, [readingsStatus]);

  return {
    readingsStatus,
    readingsStatusSlices,
    poultryCounts,
    poultrySlices,
    chickenCounts,
    chickenSlices,
    loading,
    refresh: fetchSummaryCounts,

    // Deprecated compatibility fields
    cleanAirCount: readingsStatus.safe,
    airQuality: {
      cleanAirSites: readingsStatus.safe,
      notCleanAirSites: readingsStatus.warning + readingsStatus.critical,
      excludedNoReadings: 0,
      totalWithReadings: readingsStatus.total,
    },
  };
}

export default useDashboardSummaryCounts;
