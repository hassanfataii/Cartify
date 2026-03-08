import React from "react";
import { Link } from "react-router-dom";

export default function CheckoutCancel() {
  return (
    <main>
      <section className="shop-section">
        <h2>Payment Cancelled</h2>
        <p>You can review your cart and try again.</p>
        <Link className="btn" to="/cart">Back to Cart</Link>
      </section>
    </main>
  );
}
