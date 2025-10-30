import { Route, Switch, Redirect } from "wouter";
import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "@/pages/auth/Login";
import OtpPage from "@/pages/auth/Otp";
import Shell from "@/app/Shell";
// import UserManagementFallback from '@/pages/staff/settings/UserManagementFallback'; // Unused import removed

export default function Routes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/auth/verify" component={OtpPage} />
      <Route path="/staff/:rest*">
        <ProtectedRoute>
          <Shell />
        </ProtectedRoute>
      </Route>
      <Route path="/.replit.dev/staff/:rest*">
        <ProtectedRoute>
          <Shell />
        </ProtectedRoute>
      </Route>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="*" component={() => <Redirect to="/login" />} />
    </Switch>
  );
}

// DEV: ensure this route exists somewhere in your router tree
// <Route path="/staff/settings/user-management" element={<UserManagementFallback/>} />
