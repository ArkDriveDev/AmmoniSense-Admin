import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles (
            id,
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, setClients, loading, fetchClients };
}