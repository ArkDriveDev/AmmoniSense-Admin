import { Route, Redirect, Switch } from 'react-router-dom';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminInspectionSites from '../pages/AdminInspectionSites';
import InspectionSchedules from '../pages/InspectionSchedules';
import SensorData from '../pages/SensorData';
import Devices from '../pages/Devices';
import Notifications from '../pages/Notifications';

import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

export default function AppRouter() {
  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/login" />
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
        path="/inspection-sites"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminInspectionSites />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/inspection-schedules"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <InspectionSchedules />
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
        path="/notifications"
        render={() => (
          <ProtectedRoute>
            <AdminLayout>
              <Notifications />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />

      {/* Backward-compatibility aliases */}
      <Route exact path="/livestock">
        <Redirect to="/inspection-sites" />
      </Route>

      <Route exact path="/inspection-tags">
        <Redirect to="/sensor-data" />
      </Route>

      <Route exact path="/admin/tags">
        <Redirect to="/sensor-data" />
      </Route>

      {/* Fallback route for unknown paths */}
      <Route render={() => <Redirect to="/login" />} />
    </Switch>
  );
}