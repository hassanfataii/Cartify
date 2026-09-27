import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content container">
        <div className="site-footer__brand">
          <Link
            className="site-logo site-logo--footer"
            to="/"
            aria-label="Cartify home"
          >
            <span className="site-logo__mark" aria-hidden="true">
              C
            </span>
            <span>CARTIFY</span>
          </Link>

          <p>Smart tech, simple shopping, zero nonsense.</p>
        </div>

        <div className="site-footer__links">
          <div>
            <strong>Explore</strong>
            <nav aria-label="Shop navigation">
              <Link to="/">Home</Link>
              <Link to="/shop">Shop</Link>
            </nav>
          </div>

          <div>
            <strong>Your Cartify</strong>
            <nav aria-label="Account navigation">
              <Link to="/account">Account</Link>
              <Link to="/cart">Cart</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom container">
        <p>
          © {new Date().getFullYear()} Cartify. Built for better shopping.
        </p>
        <span>Secure checkout powered by Stripe</span>
      </div>
    </footer>
  );
}
