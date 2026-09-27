import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAdminProducts,
  getAdminSummary,
} from "../api/admin";
import { formatCurrency } from "../utils/formatCurrency";

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function shortOrderId(order) {
  const identifier = order.orderNumber || order.id;

  return identifier.startsWith("CTF-")
    ? identifier
    : identifier.slice(-8).toUpperCase();
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setError("");

      try {
        const [summaryData, productData] =
          await Promise.all([
            getAdminSummary(),
            getAdminProducts(),
          ]);

        if (!cancelled) {
          setSummary(summaryData.summary);
          setRecentOrders(
            Array.isArray(summaryData.recentOrders)
              ? summaryData.recentOrders
              : [],
          );
          setProducts(
            Array.isArray(productData.products)
              ? productData.products
              : [],
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load the admin dashboard",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="message-page">
        <p role="status">
          Loading administrator dashboard...
        </p>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="message-page">
        <p className="eyebrow">Admin dashboard</p>
        <h1>Dashboard unavailable</h1>
        <p role="alert">
          {error || "Dashboard information is unavailable."}
        </p>
      </main>
    );
  }

  const lowStockProducts = products
    .filter(
      (product) =>
        product.isActive && product.stock <= 10,
    )
    .sort((firstProduct, secondProduct) =>
      firstProduct.stock - secondProduct.stock,
    );

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">
          Cartify administration
        </p>

        <h1>Dashboard</h1>

        <p>
          Monitor customers, inventory, payments and
          order fulfilment.
        </p>
      </header>

      <section
        className="admin-stat-grid"
        aria-label="Store statistics"
      >
        <article className="admin-stat-card">
          <span>Customers</span>
          <strong>{summary.customerCount}</strong>
        </article>

        <article className="admin-stat-card">
          <span>Active products</span>
          <strong>
            {summary.activeProductCount}
          </strong>
        </article>

        <article className="admin-stat-card">
          <span>Paid orders</span>
          <strong>{summary.paidOrderCount}</strong>
        </article>

        <article className="admin-stat-card">
          <span>Test revenue</span>

          <strong>
            {formatCurrency(
              summary.totalRevenueInPence,
            )}
          </strong>
        </article>

        <article
          className={`admin-stat-card ${
            summary.lowStockCount > 0
              ? "admin-stat-card--warning"
              : ""
          }`}
        >
          <span>Low-stock products</span>
          <strong>{summary.lowStockCount}</strong>
        </article>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <h2>Recent orders</h2>
              <p>
                The latest successfully paid orders.
              </p>
            </div>

            <Link
              className="admin-panel__link"
              to="/admin/orders"
            >
              View all orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="admin-empty-state">
              <p>No paid orders yet.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          to={`/admin/orders?order=${order.id}`}
                        >
                          {shortOrderId(order)}
                        </Link>
                      </td>

                      <td>
                        {order.customer
                          ? `${order.customer.firstName} ${order.customer.lastName}`
                          : "Deleted customer"}
                      </td>

                      <td>
                        {formatDate(order.createdAt)}
                      </td>

                      <td>
                        <span
                          className={`order-status order-status--${order.status}`}
                        >
                          {order.status.replaceAll(
                            "_",
                            " ",
                          )}
                        </span>
                      </td>

                      <td>
                        {formatCurrency(
                          order.totalInPence,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <h2>Low-stock inventory</h2>

              <p>
                Active products with 10 or fewer
                remaining.
              </p>
            </div>

            <Link
              className="admin-panel__link"
              to="/admin/products"
            >
              Manage products
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="admin-empty-state">
              <p>
                All active products have healthy stock.
              </p>
            </div>
          ) : (
            <div className="admin-stock-list">
              {lowStockProducts.map((product) => (
                <article
                  className="admin-stock-item"
                  key={product.id}
                >
                  <img
                    src={
                      product.images?.[0] ||
                      "/images/product-placeholder.png"
                    }
                    alt=""
                  />

                  <div>
                    <strong>{product.title}</strong>

                    <span>
                      {product.productNumber ||
                        "No product number"}
                    </span>

                    <span>
                      {product.category?.name ||
                        "Uncategorised"}
                    </span>
                  </div>

                  <strong
                    className={
                      product.stock === 0
                        ? "stock-zero"
                        : "stock-low"
                    }
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} left`}
                  </strong>

                  <Link
                    className="admin-edit-button"
                    to={`/admin/products?q=${encodeURIComponent(
                      product.productNumber ||
                        product.title,
                    )}`}
                  >
                    Edit
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}