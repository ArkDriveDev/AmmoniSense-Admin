import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function ProtectedRoute({ children }: any) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
          } else {
            const role = profile?.role?.toLowerCase() || '';
            setIsAdmin(role === 'menro_admin' || role === 'admin' || role.includes('admin'));
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
              const role = data?.role?.toLowerCase() || '';
              setIsAdmin(role === 'menro_admin' || role === 'admin' || role.includes('admin'));
            });
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!isAdmin) {
    return <Redirect to="/login" />;
  }

  return children;
}