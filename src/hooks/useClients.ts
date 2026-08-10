import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      // 1. Try querying site_owners table (official schema)
      const { data: ownersData, error: ownersErr } = await supabase
        .from('site_owners')
        .select('*')
        .order('created_at', { ascending: false });

      if (!ownersErr && ownersData) {
        setClients(ownersData.map(o => ({
          ...o,
          full_name: o.owner_name,
          phone: o.contact_number,
          email: o.email,
          organization_name: o.address
        })));
        return;
      }

      // 2. Fallback query on clients table if site_owners query fails
      const { data: clientsData, error: clientsErr } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsErr) throw clientsErr;
      setClients(clientsData || []);
    } catch (err) {
      console.error('Error fetching site owners/clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, setClients, loading, fetchClients };
}