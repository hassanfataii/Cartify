import { useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useWishlist } from "../../context/WishlistContext";

export default function WishlistButton({
  productId,
  className = "wishlist-button",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated } = useAuth();
  const { addItem, removeItem, contains } =
    useWishlist();
  const toast = useToast();

  const [updating, setUpdating] = useState(false);

  const wishlisted = contains(productId);

  async function handleWishlist() {
    if (!isAuthenticated) {
      toast.info("Log in to use your wishlist");

      navigate("/login", {
        state: {
          from: location.pathname,
        },
      });

      return;
    }

    setUpdating(true);

    try {
      const data = wishlisted
        ? await removeItem(productId)
        : await addItem(productId);

      toast.success(data.message);
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to update your wishlist",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <button
      className={`${className} ${
        wishlisted ? "wishlist-button--active" : ""
      }`}
      type="button"
      onClick={handleWishlist}
      disabled={updating}
      aria-pressed={wishlisted}
    >
      <span aria-hidden="true">
        {wishlisted ? "♥" : "♡"}
      </span>

      {updating
        ? "Updating..."
        : wishlisted
          ? "Wishlisted"
          : "Add to wishlist"}
    </button>
  );
}