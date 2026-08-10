import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useLivestock() {
  const [livestock, setLivestock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});

  const fetchLivestock = async () => {
    setLoading(true);
    try {
      // 1. Try querying monitoring_sites table (official schema)
      const { data: sitesData, error: sitesErr } = await supabase
        .from('monitoring_sites')
        .select(`
          *,
          site_owners (
            id,
            owner_name,
            contact_number,
            email,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (!sitesErr && sitesData) {
        setLivestock(sitesData.map(s => ({
          ...s,
          livestock_name: s.site_name,
          livestock_serial: s.site_code,
          location: s.address,
          clients: s.site_owners ? { full_name: s.site_owners.owner_name } : null
        })));

        const counts: Record<number, number> = {};
        for (const item of sitesData) {
          const { count } = await supabase
            .from('devices')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', item.id);
          counts[item.id] = count || 0;
        }
        setDeviceCounts(counts);
        return;
      }

      // 2. Fallback query on livestock table
      const { data: legacyData, error: legacyErr } = await supabase
        .from('livestock')
        .select('*')
        .order('created_at', { ascending: false });

      if (legacyErr) throw legacyErr;
      setLivestock(legacyData || []);
    } catch (err) {
      console.error('Error fetching monitoring sites/livestock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivestock();
  }, []);

  return { livestock, setLivestock, loading, deviceCounts, fetchLivestock };
}