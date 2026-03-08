import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";

export default function Header() {
  const [open, setOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { clear } = useCart();
  const nav = useNavigate();

  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);
  const doLogout = () => { clear?.(); close(); logout?.(); nav("/"); };

  return (
    <>
      <header>
        <div className="logo">
          <Link to="/" onClick={close}>CARTIFY</Link>
        </div>

        <button
          className="nav-toggle"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <i className="fa fa-bars" />
        </button>

        <nav className="links" onClick={close}>
          <NavLink to="/" end>
            Home <i className="fa-solid fa-house" />
          </NavLink>

          {user && (
            <NavLink to="/profile">
              Profile <i className="fa-solid fa-circle-user" />
            </NavLink>
          )}

          <NavLink to="/shop">
            Shop <i className="fa-solid fa-shop" />
          </NavLink>

          {user && (
            <NavLink to="/cart">
              Cart <i className="fa-solid fa-cart-shopping" />
            </NavLink>
          )}

          {user ? (
            <button className="linklike" onClick={doLogout}>
              Logout <i className="fa-solid fa-right-from-bracket" />
            </button>
          ) : (
            <NavLink to="/login">
              Login <i className="fa-solid fa-right-to-bracket" />
            </NavLink>
          )}
        </nav>
      </header>

      <div className={`nav-backdrop ${open ? "show" : ""}`} onClick={close} />

      <nav className={`nav-panel ${open ? "open" : ""}`} aria-label="Mobile navigation">
        <div className="panel-header">
          <span className="logo">CARTIFY</span>
          <button className="panel-close" aria-label="Close menu" onClick={close}>x</button>
        </div>

        <div className="panel-content">
          <div className="nav-links" onClick={close}>
            <NavLink to="/" end><i className="fa fa-home" /> Home</NavLink>
            {user && <NavLink to="/profile"><i className="fa fa-circle-user" /> Profile</NavLink>}
            <NavLink to="/shop"><i className="fa fa-store" /> Shop</NavLink>
            {user && <NavLink to="/cart"><i className="fa fa-cart-shopping" /> Cart</NavLink>}

            {user ? (
              <button className="linklike" onClick={doLogout}>
                <i className="fa fa-right-from-bracket" /> Logout
              </button>
            ) : (
              <NavLink to="/login"><i className="fa fa-right-to-bracket" /> Login</NavLink>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
