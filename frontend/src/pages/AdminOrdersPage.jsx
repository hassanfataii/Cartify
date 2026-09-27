import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminOrders,
  updateAdminOrderStatus,
} from "../api/admin";

import {
  useToast,
} from "../context/ToastContext";

import {
  formatCurrency,
} from "../utils/formatCurrency";

const ORDER_STATUSES = [
  {
    value: "",
    label: "All orders",
  },
  {
    value: "processing",
    label: "Processing",
  },
  {
    value: "shipped",
    label: "Shipped",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "requires_attention",
    label: "Needs attention",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

const STATUS_OPTIONS =
  ORDER_STATUSES.filter(
    (status) => status.value,
  );

const emptyStatusCounts = {
  all: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
  requires_attention: 0,
};

function formatDate(date) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(date));
}

function shortOrderId(orderId) {
  return orderId
    .slice(-8)
    .toUpperCase();
}

function getStatusLabel(status) {
  return (
    ORDER_STATUSES.find(
      (option) =>
        option.value === status,
    )?.label ??
    status?.replaceAll("_", " ") ??
    "Unknown"
  );
}

function getStatusCount(
  statusCounts,
  status,
) {
  return status
    ? statusCounts[status] ?? 0
    : statusCounts.all ?? 0;
}

export default function AdminOrdersPage() {
  const toast = useToast();

  const [orders, setOrders] =
    useState([]);

  const [
    statusCounts,
    setStatusCounts,
  ] = useState(
    emptyStatusCounts,
  );

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      totalOrders: 0,
      totalPages: 1,
    });

  const [page, setPage] =
    useState(1);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    busyOrderId,
    setBusyOrderId,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadOrders = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getAdminOrders(
            page,
            statusFilter,
          );

        setOrders(
          Array.isArray(data.orders)
            ? data.orders
            : [],
        );

        setStatusCounts(
          data.statusCounts ??
            emptyStatusCounts,
        );

        setPagination(
          data.pagination ?? {
            page,
            limit: 20,
            totalOrders: 0,
            totalPages: 1,
          },
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to load orders",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      statusFilter,
    ],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function selectStatus(status) {
    setStatusFilter(status);
    setPage(1);
  }

  async function handleStatusChange(
    orderId,
    nextStatus,
  ) {
    const currentOrder =
      orders.find(
        (order) =>
          order.id === orderId,
      );

    if (
      !currentOrder ||
      currentOrder.status ===
        nextStatus
    ) {
      return;
    }

    setBusyOrderId(orderId);

    try {
      const data =
        await updateAdminOrderStatus(
          orderId,
          nextStatus,
        );

      toast.success(
        data.message ||
          `Order marked as ${getStatusLabel(
            nextStatus,
          ).toLowerCase()}`,
      );

      await loadOrders();
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to update order status",
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">
          Cartify administration
        </p>

        <h1>
          Orders
        </h1>

        <p>
          Track paid orders and manage
          each stage of fulfilment.
        </p>
      </header>

      <nav
        className="admin-status-tabs"
        aria-label="Filter orders by status"
      >
        {ORDER_STATUSES.map(
          (status) => {
            const active =
              statusFilter ===
              status.value;

            return (
              <button
                className={
                  active
                    ? "admin-status-tab admin-status-tab--active"
                    : "admin-status-tab"
                }
                type="button"
                key={
                  status.value ||
                  "all"
                }
                onClick={() =>
                  selectStatus(
                    status.value,
                  )
                }
                aria-pressed={active}
              >
                <span>
                  {status.label}
                </span>

                <strong>
                  {getStatusCount(
                    statusCounts,
                    status.value,
                  )}
                </strong>
              </button>
            );
          },
        )}
      </nav>

      {error && (
        <div
          className="auth-error"
          role="alert"
        >
          <p>{error}</p>

          <button
            className="secondary-button"
            type="button"
            onClick={loadOrders}
          >
            Try again
          </button>
        </div>
      )}

      <section className="admin-panel admin-orders-panel">
        <div className="admin-panel__heading">
          <div>
            <h2>
              {statusFilter
                ? getStatusLabel(
                    statusFilter,
                  )
                : "All paid orders"}
            </h2>

            <p>
              {pagination.totalOrders}{" "}
              {pagination.totalOrders === 1
                ? "order"
                : "orders"}
              {statusFilter
                ? " in this section."
                : " in total."}
            </p>
          </div>

          {loading && (
            <span role="status">
              Refreshing…
            </span>
          )}
        </div>

        {!loading &&
        orders.length === 0 ? (
          <div className="admin-empty-state">
            <h3>
              No orders here
            </h3>

            <p>
              No paid orders currently
              match this fulfilment stage.
            </p>
          </div>
        ) : (
          <div className="admin-order-card-list">
            {orders.map((order) => {
              const busy =
                busyOrderId ===
                order.id;

              return (
                <article
                  className={`admin-order-card admin-order-card--${order.status}`}
                  key={order.id}
                >
                  <header className="admin-order-card__header">
                    <div>
                      <span>
                        Order
                      </span>

                      <strong>
                        #
                        {shortOrderId(
                          order.id,
                        )}
                      </strong>
                    </div>

                    <span
                      className={`order-status order-status--${order.status}`}
                    >
                      {getStatusLabel(
                        order.status,
                      )}
                    </span>
                  </header>

                  <div className="admin-order-card__summary">
                    <div className="admin-order-card__customer">
                      <span>
                        Customer
                      </span>

                      {order.customer ? (
                        <>
                          <strong>
                            {
                              order
                                .customer
                                .firstName
                            }{" "}
                            {
                              order
                                .customer
                                .lastName
                            }
                          </strong>

                          <a
                            href={`mailto:${order.customer.email}`}
                          >
                            {
                              order
                                .customer
                                .email
                            }
                          </a>
                        </>
                      ) : (
                        <strong>
                          Deleted customer
                        </strong>
                      )}
                    </div>

                    <div>
                      <span>
                        Placed
                      </span>

                      <strong>
                        {formatDate(
                          order.createdAt,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Items
                      </span>

                      <strong>
                        {order.itemCount}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total
                      </span>

                      <strong>
                        {formatCurrency(
                          order.totalInPence,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Payment
                      </span>

                      <strong className="admin-payment-status">
                        {order.paymentStatus}
                      </strong>
                    </div>
                  </div>

                  <details className="admin-order-card__items">
                    <summary>
                      View ordered products
                    </summary>

                    <ul>
                      {order.items.map(
                        (item) => (
                          <li
                            key={
                              item.productId
                            }
                          >
                            <div>
                              {item.image && (
                                <img
                                  src={
                                    item.image
                                  }
                                  alt=""
                                />
                              )}

                              <span>
                                {
                                  item.quantity
                                }{" "}
                                ×{" "}
                                {item.title}
                              </span>
                            </div>

                            <strong>
                              {formatCurrency(
                                item.lineTotalInPence,
                              )}
                            </strong>
                          </li>
                        ),
                      )}
                    </ul>
                  </details>

                  <footer className="admin-order-card__footer">
                    <label>
                      <span>
                        Fulfilment status
                      </span>

                      <select
                        value={
                          order.status
                        }
                        onChange={(
                          event,
                        ) =>
                          handleStatusChange(
                            order.id,
                            event.target
                              .value,
                          )
                        }
                        disabled={busy}
                        aria-label={`Update order ${shortOrderId(
                          order.id,
                        )} status`}
                      >
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={
                                status.value
                              }
                              value={
                                status.value
                              }
                            >
                              {
                                status.label
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    {busy && (
                      <small role="status">
                        Updating status…
                      </small>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    current - 1,
                    1,
                  ),
                )
              }
              disabled={
                loading ||
                page <= 1
              }
            >
              Previous
            </button>

            <span>
              Page {pagination.page} of{" "}
              {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    current + 1,
                    pagination.totalPages,
                  ),
                )
              }
              disabled={
                loading ||
                page >=
                  pagination.totalPages
              }
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}