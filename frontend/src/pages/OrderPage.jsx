import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import { getOrderById } from "../api/orders";
import { formatCurrency } from "../utils/formatCurrency";

function formatOrderDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function OrderPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        const data = await getOrderById(orderId);

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load this order",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="message-page">
        <p>Loading order...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="message-page">
        <p className="eyebrow">Order unavailable</p>
        <h1>Order not found</h1>
        <p>{error}</p>

        <Link className="primary-button" to="/orders">
          Return to orders
        </Link>
      </main>
    );
  }

  const deliveryDetails =
    order.shippingDetails ?? order.customerDetails;

  return (
    <main className="order-page">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/orders">Orders</Link>
        <span>/</span>
        <span>
          {order.id.slice(-8).toUpperCase()}
        </span>
      </nav>

      <header className="order-detail-heading">
        <div>
          <p className="eyebrow">Order details</p>
          <h1>
            Order {order.id.slice(-8).toUpperCase()}
          </h1>

          <p>
            Placed {formatOrderDate(order.createdAt)}
          </p>
        </div>

        <span
          className={`order-status order-status--${order.status}`}
        >
          {order.status.replaceAll("_", " ")}
        </span>
      </header>

      <div className="order-detail-layout">
        <section className="order-detail-products">
          <h2>Products</h2>

          {order.items.map((item) => (
            <article
              className="order-detail-product"
              key={item.productId}
            >
              <Link to={`/products/${item.slug}`}>
                <img
                  src={item.image}
                  alt={item.title}
                />
              </Link>

              <div>
                <Link to={`/products/${item.slug}`}>
                  <h3>{item.title}</h3>
                </Link>

                <p>Quantity: {item.quantity}</p>
                <p>
                  {formatCurrency(
                    item.unitPriceInPence,
                  )}{" "}
                  each
                </p>
              </div>

              <strong>
                {formatCurrency(
                  item.lineTotalInPence,
                )}
              </strong>
            </article>
          ))}
        </section>

        <aside className="order-detail-summary">
          <h2>Summary</h2>

          <div>
            <span>Payment</span>
            <span>{order.paymentStatus}</span>
          </div>

          <div>
            <span>Order status</span>
            <span>
              {order.status.replaceAll("_", " ")}
            </span>
          </div>

          <div>
            <span>Subtotal</span>
            <span>
              {formatCurrency(order.subtotalInPence)}
            </span>
          </div>

          <div className="order-detail-summary__total">
            <strong>Total</strong>
            <strong>
              {formatCurrency(order.totalInPence)}
            </strong>
          </div>

          {deliveryDetails?.address && (
            <div className="order-address">
              <strong>Delivery address</strong>

              <span>{deliveryDetails.name}</span>
              <span>
                {deliveryDetails.address.line1}
              </span>

              {deliveryDetails.address.line2 && (
                <span>
                  {deliveryDetails.address.line2}
                </span>
              )}

              <span>
                {deliveryDetails.address.city}
              </span>

              <span>
                {deliveryDetails.address.postal_code}
              </span>

              <span>
                {deliveryDetails.address.country}
              </span>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}