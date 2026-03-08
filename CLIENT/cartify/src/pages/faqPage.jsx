import React from "react";
import { Link } from "react-router-dom";

export default function FaqPage() {
  return (
    <main>
      <section className="container">
        <h1>Frequently Asked Questions</h1>

        <div className="faq">
          <details>
            <summary>How do I place an order?</summary>
            <p>
              Browse products in the <Link to="/shop">shop</Link>, add items to your cart, then proceed
              to checkout. After payment you’ll be redirected to an order confirmation page.
            </p>
          </details>

          <details>
            <summary>What payment methods do you accept?</summary>
            <p>
              This project uses Stripe in <em>test mode</em>. Use test cards (e.g. 4242&nbsp;4242&nbsp;4242&nbsp;4242)
              with any future expiry date and any CVC to complete checkout.
            </p>
          </details>

          <details>
            <summary>Can I track my order?</summary>
            <p>
              After a successful payment you'll see a link to your order. You can also find it any time under{" "}
              <Link to="/orders">My Orders</Link>.
            </p>
          </details>

          <details>
            <summary>Do I need an account?</summary>
            <p>
              Yes — sign in to add items to your wishlist, manage your cart across devices, and view your
              orders on the <Link to="/profile">profile</Link> page.
            </p>
          </details>

          <details>
            <summary>How is stock handled?</summary>
            <p>
              Each product shows available stock. The cart prevents adding more than the available stock, and stock is
              reserved when your order is confirmed.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
