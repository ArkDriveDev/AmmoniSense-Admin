import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setAuthenticated(!!session);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}