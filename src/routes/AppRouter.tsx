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
      {/* DEFAULT REDIRECT */}
      <Route exact path="/">
        <Redirect to="/setup" />
      </Route>

      {/* PUBLIC ROUTES */}
      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />

      {/* =========================
          ADMIN PROTECTED AREA
      ========================= */}
      <ProtectedRoute>
        <AdminLayout>

          <Route exact path="/dashboard" component={Dashboard} />
          <Route exact path="/clients" component={Clients} />
          <Route exact path="/piggeries" component={Piggeries} />
          <Route exact path="/devices" component={Devices} />
          <Route exact path="/sensor-data" component={SensorData} />
          <Route exact path="/notifications" component={Notifications} />

        </AdminLayout>
      </ProtectedRoute>
    </>
  );
}