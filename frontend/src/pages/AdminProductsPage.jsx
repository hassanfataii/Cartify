import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminProducts,
} from "../api/admin";

import {
  getCategories,
} from "../api/products";

import AdminProductForm from "../components/forms/AdminProductForm";

import {
  formatCurrency,
} from "../utils/formatCurrency";

function extractCategories(payload) {
  const possibleCategoryArrays = [
    payload,
    payload?.categories,
    payload?.data,
    payload?.data?.categories,
    payload?.items,
  ];

  return (
    possibleCategoryArrays.find(
      Array.isArray,
    ) ?? []
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [searchInput, setSearchInput] =
    useState("");

  const [activeSearch, setActiveSearch] =
    useState("");

  const [
    visibility,
    setVisibility,
  ] = useState("all");

  const [formOpen, setFormOpen] =
    useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadProducts = useCallback(
    async ({
      q = "",
      visibilityFilter = "all",
    } = {}) => {
      const productData =
        await getAdminProducts({
          q,
          visibility:
            visibilityFilter,
        });

      setProducts(
        productData.products,
      );

      return productData;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const categoryData =
          await getCategories();

        if (!cancelled) {
          setCategories(
            extractCategories(
              categoryData,
            ),
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load product categories",
          );
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    loadProducts({
      q: activeSearch,
      visibilityFilter:
        visibility,
    })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load inventory",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeSearch,
    visibility,
    loadProducts,
  ]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    setActiveSearch(
      searchInput.trim(),
    );
  }

  function clearSearch() {
    setSearchInput("");
    setActiveSearch("");
  }

  function handleVisibilityChange(
    event,
  ) {
    setVisibility(
      event.target.value,
    );
  }

  function openCreateForm() {
    setEditingProduct(null);
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setFormOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setEditingProduct(null);
    setFormOpen(false);
  }

  async function handleSaved() {
    await loadProducts({
      q: activeSearch,
      visibilityFilter:
        visibility,
    });

    closeForm();
  }

  return (
    <main className="admin-page">
      <header className="admin-heading admin-heading--actions">
        <div>
          <p className="eyebrow">
            Cartify administration
          </p>

          <h1>
            Products
          </h1>

          <p>
            Search products and manage
            pricing, visibility, images
            and stock.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={openCreateForm}
        >
          Add product
        </button>
      </header>

      {formOpen && (
        <section className="admin-form-panel">
          <AdminProductForm
            product={editingProduct}
            categories={categories}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        </section>
      )}

      <section
        className="admin-product-controls"
        aria-label="Product filters"
      >
        <form
          className="admin-product-search"
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <label htmlFor="admin-product-search">
            Search inventory
          </label>

          <div className="admin-search-input">
            <input
              id="admin-product-search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value,
                )
              }
              placeholder="Product name or CTF number"
            />

            <button
              className="primary-button"
              type="submit"
            >
              Search
            </button>
          </div>
        </form>

        <label className="admin-product-filter">
          <span>
            Visibility
          </span>

          <select
            value={visibility}
            onChange={
              handleVisibilityChange
            }
          >
            <option value="all">
              All products
            </option>

            <option value="active">
              Active only
            </option>

            <option value="hidden">
              Hidden only
            </option>
          </select>
        </label>

        {activeSearch && (
          <button
            className="secondary-button"
            type="button"
            onClick={clearSearch}
          >
            Clear “{activeSearch}”
          </button>
        )}
      </section>

      {error && (
        <p
          className="auth-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <h2>
              Inventory
            </h2>

            <p>
              {loading
                ? "Loading products…"
                : `${products.length} ${
                    products.length === 1
                      ? "product"
                      : "products"
                  } found.`}
            </p>
          </div>
        </div>

        {!loading &&
        products.length === 0 ? (
          <div className="admin-empty-state">
            <h3>
              No products found
            </h3>

            <p>
              Try another product name,
              product number or visibility
              filter.
            </p>

            {(activeSearch ||
              visibility !== "all") && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setActiveSearch("");
                  setVisibility("all");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table admin-product-table">
              <thead>
                <tr>
                  <th>
                    Product
                  </th>

                  <th>
                    Product number
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Visibility
                  </th>

                  <th>
                    Featured
                  </th>

                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          <img
                            src={
                              product
                                .images?.[0]
                            }
                            alt=""
                          />

                          <div>
                            <strong>
                              {
                                product.title
                              }
                            </strong>

                            <span>
                              /{product.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code className="product-number">
                          {product.productNumber ||
                            "Not assigned"}
                        </code>
                      </td>

                      <td>
                        {product.category
                          ?.name ||
                          "Uncategorised"}
                      </td>

                      <td>
                        {formatCurrency(
                          product.priceInPence,
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            product.stock ===
                            0
                              ? "stock-zero"
                              : product.stock <=
                                  10
                                ? "stock-low"
                                : ""
                          }
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-visibility ${
                            product.isActive
                              ? "admin-visibility--active"
                              : "admin-visibility--inactive"
                          }`}
                        >
                          {product.isActive
                            ? "Active"
                            : "Hidden"}
                        </span>
                      </td>

                      <td>
                        {product.isFeatured
                          ? "Yes"
                          : "No"}
                      </td>

                      <td>
                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            openEditForm(
                              product,
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}