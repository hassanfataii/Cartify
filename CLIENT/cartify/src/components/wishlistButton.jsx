import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useWishlist } from "../context/wishlistContext";
import { toId } from "../utils/toId";


export default function WishlistButton({ productId }) {
  const { user } = useAuth();
  const { isIn, toggle } = useWishlist();
  const nav = useNavigate();
  const id = toId(productId);
  const active = isIn(id);

  const onClick = async () => {
    if (!user) { nav("/login"); return; }
    try { await toggle(id); } catch (e) { console.error(e); }
  };

  return (
    <button
      className="wishlist-btn"
      onClick={onClick}
      aria-pressed={active}
      title={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <i className={active ? "fa-solid fa-heart" : "fa-regular fa-heart"} />
    </button>
  );
}
