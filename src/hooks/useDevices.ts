import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Device } from '../types/schema';

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: devErr } = await supabase
        .from('devices')
        .select(`
          *,
          inspection_sites (
            id,
            site_name,
            site_code
          )
        `)
        .order('installed_at', { ascending: false });

      if (devErr) {
        // Fallback to select without relational join if FK view evolves
        const { data: rawData, error: rawErr } = await supabase
          .from('devices')
          .select('*')
          .order('created_at', { ascending: false });

        if (rawErr) throw rawErr;
        setDevices(rawData || []);
      } else {
        setDevices(data || []);
      }
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