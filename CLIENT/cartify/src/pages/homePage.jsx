import React from "react";
import { Link } from "react-router-dom";
import ProductGrid from "../components/productGrid";
import { getTrendingProducts } from "../api/products";

export default function HomePage() {
  const [trending, setTrending] = React.useState([]);
  React.useEffect(() => { getTrendingProducts({ days: 30, limit: 3 }).then(setTrending); }, []);

  return (
    <main>
      <section className="intro">
        <h1>Welcome to Cartify</h1>
        <p>Number 1 online store for any needs</p>
        <Link to="/shop" id="intro-btn">Shop Now</Link>
      </section>

      <section id="trending" className="container">
        <h2>Trending Products</h2>
        <ProductGrid products={trending} containerClass="products" />
      </section>
    </main>
  );
}
