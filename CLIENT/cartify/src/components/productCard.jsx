import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useCart } from "../context/cartContext";
import { formatPrice } from "../utils/formatPrice";
import { toId } from "../utils/toId";
import WishlistButton from "./wishlistButton";

function firstImage(p) {
  if (!p) return "";
  if (p.image) return p.image;
  if (Array.isArray(p.images) && p.images.length) return p.images[0];
  if (typeof p.images === "string") return p.images;
  return "";
}

function MiniToast({ show }) {
  if (!show) return null;
  return (
    <span className="mini-toast" style={{ marginLeft: 8, fontSize: 12 }}>
      Added
    </span>
  );
}

export default function ProductCard({ product, quantity }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();

  const [busy, setBusy] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

  const pid = toId(product?._id);
  const img = firstImage(product);

  const handleAdd = async () => {
    if (!user) {
      nav("/login");
      return;
    }
    if (!pid) return;
    setBusy(true);
    try {
      const r = await add(pid, quantity || 1);
      if (r && r.ok) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="product-card">
      <WishlistButton productId={pid || product?._id} />
      <img src={img} alt={product?.title || "Product"} />
      <h3>{product?.title || "Product"}</h3>
      <p>{formatPrice(product?.price)}</p>
      <button onClick={handleAdd} disabled={busy}>Add to Cart</button>
      <MiniToast show={justAdded} />
    </div>
  );
}
