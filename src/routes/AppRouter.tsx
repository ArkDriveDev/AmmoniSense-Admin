import { Route, Redirect } from "react-router-dom";

import Setup from "../pages/Setup";
import Login from "../pages/Login";
import AdminLayout from "../layouts/AdminLayout";

import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRouter() {
  return (
    <>
      <Route exact path="/">
        <Redirect to="/setup" />
      </Route>

      <Route exact path="/setup" component={Setup} />
      <Route exact path="/login" component={Login} />

      {/* ADMIN AREA */}
      <ProtectedRoute>
        <Route path="/admin" component={AdminLayout} />
      </ProtectedRoute>
    </>
  );
}