import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

// Host/base without the /api suffix
const BASE =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && window.API_URL) ||
  "http://localhost:5000";

// Always call the API with /api prefix
const api = (p) => `${BASE.replace(/\/+$/,"")}/api${p}`;

const oidFrom = (j) => {
  if (!j) return "";
  const v = j.orderId ?? j._id ?? "";
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.$oid || v._id || v.toString?.() || "";
};

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const { token } = useAuth();
  const [status, setStatus] = React.useState("pending");
  const [orderId, setOrderId] = React.useState("");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const s = params.get("session_id") || params.get("sessionId");
    if (!s) {
      setStatus("error");
      setErr("Missing session_id in URL");
      return;
    }

    (async () => {
      try {
        const res = await fetch(api(`/checkout/confirm`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ sessionId: s })
        });

        const text = await res.text();
        let payload = {};
        try { payload = JSON.parse(text); } catch {}

        if (!res.ok) {
          setStatus("error");
          setErr(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
          return;
        }

        const oid = oidFrom(payload);
        if (oid) setOrderId(oid);
        setStatus("ok");
      } catch (e) {
        setStatus("error");
        setErr(e?.message || "Network error");
      }
    })();
  }, [params, token]);

  return (
    <main className="container">
      <h2>Payment complete</h2>
      {status === "pending" && <p>Finalizing your order…</p>}
      {status === "error" && (
        <>
          <p>We couldn’t confirm your payment. Please check your orders.</p>
          {err ? <pre style={{whiteSpace:"pre-wrap"}}>{err}</pre> : null}
          <p><Link to="/orders">Go to Orders</Link></p>
        </>
      )}
      {status === "ok" && (
        <p>
          Your order has been placed{orderId ? ` (#${orderId.slice(-6).toUpperCase()})` : ""}.{" "}
          <Link to="/orders">View orders</Link>
        </p>
      )}
    </main>
  );
}
