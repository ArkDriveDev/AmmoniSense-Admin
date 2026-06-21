import { Route, Redirect } from 'react-router-dom';
import Setup from '../pages/Setup';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';

import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

export default function AppRouter() {
  return (
    <>
      <Route exact path="/">
        <Redirect to="/setup" />
      </Route>

      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />

      {/* ADMIN AREA */}
      <ProtectedRoute>
        <AdminLayout>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/users" component={() => <div>Users</div>} />
          <Route path="/piggeries" component={() => <div>Piggeries</div>} />
          <Route path="/devices" component={() => <div>Devices</div>} />
          <Route path="/sensor-data" component={() => <div>Sensor Data</div>} />
          <Route path="/notifications" component={() => <div>Notifications</div>} />
        </AdminLayout>
      </ProtectedRoute>
    </>
  );
}