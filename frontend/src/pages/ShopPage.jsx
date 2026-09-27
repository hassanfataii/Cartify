import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useSearchParams,
} from "react-router-dom";

import {
  getCategories,
  getProducts,
} from "../api/products";
import ProductCard from "../components/products/ProductCard";

export default function ShopPage() {
  const [
    searchParameters,
    setSearchParameters,
  ] = useSearchParams();

  const query =
    searchParameters.get("q") || "";

  const category =
    searchParameters.get("category") || "";

  const sort =
    searchParameters.get("sort") ||
    "newest";

  const page = Math.max(
    Number(
      searchParameters.get("page") || 1,
    ),
    1,
  );

  const [products, setProducts] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [pagination, setPagination] =
    useState(null);

  const [searchInput, setSearchInput] =
    useState(query);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const updateParameter = useCallback(
    (name, value) => {
      const nextParameters =
        new URLSearchParams(
          searchParameters,
        );

      if (value) {
        nextParameters.set(name, value);
      } else {
        nextParameters.delete(name);
      }

      if (name !== "page") {
        nextParameters.delete("page");
      }

      setSearchParameters(nextParameters);
    },
    [
      searchParameters,
      setSearchParameters,
    ],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    getCategories(controller.signal)
      .then((response) => {
        setCategories(
          Array.isArray(response.data)
            ? response.data
            : [],
        );
      })
      .catch((requestError) => {
        if (
          requestError.name !==
          "AbortError"
        ) {
          console.error(requestError);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const nextQuery =
        searchInput.trim();

      if (nextQuery !== query) {
        updateParameter(
          "q",
          nextQuery,
        );
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    searchInput,
    query,
    updateParameter,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const response =
          await getProducts(
            {
              q: query,
              category,
              sort,
              page,
              limit: 12,
            },
            controller.signal,
          );

        setProducts(
          Array.isArray(response.data)
            ? response.data
            : [],
        );

        setPagination(
          response.pagination ?? null,
        );
      } catch (requestError) {
        if (
          requestError.name !==
          "AbortError"
        ) {
          setError(
            requestError.message ||
              "Unable to load products",
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [
    query,
    category,
    sort,
    page,
  ]);

  return (
    <main className="shop-page">
      <section className="shop-heading">
        <p className="eyebrow">
          Cartify catalogue
        </p>

        <h1>Shop all products</h1>

        <p>
          Find your next bit of tech without
          fighting the website.
        </p>
      </section>

      <section
        className="shop-controls"
        aria-label="Product filters"
      >
        <label>
          <span>Search</span>

          <input
            type="search"
            placeholder="Search products"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>Category</span>

          <select
            value={category}
            onChange={(event) =>
              updateParameter(
                "category",
                event.target.value,
              )
            }
          >
            <option value="">
              All categories
            </option>

            {categories.map((item) => (
              <option
                value={item.slug}
                key={item._id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sort</span>

          <select
            value={sort}
            onChange={(event) =>
              updateParameter(
                "sort",
                event.target.value,
              )
            }
          >
            <option value="newest">
              Newest
            </option>

            <option value="price-asc">
              Price: low to high
            </option>

            <option value="price-desc">
              Price: high to low
            </option>

            <option value="title">
              Product name
            </option>
          </select>
        </label>
      </section>

      {loading && (
        <p role="status">
          Loading products…
        </p>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        products.length === 0 && (
          <p>
            No products matched your
            filters.
          </p>
        )}

      {!loading &&
        !error &&
        products.length > 0 && (
          <>
            <p>
              {pagination?.totalItems ??
                products.length}{" "}
              products found
            </p>

            <section className="product-grid">
              {products.map((product) => (
                <ProductCard
                  product={product}
                  key={
                    product._id ??
                    product.id
                  }
                />
              ))}
            </section>

            {pagination?.totalPages > 1 && (
              <nav
                className="pagination"
                aria-label="Product pages"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    updateParameter(
                      "page",
                      String(page - 1),
                    )
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of{" "}
                  {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    updateParameter(
                      "page",
                      String(page + 1),
                    )
                  }
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
    </main>
  );
}