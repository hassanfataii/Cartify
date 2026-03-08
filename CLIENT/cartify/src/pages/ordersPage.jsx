import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

const BASE =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && window.API_URL) ||
  "http://localhost:5000";

const api = (p) => {
  const b = String(BASE || "").replace(/\/+$/, "");
  return /\/api(?:\/|$)/.test(b) ? `${b}${p}` : `${b}/api${p}`;
};

const normalizePounds = (v) => {
  if (typeof v === "number") return Number.isInteger(v) ? v / 100 : v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (s.includes(".")) return Number(s) || 0;
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n / 100 : 0;
};
const fmtMoney = (v) => `£${normalizePounds(v).toFixed(2)}`;
const code = (id) => `#${String(id || "").slice(-6).toUpperCase()}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(api("/orders/mine"), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        setOrders(Array.isArray(list) ? list : []);
      } catch (e) {
        setError(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <main className="container">
      <h2>Your Orders</h2>
      {loading && <p>Loading…</p>}
      {error && <p className="auth-error">Failed to load orders</p>}
      {!loading && !orders.length && <p>You have no orders yet.</p>}
      {!!orders.length && (
        <div className="orders-table">
          <div className="orders-row head">
            <span>Order #</span>
            <span>Date</span>
            <span>Status</span>
            <span>Total</span>
            <span>Action</span>
          </div>
          {orders.map((o) => (
            <div key={o._id || o.id} className="orders-row">
              <span>{code(o._id || o.id)}</span>
              <span>{fmtDate(o.placedAt)}</span>
              <span>{o.status}</span>
              <span>{fmtMoney(o.grandTotal)}</span>
              <span>
                <Link to={`/orders/${o._id || o.id}`}>View</Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
