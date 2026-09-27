import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { InspectionSite, InspectionSiteSummary, Device, InspectionTag } from '../types/schema';

export interface SiteAnalyticsData {
  id: number;
  site_name: string;
  site_code?: string;
  site_type: string;
  address: string;
  latitude: number;
  longitude: number;
  area_size_hectares: number;
  site_photo_url?: string | null;
  is_active: boolean;
  notes?: string | null;

  // Aggregate metrics from inspection_site_summary
  schedule_count: number;
  tag_count: number;
  photo_count: number;
  avg_ammonia: number | null;
  critical_readings: number;
  last_inspection_at: string | null;

  // Latest reading info
  latest_ammonia: number | null;
  latest_temperature: number | null;
  latest_humidity: number | null;
  latest_battery: number | null;
  last_reading_at: string | null;
  alert_status: 'normal' | 'warning' | 'high' | 'critical';

  // Device & activity stats
  device_status: 'Online' | 'Offline';
  active_device_count: number;
  devices: {
    id: number;
    device_uid: string;
    device_name?: string | null;
    status: string;
    firmware_version?: string | null;
    battery_level?: number | null;
    installed_at?: string | null;
    last_ping_at?: string | null;
  }[];

  reading_count_7days: number;
  trend_7days: { date: string; ammonia: number }[];
  recent_readings: {
    id: number;
    tag_name: string;
    device_uid: string;
    ammonia: number;
    temperature: number;
    humidity: number;
    battery: number;
    status: string;
    created_at: string;
    photo_url?: string | null;
    photo_thumbnail_url?: string | null;
    notes?: string | null;
  }[];
}

export interface SiteGlobalStats {
  totalSites: number;
  activeDevices: number;
  sitesWithAlerts: number;
  criticalAlerts: number;
  totalSchedules: number;
}

