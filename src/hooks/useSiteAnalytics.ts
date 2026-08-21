import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface SiteAnalyticsData {
  id: number;
  site_name: string;
  site_code?: string;
  site_type: 'Piggery' | 'Ambient' | 'Industrial' | string;
  address: string;
  latitude: number;
  longitude: number;
  area_size_hectares: number;
  owner_name: string;
  owner_contact?: string;
  owner_email?: string;
  
  // Latest reading info
  latest_ammonia: number | null;
  latest_temperature: number | null;
  latest_humidity: number | null;
  last_reading_at: string | null;
  alert_status: 'normal' | 'warning' | 'critical';
  
  // Device & activity stats
  device_status: 'Online' | 'Offline';
  active_device_count: number;
  devices: {
    id: number;
    device_uid: string;
    status: string;
    firmware_version?: string;
    installed_at?: string;
  }[];
  
  reading_count_7days: number;
  trend_7days: { date: string; ammonia: number }[];
  recent_readings: {
    id: number;
    device_uid: string;
    ammonia: number;
    temperature: number;
    humidity: number;
    status: string;
    grid_cell_id?: string;
    created_at: string;
    photo_url?: string;
  }[];
}

export interface SiteGlobalStats {
  totalSites: number;
  activeDevices: number;
  sitesWithAlerts: number;
  criticalAlerts: number;
}

export function useSiteAnalytics() {
  const [sites, setSites] = useState<SiteAnalyticsData[]>([]);
  const [globalStats, setGlobalStats] = useState<SiteGlobalStats>({
    totalSites: 0,
    activeDevices: 0,
    sitesWithAlerts: 0,
    criticalAlerts: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSiteAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch monitoring sites with owners
      const { data: sitesData, error: sitesErr } = await supabase
        .from('monitoring_sites')
        .select('*, site_owners(id, owner_name, contact_number, email, address)')
        .order('site_name', { ascending: true });

      if (sitesErr) throw sitesErr;

      // 2. Fetch devices
      const { data: devicesData, error: devicesErr } = await supabase
        .from('devices')
        .select('*');

      if (devicesErr) throw devicesErr;

      // 3. Fetch recent 14-day telemetry data
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sensorData, error: sensorErr } = await supabase
        .from('sensor_data')
        .select('*')
        .gte('created_at', fourteenDaysAgo)
        .order('created_at', { ascending: false });

      if (sensorErr) throw sensorErr;

      const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const allReadings = sensorData || [];
      const allDevices = devicesData || [];

      // Map site analytics
      const processedSites: SiteAnalyticsData[] = (sitesData || []).map((site: any) => {
        const siteDevices = allDevices.filter((d: any) => d.site_id === site.id);
        const deviceUids = siteDevices.map((d: any) => d.device_uid);
        const siteReadings = allReadings.filter((r: any) => deviceUids.includes(r.device_uid));

        const latestReading = siteReadings[0] || null;
        const readings7Days = siteReadings.filter((r: any) => new Date(r.created_at || r.submitted_at).getTime() >= sevenDaysAgoTime);

        let status: 'normal' | 'warning' | 'critical' = 'normal';
        const ammoniaVal = latestReading?.ammonia;
        if (latestReading?.status === 'critical' || (ammoniaVal !== null && ammoniaVal > 50)) {
          status = 'critical';
        } else if (latestReading?.status === 'warning' || (ammoniaVal !== null && ammoniaVal > 25)) {
          status = 'warning';
        }

        const hasActiveDevice = siteDevices.some((d: any) => d.status === 'ACTIVE');
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const hasRecentReading = latestReading && new Date(latestReading.created_at).getTime() >= twentyFourHoursAgo;
        const deviceStatus: 'Online' | 'Offline' = (hasActiveDevice || hasRecentReading) ? 'Online' : 'Offline';

        const siteType = site.site_type || (site.site_name.toLowerCase().includes('piggery') ? 'Piggery' : site.site_name.toLowerCase().includes('ambient') ? 'Ambient' : 'Industrial');

        // 7-day daily trend
        const dailyGroups: Record<string, number[]> = {};
        readings7Days.forEach((r: any) => {
          if (r.ammonia !== null && r.ammonia !== undefined) {
            const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyGroups[dateStr]) dailyGroups[dateStr] = [];
            dailyGroups[dateStr].push(r.ammonia);
          }
        });

        const trend_7days: { date: string; ammonia: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const vals = dailyGroups[dateStr];
          const avg = vals && vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : (latestReading?.ammonia || 0);
          trend_7days.push({ date: dateStr, ammonia: Math.round(avg * 10) / 10 });
        }

        return {
          id: site.id,
          site_name: site.site_name,
          site_code: site.site_code,
          site_type: siteType,
          address: site.address || 'Address not specified',
          latitude: site.latitude || 14.5995,
          longitude: site.longitude || 120.9842,
          area_size_hectares: site.area_size_hectares || 1.0,
          owner_name: site.site_owners?.owner_name || 'Unassigned',
          owner_contact: site.site_owners?.contact_number,
          owner_email: site.site_owners?.email,
          latest_ammonia: latestReading?.ammonia ?? null,
          latest_temperature: latestReading?.temperature ?? null,
          latest_humidity: latestReading?.humidity ?? null,
          last_reading_at: latestReading ? (latestReading.created_at || latestReading.submitted_at) : null,
          alert_status: status,
          device_status: deviceStatus,
          active_device_count: siteDevices.filter((d: any) => d.status === 'ACTIVE').length,
          devices: siteDevices.map((d: any) => ({ id: d.id, device_uid: d.device_uid, status: d.status, firmware_version: d.firmware_version, installed_at: d.installed_at })),
          reading_count_7days: readings7Days.length,
          trend_7days,
          recent_readings: siteReadings.slice(0, 10).map((r: any) => ({ id: r.id, device_uid: r.device_uid, ammonia: r.ammonia || 0, temperature: r.temperature || 0, humidity: r.humidity || 0, status: r.status || (r.ammonia > 50 ? 'critical' : r.ammonia > 25 ? 'warning' : 'normal'), grid_cell_id: r.grid_cell_id, created_at: r.created_at || r.submitted_at, photo_url: r.photo_url })),
        };
      });

      // Calculate global summary metrics
      setSites(processedSites);
      setGlobalStats({
        totalSites: processedSites.length,
        activeDevices: allDevices.filter((d: any) => d.status === 'ACTIVE').length,
        sitesWithAlerts: processedSites.filter((s) => s.alert_status === 'warning' || s.alert_status === 'critical').length,
        criticalAlerts: processedSites.filter((s) => s.alert_status === 'critical').length,
      });

    } catch (err: any) {
      console.error('Error fetching site analytics:', err);
      setError(err.message || 'Failed to load site analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteAnalytics();
  }, [fetchSiteAnalytics]);

  return { sites, globalStats, loading, error, refresh: fetchSiteAnalytics };
}
