import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useCart,
} from "../../context/CartContext";

function navClass({ isActive }) {
  return isActive
    ? "nav-link nav-link--active"
    : "nav-link";
}

function displayCartCount(itemCount) {
  return itemCount > 99 ? "99+" : itemCount;
}

export default function Header() {
  const {
    initialising,
    isAuthenticated,
    user,
  } = useAuth();

  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.toggle("navigation-open", menuOpen);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("navigation-open");
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <Link
          className="site-logo"
          to="/"
          onClick={closeMenu}
          aria-label="Cartify home"
        >
          <span className="site-logo__mark" aria-hidden="true">
            C
          </span>
          <span>CARTIFY</span>
        </Link>

        <button
          className={`site-menu-button ${
            menuOpen ? "site-menu-button--open" : ""
          }`}
          type="button"
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`site-nav ${menuOpen ? "site-nav--open" : ""}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          <NavLink className={navClass} to="/" end onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink className={navClass} to="/shop" onClick={closeMenu}>
            Shop
          </NavLink>

          {!initialising && isAuthenticated && (
            <NavLink className={navClass} to="/cart" onClick={closeMenu}>
              <span>Cart</span>

              {cart.itemCount > 0 && (
                <span
                  className="cart-count"
                  aria-label={`${cart.itemCount} ${
                    cart.itemCount === 1 ? "item" : "items"
                  } in cart`}
                >
                  {displayCartCount(cart.itemCount)}
                </span>
              )}
            </NavLink>
          )}

          {!initialising && isAuthenticated && (
            <NavLink className={navClass} to="/account" onClick={closeMenu}>
              Account
            </NavLink>
          )}

          {!initialising && user?.role === "admin" && (
            <NavLink className={navClass} to="/admin" onClick={closeMenu}>
              Admin
            </NavLink>
          )}

          {!initialising && !isAuthenticated && (
            <NavLink
              className="nav-link nav-link--account"
              to="/login"
              onClick={closeMenu}
            >
              Login
            </NavLink>
          )}
        </nav>
      </div>

      {menuOpen && (
        <button
          className="site-nav-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
