import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function Footer() {
  const year = new Date().getFullYear();
  const { user } = useAuth();

  return (
    <footer>
      <div className="footer-grid">
        <div>
          <h4>Cartify</h4>
          <p>Your trusted mini e-commerce store.</p>
        </div>

        <div>
          <h5>Shop</h5>
          <ul>
            <li><Link to="/shop">All Products</Link></li>
            {user && <li><Link to="/wishlist">Wishlist</Link></li>}
            {user && <li><Link to="/cart">Cart</Link></li>}
          </ul>
        </div>

        <div>
          <h5>Company</h5>
          <ul>
            <li><Link to="/faq">FAQs</Link></li>
          </ul>
        </div>

        <div className="footer-social">
          <h5>Follow Us</h5>
          <div className="social-links">
            <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram">
              <i className="fa-brands fa-instagram" />
            </a>
            <a href="https://twitter.com/" target="_blank" rel="noopener" aria-label="X">
              <i className="fa-brands fa-x-twitter" />
            </a>
            <a href="https://facebook.com/" target="_blank" rel="noopener" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in" />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; <span>{year}</span> Cartify. All rights reserved.</p>
      </div>
    </footer>
  );
}
