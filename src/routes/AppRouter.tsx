import { Route, Redirect } from 'react-router-dom';

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
  return (
    <>

      {/* ROOT */}
      <Route exact path="/">
        <Redirect to="/setup" />
      </Route>

      {/* PUBLIC */}
      <Route exact path="/setup" component={Setup} />
      <Route exact path="/login" component={Login} />

      {/* ADMIN WRAPPED ROUTES (IMPORTANT FIX) */}
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

    </>
  );
}