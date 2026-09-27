import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Device, InspectionSite } from '../types/schema';

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Query devices and sites independently to avoid PostgREST PGRST200 foreign key schema cache errors
      const [devRes, sitesRes] = await Promise.all([
        supabase.from('devices').select('*'),
        supabase.from('inspection_sites').select('id, site_name, site_code')
      ]);

      if (devRes.error) throw devRes.error;

      const sitesList = (sitesRes.data || []) as Pick<InspectionSite, 'id' | 'site_name' | 'site_code'>[];
      const sitesMap = new Map<number, Pick<InspectionSite, 'id' | 'site_name' | 'site_code'>>(
        sitesList.map(s => [s.id, s])
      );

      const rawDevices = (devRes.data || []) as Device[];
      const mappedDevices: Device[] = rawDevices.map(d => ({
        ...d,
        inspection_sites: d.inspection_site_id ? sitesMap.get(d.inspection_site_id) || null : null
      }));

      // Sort by installed_at or created_at descending if present
      mappedDevices.sort((a, b) => {
        const timeA = new Date(a.installed_at || a.created_at || 0).getTime();
        const timeB = new Date(b.installed_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setDevices(mappedDevices);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch devices';
      console.error('Error fetching devices:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return { devices, setDevices, loading, error, refresh: fetchDevices, fetchDevices };
}

export default useDevices;