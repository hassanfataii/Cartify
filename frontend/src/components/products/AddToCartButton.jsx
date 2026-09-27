import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";

export default function AddToCartButton({
  productId,
  stock,
  className = "primary-button",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();

  const [adding, setAdding] = useState(false);

  const outOfStock = stock < 1;

  async function handleAddToCart() {
    if (!isAuthenticated) {
      toast.info("Log in to add products to your cart");

      navigate("/login", {
        state: {
          from: location.pathname,
        },
      });

      return;
    }

    setAdding(true);

    try {
      const data = await addItem(productId, 1);
      toast.success(data.message);
    } catch (error) {
      toast.error(
        error.message || "Unable to add this product",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={handleAddToCart}
      disabled={adding || outOfStock}
    >
      {outOfStock
        ? "Out of stock"
        : adding
          ? "Adding..."
          : "Add to cart"}
    </button>
  );
}