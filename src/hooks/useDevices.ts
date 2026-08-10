import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useDevices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // 1. Query devices table referencing monitoring_sites
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          monitoring_sites (
            id,
            site_name,
            site_code,
            current_latitude,
            current_longitude,
            current_grid_cell_id,
            site_owners (
              id,
              owner_name
            )
          )
        `)
        .order('installed_at', { ascending: false });

      if (error) {
        // Fallback: simple devices query without relation join
        const { data: simpleData } = await supabase
          .from('devices')
          .select('*')
          .order('installed_at', { ascending: false });
        setDevices(simpleData || []);
        return;
      }

      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return { devices, setDevices, loading, fetchDevices };
}