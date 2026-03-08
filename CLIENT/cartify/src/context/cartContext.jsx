// CLIENT/cartify/src/context/cartContext.jsx
import React from "react";
import { useAuth } from "./authContext";
import { toId } from "../utils/toId";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const CartContext = React.createContext(null);

const EMPTY = {
  items: [],
  totalQty: 0,
  totalPrice: 0,
  subtotal: 0,
  shippingTotal: 0,
  grandTotal: 0,
};

export function CartProvider({ children }) {
  const { token, loading } = useAuth();
  const [cart, setCart] = React.useState(EMPTY);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (loading || !token) {
      setCart(EMPTY);
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`${API}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCart(EMPTY);
        return;
      }
      const data = await res.json();
      setCart({
        items: Array.isArray(data?.items) ? data.items : [],
        totalQty: Number(data?.totalQty || 0),
        totalPrice: Number(data?.totalPrice || data?.total || 0),
        subtotal: Number(data?.subtotal || 0),
        shippingTotal: Number(data?.shippingTotal || 0),
        grandTotal: Number(data?.grandTotal || 0),
      });
    } finally {
      setBusy(false);
    }
  }, [token, loading]);

  React.useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const addItem = async (productId, qty = 1) => {
    if (loading || !token) return { ok: false };
    const pid = toId(productId);
    const res = await fetch(`${API}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId: pid, quantity: Number(qty) || 1 }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j?.error || "Failed to add" };
    }
    await refresh();
    return { ok: true };
  };

  const updateItem = async (productId, qty) => {
    if (loading || !token) return { ok: false };
    const pid = toId(productId);
    const res = await fetch(`${API}/api/cart/items/${encodeURIComponent(pid)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity: Number(qty) || 1 }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j?.error || "Failed to update" };
    }
    await refresh();
    return { ok: true };
  };

  const removeItem = async (productId) => {
    if (loading || !token) return { ok: false };
    const pid = toId(productId);
    const res = await fetch(`${API}/api/cart/items/${encodeURIComponent(pid)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j?.error || "Failed to remove" };
    }
    await refresh();
    return { ok: true };
  };

  const clear = async () => {
    if (!token) {
      setCart(EMPTY);
      return { ok: true };
    }
    const res = await fetch(`${API}/api/cart`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCart(EMPTY);
    return { ok: res.ok };
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading: busy,
        refresh,
        add: addItem,     
        addItem,
        updateItem,
        removeItem,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => React.useContext(CartContext);
