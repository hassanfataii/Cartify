import { Link } from "react-router-dom";

import AddToCartButton from "../components/products/AddToCartButton";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { formatCurrency } from "../utils/formatCurrency";

export default function WishlistPage() {
  const {
    wishlist,
    loading,
    removeItem,
  } = useWishlist();

  const toast = useToast();

  async function handleRemove(item) {
    try {
      const data = await removeItem(item.productId);
      toast.success(data.message);
    } catch (error) {
      toast.error(
        error.message ||
          "Unable to remove this product",
      );
    }
  }

  if (loading) {
    return (
      <main className="message-page">
        <p>Loading your wishlist...</p>
      </main>
    );
  }

  if (wishlist.items.length === 0) {
    return (
      <main className="message-page wishlist-empty">
        <p className="eyebrow">Saved products</p>
        <h1>Your wishlist is empty</h1>

        <p>
          Save products here before your bank account
          starts asking questions.
        </p>

        <Link className="primary-button" to="/shop">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="wishlist-page">
      <div className="wishlist-heading">
        <p className="eyebrow">Saved products</p>
        <h1>Your wishlist</h1>

        <p>
          {wishlist.itemCount}{" "}
          {wishlist.itemCount === 1
            ? "product"
            : "products"}
        </p>
      </div>

      <section className="wishlist-grid">
        {wishlist.items.map((item) => (
          <article
            className="wishlist-card"
            key={item.productId}
          >
            <Link
              className="wishlist-card__image"
              to={`/products/${item.slug}`}
            >
              <img src={item.image} alt={item.title} />
            </Link>

            <div className="wishlist-card__content">
              <Link to={`/products/${item.slug}`}>
                <h2>{item.title}</h2>
              </Link>

              <p className="wishlist-card__description">
                {item.description}
              </p>

              <strong>
                {formatCurrency(item.priceInPence)}
              </strong>

              <span>
                {item.stock > 0
                  ? `${item.stock} available`
                  : "Out of stock"}
              </span>

              <div className="wishlist-card__actions">
                <AddToCartButton
                  productId={item.productId}
                  stock={item.stock}
                />

                <button
                  className="wishlist-card__remove"
                  type="button"
                  onClick={() => handleRemove(item)}
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}