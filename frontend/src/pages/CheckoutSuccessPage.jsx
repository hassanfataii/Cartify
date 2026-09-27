import { useEffect } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const { refreshCart } = useCart();
  const toast = useToast();

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    refreshCart().catch((error) => {
      toast.error(
        error.message ||
          "Your cart could not be refreshed",
      );
    });
  }, [sessionId, refreshCart, toast]);

  if (!sessionId) {
    return (
      <main className="message-page">
        <p className="eyebrow">Invalid checkout</p>
        <h1>Payment session missing</h1>

        <p>
          We couldn’t identify this Stripe payment.
        </p>

        <Link className="primary-button" to="/cart">
          Return to cart
        </Link>
      </main>
    );
  }

  return (
    <main className="message-page checkout-success">
      <p className="eyebrow">Payment successful</p>
      <h1>Thank you for your order</h1>

      <p>
        Your payment has been confirmed and your order is
        now being processed.
      </p>

      <div className="checkout-success__actions">
        <Link className="primary-button" to="/orders">
          View my orders
        </Link>

        <Link className="secondary-button" to="/shop">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}