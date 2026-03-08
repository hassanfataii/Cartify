import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useWishlist } from "../context/wishlistContext";
import { getWishlist } from "../api/wishlist";
import ProductGrid from "../components/productGrid";

export default function WishlistPage() {
  const { token, user } = useAuth();
  const { ids } = useWishlist(); 
  const [items, setItems] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!token) { setItems([]); return; } 
    setItems(null); setError(null);
    getWishlist(token)
      .then(setItems)
      .catch((e) => { 
        console.error(e); 
        setError("Failed to load wishlist"); 
        setItems([]); 
      });
  }, [token, ids]);

  if (!user) {
    return (
      <main>
        <section className="shop-section">
          <h2>Wishlist</h2>
          <p>You're not logged in.</p>
          <Link className="btn" to="/login">Login to view your wishlist</Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="shop-section">
        <h2>Wishlist</h2>

        {items === null ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : items.length === 0 ? (
          <p>Your wishlist is empty. <Link to="/shop">Browse products</Link></p>
        ) : (
          <ProductGrid products={items} containerClass="shop-grid" />
        )}
      </section>
    </main>
  );
}
