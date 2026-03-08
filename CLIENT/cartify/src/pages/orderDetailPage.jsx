import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";

const API =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && window.API_URL) ||
  "http://localhost:5000";

const api = (p) => `${API.replace(/\/+$/, "")}/api${p}`;

const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (!v) return NaN;
  if (typeof v === "object") {
    if (typeof v.$numberLong === "string") return Number(v.$numberLong);
    if (typeof v.$numberDecimal === "string") return Number(v.$numberDecimal);
    if (typeof v.value === "number") return v.value;
    if (typeof v.value === "string") return Number(v.value);
  }
  const s = String(v).trim();
  if (!s) return NaN;
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

const toPounds = (v) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return 0;
  return Number.isInteger(n) ? n / 100 : n;
};
const money = (v) => `£${toPounds(v).toFixed(2)}`;

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = React.useState(null);
  const [error, setError] = React.useState("");
  const [productMap, setProductMap] = React.useState({}); // { productId: productDoc }

  React.useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  React.useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setError("");
        const res = await fetch(api(`/orders/${id}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to load order");
        }
        const o = await res.json();
        setOrder(o || null);
      } catch (e) {
        setError(e.message || "Failed to load order");
      }
    })();
  }, [id, token]);

  // Fetch any missing product details (for image/title/price) by productId
  React.useEffect(() => {
    if (!order) return;
    const items = Array.isArray(order.items) ? order.items : [];
    const ids = Array.from(
      new Set(
        items
          .map((it) => it.productId)
          .filter(Boolean)
          .filter((pid) => !productMap[pid])
      )
    );
    if (!ids.length) return;

    (async () => {
      try {
        const results = await Promise.all(
          ids.map(async (pid) => {
            const r = await fetch(api(`/products/${pid}`));
            if (!r.ok) return [pid, null];
            return [pid, await r.json()];
          })
        );
        const next = { ...productMap };
        results.forEach(([pid, doc]) => { if (pid) next[pid] = doc; });
        setProductMap(next);
      } catch {}
    })();
  }, [order]); // intentionally omit productMap to avoid infinite loop

  if (error) {
    return (
      <main>
        <section className="shop-section">
          <h2>Order</h2>
          <p className="error">{error}</p>
          <p><Link className="btn" to="/orders">Back to Orders</Link></p>
        </section>
      </main>
    );
  }
  if (!order) {
    return (
      <main>
        <section className="shop-section">
          <h2>Order</h2>
          <p>Loading…</p>
        </section>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  // Compute totals robustly
  const derivedSubtotal = items.reduce((sum, it) => {
    const qty = toNumber(it.quantity ?? it.qty ?? 1) || 1;
    const p = it.product || productMap[it.productId] || {};
    const unitCandidates = [
      it.unitPrice, it.price, it.unit_amount, it.unitAmount, it.pricePence, p.price
    ];
    let unit = unitCandidates.map(toNumber).find((n) => Number.isFinite(n) && n > 0);

    if (!Number.isFinite(unit) || unit <= 0) {
      const line = [it.lineTotal, it.total, it.amount_total, it.subtotal, it.priceTotal]
        .map(toNumber)
        .find((n) => Number.isFinite(n) && n > 0) || 0;
      if (line && qty > 0) unit = Math.round(line / qty);
    }
    return sum + (Number.isFinite(unit) ? unit * qty : 0);
  }, 0);

  const subtotal = Number.isFinite(toNumber(order.subtotal)) ? toNumber(order.subtotal) : derivedSubtotal;
  const shipping = toNumber(order.shippingTotal ?? order.shipping ?? 0);
  const discount = toNumber(order.discountTotal ?? order.discount ?? 0);
  const tax = toNumber(order.taxTotal ?? order.tax ?? 0);
  const grand = Number.isFinite(toNumber(order.grandTotal))
    ? toNumber(order.grandTotal)
    : subtotal + shipping - discount + tax;

  return (
    <main>
      <section className="shop-section">
        <h2>Order #{String(order._id || order.id || "").slice(-6).toUpperCase()}</h2>
        <p>Placed: {order.placedAt ? new Date(order.placedAt).toLocaleString() : "-"}</p>
        <p>Status: {order.status || "paid"}</p>

        <div className="order-items" style={{ marginTop: 12 }}>
          {items.map((it, idx) => {
            const p = it.product || productMap[it.productId] || {};
            const img =
              (Array.isArray(p.images) && p.images[0]) ||
              p.image ||
              it.image ||
              "/images/placeholder.jpg";
            const name = p.title || p.name || it.name || it.productId || "Item";
            const qty = toNumber(it.quantity ?? it.qty ?? 1) || 1;

            const unitCandidates = [
              it.unitPrice, it.price, it.unit_amount, it.unitAmount, it.pricePence, p.price
            ];
            let unit = unitCandidates.map(toNumber).find((n) => Number.isFinite(n) && n > 0);

            if (!Number.isFinite(unit) || unit <= 0) {
              const line = [it.lineTotal, it.total, it.amount_total, it.subtotal, it.priceTotal]
                .map(toNumber)
                .find((n) => Number.isFinite(n) && n > 0) || 0;
              if (line && qty > 0) unit = Math.round(line / qty);
            }

            return (
              <div
                className="order-item-row"
                key={String(it.productId || idx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  margin: "8px 0"
                }}
              >
                <img src={img} alt={name} style={{ width: 72, height: 72, objectFit: "contain" }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  {p.sku && <div style={{ color: "#64748b" }}>SKU: {String(p.sku)}</div>}
                </div>
                <div>×{qty}</div>
                <div>{money((Number.isFinite(unit) ? unit : 0) * qty)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <div>Subtotal: {money(subtotal)}</div>
          <div>Shipping: {money(shipping)}</div>
          <div>Discount: -{money(discount)}</div>
          <div>Tax: {money(tax)}</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>Grand Total: {money(grand)}</div>
        </div>

        <p style={{ marginTop: 16 }}>
          <Link className="btn" to="/orders">Back to Orders</Link>
        </p>
      </section>
    </main>
  );
}
