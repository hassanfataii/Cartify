import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import WishlistButton from "../components/wishlistButton";
import { toId } from "../utils/toId";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function toNumberLike(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.replace(/[^0-9.-]/g, "");
    return s ? Number(s) : NaN;
  }
  if (typeof v === "object") {
    if (typeof v.$numberLong === "string") return Number(v.$numberLong);
    if (typeof v.$numberInt === "string") return Number(v.$numberInt);
    if (typeof v.$numberDecimal === "string") return Number(v.$numberDecimal);
    if (v._bsontype === "Decimal128" && typeof v.toString === "function") return Number(v.toString());
    if ("amount" in v) return toNumberLike(v.amount);
    if ("value" in v) return toNumberLike(v.value);
    if ("price" in v) return toNumberLike(v.price);
  }
  return NaN;
}
function toPence(value) {
  const n = toNumberLike(value);
  if (!Number.isFinite(n)) return 0;
  return Number.isInteger(n) ? n : Math.round(n * 100);
}
const fmtMoney = (p) => (toPence(p) / 100).toFixed(2);

function Toast({ text, type, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`toast ${type || "info"}`}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        padding: "10px 14px",
        borderRadius: 8,
        background: type === "error" ? "#fee2e2" : "#ecfdf5",
        color: type === "error" ? "#991b1b" : "#065f46",
        boxShadow: "0 4px 14px rgba(0,0,0,.12)",
        zIndex: 9999,
      }}
    >
      {text}
    </div>
  );
}

export default function CartPage() {
  const { token, user } = useAuth();
  const { cart, refresh, removeItem } = useCart();
  const navigate = useNavigate();

  const [addrLoading, setAddrLoading] = React.useState(true);
  const [addresses, setAddresses] = React.useState([]);
  const [addrErr, setAddrErr] = React.useState("");
  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setAddrLoading(true);
        setAddrErr("");
        const res = await fetch(`${API}/api/users/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load addresses");
        const list = await res.json();
        setAddresses(Array.isArray(list) ? list : []);
      } catch (e) {
        setAddrErr(e.message || "Failed to load addresses");
      } finally {
        setAddrLoading(false);
      }
    })();
  }, [user, token]);

  if (!user) {
    return (
      <main className="container mt-8 mb-8">
        <section className="shop-section">
          <h2>Cart</h2>
          <p>You're not logged in.</p>
          <Link className="btn" to="/login">Login to view your cart</Link>
        </section>
      </main>
    );
  }

  const hasAddress = !addrLoading && addresses.length > 0;

  const setQty = async (productId, newQty) => {
    if (!token) return;
    const pid = toId(productId);
    setBusyId(pid);
    try {
      const qty = Math.max(1, Number(newQty || 1));
      const res = await fetch(`${API}/api/cart/items/${encodeURIComponent(pid)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quantity: qty }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update quantity");
      }
      await refresh?.();
    } catch (e) {
      setToast({ text: e.message || "Failed to update", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const inc = (productId, current, stock) => setQty(productId, Math.min(stock ?? Infinity, Number(current || 1) + 1));
  const dec = (productId, current) => setQty(productId, Math.max(1, Number(current || 1) - 1));

  const remove = async (productId) => {
    const pid = toId(productId);
    setBusyId(pid);
    try {
      const res = await removeItem(pid);
      if (!res?.ok) throw new Error(res?.error || "Failed to remove item");
      setToast({ text: "Removed from cart" });
    } catch (e) {
      setToast({ text: e.message || "Failed to remove", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const subtotalP = toPence(cart?.subtotal || 0);
  const shippingP = toPence(cart?.shippingTotal || 0);
  const grandP = toPence(cart?.grandTotal || (cart?.subtotal || 0) + (cart?.shippingTotal || 0));

  return (
    <main className="container mt-8 mb-8">
      <section className="shop-section">
        <h2>Your Cart</h2>

        {cart?.items?.length ? (
          <>
            <div className="shop-grid">
              {cart.items.map((i) => {
                const p = i.product || {};
                const pid = toId(i.productId || p._id);
                const img = Array.isArray(p.images) && p.images.length ? p.images[0] : "/images/placeholder.jpg";
                const qty = Number(i.quantity || 1);
                const busy = busyId === pid;
                const rawStock = i.product?.stock ?? p.stock ?? i.stock;
                const stock = Number.isFinite(Number(rawStock)) ? Number(rawStock) : toNumberLike(rawStock);
                const priceEachP = toPence(p.price);
                const lineP = priceEachP * qty;

                return (
                  <div className="product-card" key={pid} style={{ position: "relative" }}>
                    <WishlistButton productId={pid} />
                    <img src={img} alt={p.title || "Item"} />
                    <h3>{p.title || "Item"}</h3>
                    <p>£{fmtMoney(priceEachP)}</p>
                    <p style={{ marginTop: -6, color: "#64748b", fontSize: 13 }}>
                      Stock: {Number.isFinite(stock) ? stock : "N/A"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 8 }}>
                      <button className="btn" disabled={busy} onClick={() => dec(pid, qty)} aria-label="Decrease quantity">−</button>
                      <input
                        type="number"
                        min={1}
                        max={stock ?? undefined}
                        value={qty}
                        onChange={(e) => setQty(pid, e.target.value)}
                        style={{ width: 64, textAlign: "center", padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                        disabled={busy}
                      />
                      <button className="btn" disabled={busy} onClick={() => inc(pid, qty, stock)} aria-label="Increase quantity">+</button>
                    </div>
                    <button className="btn" style={{ marginTop: 10 }} disabled={busy} onClick={() => remove(pid)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="cart-summary">
              <p>Subtotal: £{fmtMoney(subtotalP)}</p>
              <p>Shipping: £{fmtMoney(shippingP)}</p>
              <p className="grand">Total: £{fmtMoney(grandP)}</p>
              {!addrLoading && !hasAddress && (
                <div
                  style={{
                    margin: "8px 0 0",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#7c2d12",
                  }}
                >
                  <strong>Before you checkout:</strong> please add a delivery address.{" "}
                  <Link to="/profile#addresses">Go to your Address Book</Link>.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn checkout-btn"
                  onClick={() => (hasAddress ? navigate("/checkout") : navigate("/profile#addresses"))}
                  disabled={!hasAddress}
                  title={!hasAddress ? "Add an address first" : "Proceed to checkout"}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>Your cart is empty. <Link to="/shop">Browse products</Link></p>
        )}
      </section>
      {toast && <Toast text={toast.text} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  );
}
