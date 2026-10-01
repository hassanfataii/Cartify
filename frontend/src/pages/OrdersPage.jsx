import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getOrders } from "../api/orders";
import { formatCurrency } from "../utils/formatCurrency";

function formatOrderDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    sort: "newest",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const data = await getOrders(filters.page, {
          search: filters.search,
          sort: filters.sort,
        });

        if (!cancelled) {
          setOrders(data.orders);
          setPagination(data.pagination);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message || "Unable to load your orders",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [filters, reload]);

  function handleSearch(event) {
    event.preventDefault();

    const search = searchInput
      .trim()
      .replace(/^#/, "")
      .toUpperCase();

    setSearchInput(search);
    setFilters((current) => ({
      ...current,
      page: 1,
      search,
    }));
  }

  function clearSearch() {
    setSearchInput("");
    setFilters((current) => ({
      ...current,
      page: 1,
      search: "",
    }));
  }

  function changeSort(event) {
    const sort = event.target.value;

    setFilters((current) => ({
      ...current,
      page: 1,
      sort,
    }));
  }

  return (
    <main className="orders-page">
      <div className="orders-heading">
        <p className="eyebrow">Your account</p>
        <h1>Order history</h1>
        <p>View your purchases and their current status.</p>
      </div>

      <div className="orders-toolbar">
        <form className="orders-search" onSubmit={handleSearch}>
          <label htmlFor="order-search">Order number</label>

          <div className="orders-search__controls">
            <input
              id="order-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search order number"
              maxLength={25}
              autoComplete="off"
              spellCheck={false}
            />

            <button className="primary-button" type="submit">
              Search
            </button>
          </div>
        </form>

        <label className="orders-sort">
          <span>Sort by date</span>

          <select value={filters.sort} onChange={changeSort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="orders-result-summary">
        <span role="status">
          {loading
            ? "Loading your orders…"
            : error
              ? "Unable to load orders"
              : `${pagination?.totalOrders ?? 0} ${
                  pagination?.totalOrders === 1 ? "order" : "orders"
                }${filters.search ? ` matching “${filters.search}”` : ""}`}
        </span>

        {filters.search && (
          <button type="button" onClick={clearSearch}>
            Clear search
          </button>
        )}
      </div>

      {error ? (
        <div className="orders-empty">
          <p className="orders-feedback--error" role="alert">
            {error}
          </p>

          <button
            className="secondary-button"
            type="button"
            onClick={() => setReload((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="orders-feedback" role="status">
          Loading your orders…
        </div>
      ) : orders.length === 0 ? (
        <section className="orders-empty">
          <h2>
            {filters.search ? "No matching orders" : "No orders yet"}
          </h2>

          <p>
            {filters.search
              ? "Check the order number or clear your search."
              : "Your completed orders will appear here."}
          </p>

          {filters.search ? (
            <button
              className="secondary-button"
              type="button"
              onClick={clearSearch}
            >
              Show all orders
            </button>
          ) : (
            <Link className="primary-button" to="/shop">
              Start shopping
            </Link>
          )}
        </section>
      ) : (
        <>
          <section className="orders-list" aria-label="Your orders">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <header className="order-card__header">
                  <div>
                    <span>Order placed</span>
                    <strong>
                      {formatOrderDate(order.createdAt)}
                    </strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>
                      {formatCurrency(order.totalInPence)}
                    </strong>
                  </div>

                  <div>
                    <span>Order number</span>
                    <strong>
                      {order.orderNumber ||
                        order.id.slice(-8).toUpperCase()}
                    </strong>
                  </div>

                  <span
                    className={`order-status order-status--${order.status}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                </header>

                <div className="order-card__body">
                  <div className="order-card__products">
                    {order.items.map((item) => (
                      <div
                        className="order-card__product"
                        key={item.productId}
                      >
                        <Link
                          className="order-card__image"
                          to={`/products/${item.slug}`}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            loading="lazy"
                          />
                        </Link>

                        <div>
                          <Link to={`/products/${item.slug}`}>
                            <strong>{item.title}</strong>
                          </Link>

                          <span>Quantity: {item.quantity}</span>
                          <span>
                            {formatCurrency(item.lineTotalInPence)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    className="secondary-button"
                    to={`/orders/${order.id}`}
                  >
                    View order
                  </Link>
                </div>
              </article>
            ))}
          </section>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                disabled={filters.page <= 1}
              >
                Previous
              </button>

              <span>
                Page {filters.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                disabled={filters.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}