import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useLivestock() {
  const [livestock, setLivestock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});

  const fetchLivestock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('livestock')
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

      setLivestock(data || []);

      const counts: Record<number, number> = {};
      for (const item of data || []) {
        const { count } = await supabase
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .eq('livestock_id', item.id);
        counts[item.id] = count || 0;
      }
      setDeviceCounts(counts);
    } catch (err) {
      console.error('Error fetching livestock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivestock();
  }, []);

  return { livestock, setLivestock, loading, deviceCounts, fetchLivestock };
}