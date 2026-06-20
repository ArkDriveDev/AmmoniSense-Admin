import { Route, Redirect } from 'react-router-dom';
import Setup from '../pages/Setup';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';

export default function AppRouter() {
  return (
    <>
      <Route exact path="/">
        <Redirect to="/setup" />
      </Route>

      <Route path="/setup" component={Setup} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
    </>
  );
}