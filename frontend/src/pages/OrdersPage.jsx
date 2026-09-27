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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const data = await getOrders(page);

        if (!cancelled) {
          setOrders(data.orders);
          setPagination(data.pagination);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load your orders",
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
  }, [page]);

  if (loading) {
    return (
      <main className="message-page">
        <p>Loading your orders...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="message-page">
        <p className="eyebrow">Something went wrong</p>
        <h1>Orders unavailable</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="message-page">
        <p className="eyebrow">Order history</p>
        <h1>No orders yet</h1>
        <p>Your completed orders will appear here.</p>

        <Link className="primary-button" to="/shop">
          Start shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <div className="orders-heading">
        <p className="eyebrow">Your account</p>
        <h1>Order history</h1>
        <p>
          View your purchases and their current status.
        </p>
      </div>

      <section className="orders-list">
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
                  {order.id.slice(-8).toUpperCase()}
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
                      />
                    </Link>

                    <div>
                      <Link
                        to={`/products/${item.slug}`}
                      >
                        <strong>{item.title}</strong>
                      </Link>

                      <span>
                        Quantity: {item.quantity}
                      </span>

                      <span>
                        {formatCurrency(
                          item.lineTotalInPence,
                        )}
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
              setPage((current) => current - 1)
            }
            disabled={page <= 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {pagination.totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) => current + 1)
            }
            disabled={page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}