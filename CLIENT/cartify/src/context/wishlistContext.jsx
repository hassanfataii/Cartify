import React from "react";
import { useAuth } from "./authContext";
import { toId } from "../utils/toId";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const WishlistContext = React.createContext(null);

export function WishlistProvider({ children }) {
  const { token, loading } = useAuth();
  const [items, setItems] = React.useState([]);

  const refresh = React.useCallback(async () => {
    if (loading || !token) {
      setItems([]);
      return;
    }
    const res = await fetch(`${API}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setItems([]);
      return;
    }
    const list = await res.json().catch(() => []);
    setItems(Array.isArray(list) ? list : []);
  }, [token, loading]);

  React.useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const idStr = (v) => toId(v);

  const isIn = React.useCallback(
    (product) => {
      const pid = idStr(product);
      if (!pid) return false;
      return items.some((it) => idStr(it) === pid || idStr(it?._id) === pid);
    },
    [items]
  );

  const toggle = async (product) => {
    if (loading || !token) return;
    const pid = idStr(product);
    if (!pid) return;

    const present = isIn(pid);
    const method = present ? "DELETE" : "POST";
    const res = await fetch(`${API}/api/wishlist/${encodeURIComponent(pid)}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 204) return;

    await refresh(); 
  };

  const ids = React.useMemo(() => items.map((x) => idStr(x)), [items]);

  return (
    <WishlistContext.Provider value={{ items, ids, isIn, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => React.useContext(WishlistContext);
