import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const {
    isAuthenticated,
    initialising,
  } = useAuth();

  const location = useLocation();

  if (initialising) {
    return (
      <main className="message-page">
        <p>Checking your session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname + location.search,
        }}
      />
    );
  }

  return <Outlet />;
}