import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function usePiggeries() {
  const [piggeries, setPiggeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});

  const fetchPiggeries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('piggeries')
        .select(`
          *,
          clients (
            id,
            full_name,
            email,
            organization_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPiggeries(data || []);

      const counts: Record<number, number> = {};
      for (const piggery of data || []) {
        const { count } = await supabase
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .eq('piggery_id', piggery.id);
        counts[piggery.id] = count || 0;
      }
      setDeviceCounts(counts);
    } catch (err) {
      console.error('Error fetching piggeries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPiggeries();
  }, []);

  return { piggeries, setPiggeries, loading, deviceCounts, fetchPiggeries };
}