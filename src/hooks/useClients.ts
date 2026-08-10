import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: ownersData, error: ownersErr } = await supabase
        .from('site_owners')
        .select('*')
        .order('created_at', { ascending: false });

      if (ownersErr) throw ownersErr;

      setClients((ownersData || []).map(o => ({
        ...o,
        full_name: o.owner_name,
        phone: o.contact_number,
        email: o.email,
        organization_name: o.address
      })));
    } catch (err) {
      console.error('Error fetching site owners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, setClients, loading, fetchClients };
}