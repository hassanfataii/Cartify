import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function AdminRoute() {
  const {
    user,
    initialising,
  } = useAuth();

  const location = useLocation();

  if (initialising) {
    return (
      <main className="message-page">
        <p>
          Checking administrator access...
        </p>
      </main>
    );
  }

  if (!user) {
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

  if (user.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Outlet />;
}