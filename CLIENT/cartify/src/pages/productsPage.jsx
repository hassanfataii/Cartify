import React from "react";
import ProductGrid from "../components/productGrid";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function ProductsPage() {
  const [categories, setCategories] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [products, setProducts] = React.useState([]);
  const [catOpen, setCatOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (selected) params.set("categoryName", selected);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`${API}/api/products${qs}`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  }, [selected]);

  const chooseAll = () => {
    setSelected(null);
    setCatOpen(false);
  };

  const normalizedQ = q.trim().toLowerCase();
  const displayed = normalizedQ
    ? products.filter((p) => {
        const title = String(p?.title || "").toLowerCase();
        const desc = String(p?.description || "").toLowerCase();
        const cat = String(p?.category?.name || p?.category || "").toLowerCase();
        const tags = Array.isArray(p?.tags) ? p.tags.join(" ").toLowerCase() : "";
        return title.includes(normalizedQ) || desc.includes(normalizedQ) || cat.includes(normalizedQ) || tags.includes(normalizedQ);
      })
    : products;

  return (
    <main>
      <section className="shop-section">
        <h2>Shop All Products{selected ? ` — ${selected}` : ""}</h2>

        <form
          className="shop-search"
          onSubmit={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="hamburger"
            aria-label="Open categories"
            onClick={() => setCatOpen(true)}
          >
            <i className="fa-solid fa-bars"></i> Categories
          </button>

          <input
            type="text"
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products"
          />
          <button type="submit" aria-label="Search">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </form>

        <div
          className={`backdrop ${catOpen ? "show" : ""}`}
          onClick={() => setCatOpen(false)}
        />
        <aside
          className={`category-panel ${catOpen ? "open" : ""}`}
          role="dialog"
          aria-label="Shop categories"
        >
          <div className="panel-header">
            <h3>Shop by Category</h3>
            <button
              className="panel-close"
              aria-label="Close categories"
              onClick={() => setCatOpen(false)}
            >
              x
            </button>
          </div>

          <div className="panel-content">
            <div className="categories-grid">
              <button
                className={`cat-card${selected === null ? " active" : ""}`}
                onClick={chooseAll}
              >
                All
              </button>

              {categories.map((c) => (
                <button
                  key={c._id}
                  className={`cat-card${selected === c.name ? " active" : ""}`}
                  onClick={() => {
                    setSelected(c.name);
                    setCatOpen(false);
                  }}
                >
                {c.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <ProductGrid
          products={displayed}
          containerClass="shop-grid"
        />
      </section>
    </main>
  );
}
