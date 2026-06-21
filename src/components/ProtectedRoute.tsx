import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function ProtectedRoute({ children }: any) {

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    init();

  }, []);

  if (loading) return null; // IMPORTANT (prevents redirect flicker)

  if (!user) return <Redirect to="/login" />;

  return children;
}