export function useSiteAnalytics() {
  const [sites, setSites] = useState<SiteAnalyticsData[]>([]);
  const [globalStats, setGlobalStats] = useState<SiteGlobalStats>({
    totalSites: 0,
    activeDevices: 0,
    sitesWithAlerts: 0,
    criticalAlerts: 0,
    totalSchedules: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch inspection sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from('inspection_sites')
        .select('*')
        .order('site_name');

      if (sitesErr) throw sitesErr;

      // 2. Fetch summary metrics from inspection_site_summary
      const summaryMap = new Map<number, InspectionSiteSummary>();
      try {
        const { data: sumData } = await supabase
          .from('inspection_site_summary')
          .select('*');

        if (sumData) {
          sumData.forEach((s: InspectionSiteSummary) => {
            summaryMap.set(s.inspection_site_id, s);
          });
        }
      } catch (err) {
        console.warn('Could not fetch inspection_site_summary:', err);
      }

      // 3. Fetch devices
      let devicesData: Device[] = [];
      try {
        const { data: dData } = await supabase.from('devices').select('*');
        if (dData) devicesData = dData;
      } catch (err) {
        console.warn('Could not fetch devices:', err);
      }

      // 4. Fetch inspection_tags for the last 14 days
      let tagsData: InspectionTag[] = [];
      try {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: tData } = await supabase
          .from('inspection_tags')
          .select('*')
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false });

        if (tData) tagsData = tData;
      } catch (err) {
        console.warn('Could not fetch inspection_tags:', err);
      }

      // 5. Fetch total schedule count
      let totalSchedules = 0;
      try {
        const { count } = await supabase
          .from('inspection_schedules')
          .select('id', { count: 'exact', head: true });
        totalSchedules = count || 0;
      } catch (err) {
        console.warn('Could not count inspection_schedules:', err);
      }

      const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allTags = tagsData;
      const allDevices = devicesData;

      const processedSites: SiteAnalyticsData[] = (sitesData || []).map((site: InspectionSite) => {
        const sum = summaryMap.get(site.id);

        // Match devices
        const siteDevices = allDevices.filter((d: Device) => d.inspection_site_id === site.id);
        const deviceUids = siteDevices.map((d: Device) => d.device_uid);

        // Match tags (by site_id or device_uid)
        const siteTags = allTags.filter((t: InspectionTag) =>
          t.inspection_site_id === site.id || (t.device_uid && deviceUids.includes(t.device_uid))
        );

        const latestTag = siteTags[0] || null;
        const tags7Days = siteTags.filter(
          (t: InspectionTag) => new Date(t.created_at || Date.now()).getTime() >= sevenDaysAgoTime
        );

        // Alert status classification (NORMAL / WARNING / HIGH / CRITICAL)
        let alertStatus: 'normal' | 'warning' | 'high' | 'critical' = 'normal';
        const nh3 = latestTag?.ammonia;
        const tagStatusUpper = (latestTag?.status || '').toUpperCase();

        if (tagStatusUpper === 'CRITICAL' || (nh3 !== null && nh3 !== undefined && nh3 > 50)) {
          alertStatus = 'critical';
        } else if (tagStatusUpper === 'HIGH' || (nh3 !== null && nh3 !== undefined && nh3 > 35)) {
          alertStatus = 'high';
        } else if (tagStatusUpper === 'WARNING' || (nh3 !== null && nh3 !== undefined && nh3 > 25)) {
          alertStatus = 'warning';
        }

        // Device health
        const hasActiveDevice = siteDevices.some((d: Device) => d.status === 'ACTIVE');
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const hasRecentTag = latestTag && new Date(latestTag.created_at || '').getTime() >= twentyFourHoursAgo;
        const deviceStatus: 'Online' | 'Offline' = (hasActiveDevice || hasRecentTag) ? 'Online' : 'Offline';

        const siteNameStr = site.site_name || `Site #${site.id}`;
        const siteType = site.site_type || 'Piggery';

        // 7-day daily trend calculation
        const dailyGroups: Record<string, number[]> = {};
        tags7Days.forEach((t: InspectionTag) => {
          if (t.ammonia !== null && t.ammonia !== undefined) {
            const dateStr = new Date(t.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyGroups[dateStr]) dailyGroups[dateStr] = [];
            dailyGroups[dateStr].push(t.ammonia);
          }
        });

        const trend_7days: { date: string; ammonia: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const vals = dailyGroups[dateStr];
          const avg = vals && vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : (latestTag?.ammonia || 0);
          trend_7days.push({ date: dateStr, ammonia: Math.round(avg * 10) / 10 });
        }

        return {
          id: site.id,
          site_name: siteNameStr,
          site_code: site.site_code,
          site_type: siteType,
          address: site.address || 'Address not specified',
          latitude: Number(site.current_latitude) || 8.3697,
          longitude: Number(site.current_longitude) || 124.8640,
          area_size_hectares: Number(site.area_size_hectares) || 1.0,
          site_photo_url: site.site_photo_url || site.site_photo_thumbnail || null,
          is_active: site.is_active ?? true,
          notes: site.notes || null,

          schedule_count: sum?.schedule_count || 0,
          tag_count: sum?.tag_count || siteTags.length,
          photo_count: sum?.photo_count || 0,
          avg_ammonia: sum?.avg_ammonia ?? (latestTag?.ammonia ?? null),
          critical_readings: sum?.critical_readings || siteTags.filter(t => (t.ammonia || 0) > 50).length,
          last_inspection_at: sum?.last_inspection_at || latestTag?.created_at || null,

          latest_ammonia: latestTag?.ammonia ?? null,
          latest_temperature: latestTag?.temperature ?? null,
          latest_humidity: latestTag?.humidity ?? null,
          latest_battery: latestTag?.battery ?? null,
          last_reading_at: latestTag?.created_at || null,
          alert_status: alertStatus,
          device_status: deviceStatus,
          active_device_count: siteDevices.filter((d: Device) => d.status === 'ACTIVE').length,
          devices: siteDevices.map((d: Device) => ({
            id: d.id,
            device_uid: d.device_uid,
            device_name: d.device_name,
            status: d.status || 'ACTIVE',
            firmware_version: d.firmware_version,
            battery_level: d.battery_level,
            installed_at: d.installed_at,
            last_ping_at: d.last_ping_at,
          })),
          reading_count_7days: tags7Days.length,
          trend_7days,
          recent_readings: siteTags.slice(0, 10).map((t: InspectionTag) => ({
            id: t.id,
            tag_name: t.tag_name || `Tag #${t.id}`,
            device_uid: t.device_uid || 'N/A',
            ammonia: t.ammonia || 0,
            temperature: t.temperature || 0,
            humidity: t.humidity || 0,
            battery: t.battery || 0,
            status: t.status || 'NORMAL',
            created_at: t.created_at || new Date().toISOString(),
            photo_url: t.photo_url || null,
            photo_thumbnail_url: t.photo_thumbnail_url || null,
            notes: t.notes || null,
          })),
        };
      });

      // Sort sites by site name
      processedSites.sort((a, b) => a.site_name.localeCompare(b.site_name));

      setSites(processedSites);
      setGlobalStats({
        totalSites: processedSites.length,
        activeDevices: allDevices.filter((d: Device) => d.status === 'ACTIVE').length,
        sitesWithAlerts: processedSites.filter((s) => s.alert_status === 'warning' || s.alert_status === 'high' || s.alert_status === 'critical').length,
        criticalAlerts: processedSites.filter((s) => s.alert_status === 'critical').length,
        totalSchedules,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load site analytics.';
      console.error('Error fetching site analytics:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteAnalytics();
  }, [fetchSiteAnalytics]);

  return { sites, globalStats, loading, error, refresh: fetchSiteAnalytics };
}

export default useSiteAnalytics;
