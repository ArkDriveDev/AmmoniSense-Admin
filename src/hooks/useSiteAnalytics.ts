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

    } catch (err: any) {
      console.error('Error fetching site analytics:', err);
      setError(err.message || 'Failed to load site analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { sites, globalStats, loading, error, refresh: fetchSiteAnalytics };
}
