import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useLivestock() {
  const [livestock, setLivestock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});

  const fetchLivestock = async () => {
    setLoading(true);
    try {
      // 1. Query monitoring_sites without embedded PostgREST joins
      const { data: sitesData, error: sitesErr } = await supabase
        .from('monitoring_sites')
        .select('*');

      if (sitesErr) throw sitesErr;

      // 2. Query site_owners separately with try/catch fallback
      let ownersData: any[] = [];
      try {
        const { data: oData } = await supabase.from('site_owners').select('*');
        if (oData) ownersData = oData;
      } catch (e) {
        console.warn('Could not fetch site_owners in useLivestock:', e);
      }

      const allOwners = ownersData;
      setLivestock((sitesData || []).map(s => {
        const owner = allOwners.find((o: any) => o.id === s.owner_id || o.id === s.client_id);
        const ownerName = owner?.owner_name || owner?.full_name || s.owner_name || 'Unassigned';
        return {
          ...s,
          livestock_name: s.site_name || s.name || `Site #${s.id}`,
          livestock_serial: s.site_code || s.code,
          location: s.address || 'Address not specified',
          clients: { full_name: ownerName }
        };
      }));

      // 3. Query device counts per site
      let devicesData: any[] = [];
      try {
        const { data: dData } = await supabase.from('devices').select('id, site_id');
        if (dData) devicesData = dData;
      } catch (e) {
        console.warn('Could not fetch devices count:', e);
      }

      const counts: Record<number, number> = {};
      for (const item of sitesData || []) {
        counts[item.id] = devicesData.filter((d: any) => d.site_id === item.id).length;
      }
      setDeviceCounts(counts);
    } catch (err) {
      console.error('Error fetching monitoring sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivestock();
  }, []);

  return { livestock, setLivestock, loading, deviceCounts, fetchLivestock };
}