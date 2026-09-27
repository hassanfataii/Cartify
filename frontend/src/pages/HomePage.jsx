import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  getBestSellingProducts,
} from "../api/products";

import ProductCard from "../components/products/ProductCard";

const categories = [
  {
    number: "01",
    name: "Electronics",
    slug: "electronics",
    description: "Everyday technology, displays and smart devices.",
  },
  {
    number: "02",
    name: "Gaming",
    slug: "gaming",
    description: "Consoles, games and performance-focused hardware.",
  },
  {
    number: "03",
    name: "Accessories",
    slug: "accessories",
    description: "The useful extras that complete your setup.",
  },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBestSellers() {
      setLoading(true);
      setError("");

      try {
        const response = await getBestSellingProducts(
          controller.signal,
        );

        setProducts(response.data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError.message || "Unable to load best sellers",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBestSellers();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero__content container">
          <p className="eyebrow">Technology made simple</p>

          <h1>Find the tech that fits your life.</h1>

          <p className="home-hero__description">
            Explore gaming, electronics and everyday accessories chosen for
            performance, practicality and value.
          </p>

          <div className="home-hero__actions">
            <Link className="primary-button" to="/shop">
              Shop all products
            </Link>

            <a className="secondary-button" href="#best-sellers">
              Explore best sellers
            </a>
          </div>
        </div>
      </section>

      <section className="home-products-section" id="best-sellers">
        <div className="container">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Customer favourites</p>
              <h2>Best-selling products</h2>
              <p>The five products Cartify customers have purchased most.</p>
            </div>

            <Link className="section-heading__link" to="/shop">
              Shop everything
              <span aria-hidden="true">→</span>
            </Link>
          </header>

          {loading && (
            <div className="home-products-status" role="status">
              <p>Loading customer favourites…</p>
            </div>
          )}

          {!loading && error && (
            <div className="home-products-status" role="alert">
              <h3>Best sellers are temporarily unavailable</h3>
              <p>{error}</p>
              <Link className="secondary-button" to="/shop">
                Browse the shop
              </Link>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="home-products-status">
              <h3>The leaderboard is warming up</h3>
              <p>
                Browse the catalogue while customers discover their
                favourites.
              </p>
              <Link className="primary-button" to="/shop">
                Browse products
              </Link>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="home-product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id ?? product.id}
                  product={product}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-categories-section">
        <div className="container">
          <header className="section-heading">
            <div>
              <p className="eyebrow">Find your department</p>
              <h2>Shop by category</h2>
              <p>Go straight to the technology you came for.</p>
            </div>
          </header>

          <div className="category-card-grid">
            {categories.map((category) => (
              <Link
                className="category-card"
                to={`/shop?category=${category.slug}`}
                key={category.slug}
              >
                <span className="category-card__number">
                  {category.number}
                </span>

                <div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>

                <strong aria-hidden="true">→</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div className="container home-final-cta__content">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2>Your next upgrade is waiting.</h2>
          </div>

          <Link className="primary-button" to="/shop">
            Explore Cartify
          </Link>
        </div>
      </section>
    </main>
  );
}
