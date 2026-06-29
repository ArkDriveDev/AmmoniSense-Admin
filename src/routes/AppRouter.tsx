import { Route, Redirect, Switch } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

import Setup from '../pages/Setup';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Clients from '../pages/Clients';
import Piggeries from '../pages/Piggeries';
import Devices from '../pages/Devices';
import SensorData from '../pages/SensorData';
import Notifications from '../pages/Notifications';

import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

export default function AppRouter() {
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      console.log('AppRouter: Checking if admin exists via RPC...');
      
      const { data, error } = await supabase
        .rpc('check_admin_exists');

      console.log('AppRouter: RPC Result:', data, error);

      if (error) {
        console.error('AppRouter: RPC Error:', error);
        setHasAdmin(false);
      } else {
        setHasAdmin(data === true);
      }
    } catch (err) {
      console.error('AppRouter: Unexpected error:', err);
      setHasAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route exact path="/">
        {hasAdmin ? <Redirect to="/login" /> : <Redirect to="/setup" />}
      </Route>

      <Route exact path="/setup">
        {hasAdmin ? <Redirect to="/login" /> : <Setup />}
      </Route>

      <Route exact path="/login" component={Login} />

      <Route
        path="/dashboard"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/clients"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Clients />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/piggeries"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Piggeries />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/devices"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Devices />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/sensor-data"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <SensorData />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/notifications"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Notifications />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />
    </Switch>
  );
}