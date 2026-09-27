import {
  useState,
} from "react";

import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useToast,
} from "../../context/ToastContext";

function adminNavClass({
  isActive,
}) {
  return isActive
    ? "admin-shell-link admin-shell-link--active"
    : "admin-shell-link";
}

export default function AdminLayout() {
  const {
    user,
    logout,
  } = useAuth();

  const toast = useToast();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();

      toast.success(
        "You’ve been logged out.",
      );

      navigate("/");
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to log out",
      );

      setLoggingOut(false);
    }
  }

  return (
    <div className="admin-shell">
      <button
        className={`admin-shell-overlay ${
          menuOpen
            ? "admin-shell-overlay--visible"
            : ""
        }`}
        type="button"
        aria-label="Close administrator menu"
        onClick={closeMenu}
      />

      <aside
        className={`admin-sidebar ${
          menuOpen
            ? "admin-sidebar--open"
            : ""
        }`}
      >
        <div className="admin-sidebar__heading">
          <Link
            className="admin-sidebar__logo"
            to="/admin"
            onClick={closeMenu}
          >
            CARTIFY
          </Link>

          <span>
            Administration
          </span>
        </div>

        <nav
          className="admin-shell-navigation"
          aria-label="Administrator navigation"
        >
          <NavLink
            className={adminNavClass}
            to="/admin"
            end
            onClick={closeMenu}
          >
            <span aria-hidden="true">
              ◫
            </span>

            Dashboard
          </NavLink>

          <NavLink
            className={adminNavClass}
            to="/admin/products"
            onClick={closeMenu}
          >
            <span aria-hidden="true">
              ◇
            </span>

            Products
          </NavLink>

          <NavLink
            className={adminNavClass}
            to="/admin/orders"
            onClick={closeMenu}
          >
            <span aria-hidden="true">
              ▤
            </span>

            Orders
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <span
              className="admin-user-avatar"
              aria-hidden="true"
            >
              {user?.firstName
                ?.charAt(0)
                .toUpperCase() || "A"}
            </span>

            <div>
              <strong>
                {user?.firstName}{" "}
                {user?.lastName}
              </strong>

              <span>
                Administrator
              </span>
            </div>
          </div>

          <Link
            className="admin-shell-link"
            to="/"
            onClick={closeMenu}
          >
            <span aria-hidden="true">
              ←
            </span>

            Return to store
          </Link>

          <Link
            className="admin-shell-link"
            to="/account"
            onClick={closeMenu}
          >
            <span aria-hidden="true">
              ○
            </span>

            My account
          </Link>

          <button
            className="admin-shell-link admin-logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span aria-hidden="true">
              ↪
            </span>

            {loggingOut
              ? "Logging out…"
              : "Logout"}
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="admin-menu-button"
            type="button"
            aria-label={
              menuOpen
                ? "Close administrator menu"
                : "Open administrator menu"
            }
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>

          <div>
            <span>
              Signed in as
            </span>

            <strong>
              {user?.email}
            </strong>
          </div>

          <Link
            className="admin-store-link"
            to="/"
          >
            View store
            <span aria-hidden="true">
              ↗
            </span>
          </Link>
        </header>

        <div className="admin-shell__page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}