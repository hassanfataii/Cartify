import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/cartContext";
import { useAuth } from "../context/authContext";
import { loadStripe } from "@stripe/stripe-js";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const normalize = (v) => {
  if (typeof v === "number") {
    if (Number.isInteger(v) && v >= 1000) return v / 100;
    return v;
  }
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (s.includes(".")) return Number(s) || 0;
  const n = Number(s.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return n >= 1000 ? n / 100 : n;
};
const fmt = (n) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "0.00";

export default function CheckoutPage() {
  const { cart } = useCart();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const handleCheckout = async () => {
    try {
      if (!cart?.items?.length) return;

      const pk = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
      if (!pk) {
        alert("Missing REACT_APP_STRIPE_PUBLIC_KEY. Set it in your frontend .env and restart the dev server.");
        return;
      }
      const stripe = await loadStripe(pk);

      const res = await fetch(`${API}/api/checkout/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to create checkout session");
        return;
      }

      const { id } = await res.json();
      const { error } = await stripe.redirectToCheckout({ sessionId: id });
      if (error) console.error(error);
    } catch (err) {
      console.error(err);
      alert("Checkout failed to start. Check console for details.");
    }
  };

  return (
    <main>
      <section className="shop-section">
        <h2>Checkout</h2>

        {!cart?.items?.length ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <ul style={{ margin: "16px 0" }}>
              {cart.items.map((i) => {
                const priceEach = normalize(i.product?.price);
                const lineTotal = priceEach * Number(i.quantity || 1);
                return (
                  <li key={i.productId} style={{ marginBottom: 8 }}>
                    {i.product?.title || "Item"} × {i.quantity} = £{fmt(lineTotal)}
                  </li>
                );
              })}
            </ul>

            <h3>Total: £{fmt(Number(cart.grandTotal || 0))}</h3>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => navigate("/cart")}>Back to Cart</button>
              <button className="btn checkout-btn" onClick={handleCheckout}>Pay with Stripe (Demo)</button>
            </div>

            <p style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
              Use test cards like 4242 4242 4242 4242 • any future expiry • any CVC.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
