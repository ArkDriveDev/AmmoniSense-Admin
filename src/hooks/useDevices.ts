import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useDevices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          piggeries (
            id,
            piggery_name,
            piggery_serial,
            clients (
              id,
              full_name
            )
          )
        `)
        .order('installed_at', { ascending: false });

      if (error) throw error;
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