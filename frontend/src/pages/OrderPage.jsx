import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  createReturnRequest,
  getOrderById,
} from "../api/orders";

import {
  useToast,
} from "../context/ToastContext";

import {
  formatCurrency,
} from "../utils/formatCurrency";

const RETURN_REASONS = [
  {
    value: "changed_mind",
    label: "Changed my mind",
  },
  {
    value: "wrong_item",
    label: "Wrong item received",
  },
  {
    value: "damaged",
    label: "Item arrived damaged",
  },
  {
    value: "not_as_described",
    label: "Item is not as described",
  },
  {
    value: "other",
    label: "Other",
  },
];

const RETURN_STATUS_LABELS = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  refunded: "Refunded",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatOrderDate(date) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "long",
      timeStyle: "short",
    },
  ).format(new Date(date));
}

function getReturnStatusLabel(status) {
  return (
    RETURN_STATUS_LABELS[status] ??
    status?.replaceAll("_", " ") ??
    "Unknown"
  );
}

export default function OrderPage() {
  const { orderId } = useParams();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [returnRequests, setReturnRequests] =
    useState([]);
  const [returnEligibility, setReturnEligibility] =
    useState(null);

  const [returnFormOpen, setReturnFormOpen] =
    useState(false);
  const [selectedReturnItems, setSelectedReturnItems] =
    useState({});
  const [returnReason, setReturnReason] =
    useState("changed_mind");
  const [returnNote, setReturnNote] =
    useState("");
  const [returnBusy, setReturnBusy] =
    useState(false);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const data =
          await getOrderById(orderId);

        if (!cancelled) {
          setOrder(data.order);
          setReturnRequests(
            data.returnRequests ?? [],
          );
          setReturnEligibility(
            data.returnEligibility ?? null,
          );
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

  const availableReturnQuantities =
    useMemo(
      () =>
        new Map(
          (
            returnEligibility?.items ?? []
          ).map((item) => [
            item.productId,
            item.availableQuantity,
          ]),
        ),
      [returnEligibility],
    );

  const returnItemsPayload = useMemo(
    () =>
      Object.entries(selectedReturnItems)
        .filter(
          ([, selection]) =>
            selection.selected,
        )
        .map(
          ([productId, selection]) => ({
            productId,
            quantity: selection.quantity,
          }),
        ),
    [selectedReturnItems],
  );

  function resetReturnForm() {
    setSelectedReturnItems({});
    setReturnReason("changed_mind");
    setReturnNote("");
  }

  function openReturnForm() {
    resetReturnForm();
    setReturnFormOpen(true);
  }

  function closeReturnForm() {
    if (returnBusy) return;

    resetReturnForm();
    setReturnFormOpen(false);
  }

  function toggleReturnItem(
    productId,
    checked,
  ) {
    const availableQuantity =
      availableReturnQuantities.get(productId) ??
      0;

    if (availableQuantity <= 0) {
      return;
    }

    setSelectedReturnItems(
      (current) => ({
        ...current,
        [productId]: checked
          ? {
              selected: true,
              quantity: 1,
            }
          : {
              selected: false,
              quantity: 1,
            },
      }),
    );
  }

  function updateReturnQuantity(
    productId,
    quantity,
  ) {
    setSelectedReturnItems(
      (current) => ({
        ...current,
        [productId]: {
          selected: true,
          quantity:
            Number.parseInt(
              quantity,
              10,
            ) || 1,
        },
      }),
    );
  }

  async function handleReturnSubmit(
    event,
  ) {
    event.preventDefault();

    if (
      returnItemsPayload.length === 0
    ) {
      toast.error(
        "Choose at least one item to return.",
      );
      return;
    }

    setReturnBusy(true);

    try {
      const data =
        await createReturnRequest(
          orderId,
          {
            reason: returnReason,
            note: returnNote.trim(),
            items:
              returnItemsPayload,
          },
        );

      setReturnRequests(
        (current) => [
          data.returnRequest,
          ...current,
        ],
      );

      setReturnEligibility(
        data.returnEligibility,
      );

      resetReturnForm();
      setReturnFormOpen(false);

      toast.success(
        data.message ||
          "Return request submitted.",
      );
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to submit return request",
      );
    } finally {
      setReturnBusy(false);
    }
  }

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
        <p className="eyebrow">
          Order unavailable
        </p>

        <h1>Order not found</h1>

        <p>{error}</p>

        <Link
          className="primary-button"
          to="/orders"
        >
          Return to orders
        </Link>
      </main>
    );
  }

  const deliveryDetails =
    order.shippingDetails ??
    order.customerDetails;

  return (
    <main className="order-page">
      <nav className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/orders">Orders</Link>
        <span>/</span>
        <span>
          {order.orderNumber}
        </span>
      </nav>

      <header className="order-detail-heading">
        <div>
          <p className="eyebrow">
            Order details
          </p>

          <h1>
            Order {order.orderNumber}
          </h1>

          <p>
            Placed{" "}
            {formatOrderDate(
              order.createdAt,
            )}
          </p>
        </div>

        <span
          className={`order-status order-status--${order.status}`}
        >
          {order.status.replaceAll(
            "_",
            " ",
          )}
        </span>
      </header>

      <div className="order-detail-layout">
        <section className="order-detail-products">
          <h2>Products</h2>

          {order.items.map(
            (item) => (
              <article
                className="order-detail-product"
                key={item.productId}
              >
                <Link
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
                    <h3>
                      {item.title}
                    </h3>
                  </Link>

                  <p>
                    Quantity:{" "}
                    {item.quantity}
                  </p>

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
            ),
          )}
        </section>

        <aside className="order-detail-summary">
          <h2>Summary</h2>

          <div>
            <span>Payment</span>
            <span>
              {order.paymentStatus}
            </span>
          </div>

          <div>
            <span>Order status</span>
            <span>
              {order.status.replaceAll(
                "_",
                " ",
              )}
            </span>
          </div>

          <div>
            <span>Subtotal</span>
            <span>
              {formatCurrency(
                order.subtotalInPence,
              )}
            </span>
          </div>

          <div className="order-detail-summary__total">
            <strong>Total</strong>
            <strong>
              {formatCurrency(
                order.totalInPence,
              )}
            </strong>
          </div>

          {deliveryDetails?.address && (
            <div className="order-address">
              <strong>
                Delivery address
              </strong>

              <span>
                {deliveryDetails.name}
              </span>

              <span>
                {
                  deliveryDetails
                    .address.line1
                }
              </span>

              {deliveryDetails
                .address.line2 && (
                <span>
                  {
                    deliveryDetails
                      .address.line2
                  }
                </span>
              )}

              <span>
                {
                  deliveryDetails
                    .address.city
                }
              </span>

              <span>
                {
                  deliveryDetails
                    .address
                    .postal_code
                }
              </span>

              <span>
                {
                  deliveryDetails
                    .address.country
                }
              </span>
            </div>
          )}
        </aside>
      </div>

      <section className="order-return-panel">
        <div className="order-return-panel__heading">
          <div>
            <p className="eyebrow">
              After purchase
            </p>

            <h2>Returns</h2>

            <p>
              Request a return for
              eligible items from this
              order.
            </p>
          </div>

          {returnEligibility
            ?.canRequestReturn &&
            !returnFormOpen && (
              <button
                className="secondary-button"
                type="button"
                onClick={
                  openReturnForm
                }
              >
                Process a return
              </button>
            )}
        </div>

        {returnEligibility
          ?.canRequestReturn ? (
          returnFormOpen && (
            <form
              className="return-request-form"
              onSubmit={
                handleReturnSubmit
              }
            >
              <div className="return-request-intro">
                <h3>
                  Select items to return
                </h3>

                <p>
                  Tick each product you
                  want to include in this
                  return request.
                </p>
              </div>

              <div className="return-request-items">
                {order.items.map(
                  (item) => {
                    const availableQuantity =
                      availableReturnQuantities.get(
                        item.productId,
                      ) ?? 0;

                    const selection =
                      selectedReturnItems[
                        item.productId
                      ];

                    const selected =
                      Boolean(
                        selection?.selected,
                      );

                    return (
                      <div
                        className={`return-request-item${
                          selected
                            ? " return-request-item--selected"
                            : ""
                        }`}
                        key={
                          item.productId
                        }
                      >
                        <input
                          className="return-request-item__checkbox"
                          id={`return-item-${item.productId}`}
                          type="checkbox"
                          checked={
                            selected
                          }
                          onChange={(
                            event,
                          ) =>
                            toggleReturnItem(
                              item.productId,
                              event
                                .target
                                .checked,
                            )
                          }
                          disabled={
                            availableQuantity ===
                              0 ||
                            returnBusy
                          }
                        />

                        <label
                          className="return-request-item__main"
                          htmlFor={`return-item-${item.productId}`}
                        >
                          <img
                            src={
                              item.image
                            }
                            alt=""
                          />

                          <span className="return-request-item__details">
                            <strong>
                              {
                                item.title
                              }
                            </strong>

                            <small>
                              {availableQuantity >
                              0
                                ? `${availableQuantity} of ${item.quantity} available to return`
                                : "No remaining quantity available to return"}
                            </small>
                          </span>
                        </label>

                        {selected &&
                          availableQuantity >
                            1 && (
                            <label className="return-request-item__quantity">
                              <span>
                                Quantity
                              </span>

                              <select
                                value={
                                  selection
                                    .quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReturnQuantity(
                                    item.productId,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  returnBusy
                                }
                              >
                                {Array.from(
                                  {
                                    length:
                                      availableQuantity,
                                  },
                                  (
                                    _,
                                    index,
                                  ) =>
                                    index +
                                    1,
                                ).map(
                                  (
                                    quantity,
                                  ) => (
                                    <option
                                      key={
                                        quantity
                                      }
                                      value={
                                        quantity
                                      }
                                    >
                                      {
                                        quantity
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                          )}
                      </div>
                    );
                  },
                )}
              </div>

              <div className="return-request-form__fields">
                <label>
                  <span>
                    Reason for return
                  </span>

                  <select
                    value={
                      returnReason
                    }
                    onChange={(
                      event,
                    ) =>
                      setReturnReason(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      returnBusy
                    }
                  >
                    {RETURN_REASONS.map(
                      (reason) => (
                        <option
                          key={
                            reason.value
                          }
                          value={
                            reason.value
                          }
                        >
                          {
                            reason.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span>
                    Additional details
                    (optional)
                  </span>

                  <textarea
                    rows="4"
                    maxLength="500"
                    value={returnNote}
                    onChange={(
                      event,
                    ) =>
                      setReturnNote(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Tell us anything useful about the return."
                    disabled={
                      returnBusy
                    }
                  />

                  <small>
                    {returnNote.length}
                    /500
                  </small>
                </label>
              </div>

              <div className="return-request-form__actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={
                    closeReturnForm
                  }
                  disabled={
                    returnBusy
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    returnBusy ||
                    returnItemsPayload
                      .length === 0
                  }
                >
                  {returnBusy
                    ? "Submitting…"
                    : "Submit return request"}
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="return-request-unavailable">
            <p>
              {returnEligibility
                ?.message ||
                "Returns are not currently available for this order."}
            </p>
          </div>
        )}

        {returnRequests.length >
          0 && (
          <div className="return-history">
            <h3>
              Return history
            </h3>

            <div className="return-history__list">
              {returnRequests.map(
                (
                  returnRequest,
                ) => (
                  <article
                    className="return-history-card"
                    key={
                      returnRequest.id
                    }
                  >
                    <header>
                      <div>
                        <span>
                          Requested{" "}
                          {formatOrderDate(
                            returnRequest
                              .createdAt,
                          )}
                        </span>

                        <strong>
                          {returnRequest.items.reduce(
                            (
                              total,
                              item,
                            ) =>
                              total +
                              item.quantity,
                            0,
                          )}{" "}
                          item(s)
                        </strong>
                      </div>

                      <span
                        className={`return-status return-status--${returnRequest.status}`}
                      >
                        {getReturnStatusLabel(
                          returnRequest.status,
                        )}
                      </span>
                    </header>

                    <ul>
                      {returnRequest.items.map(
                        (item) => (
                          <li
                            key={
                              item.productId
                            }
                          >
                            <span>
                              {
                                item.quantity
                              }{" "}
                              ×{" "}
                              {
                                item.title
                              }
                            </span>

                            <strong>
                              {formatCurrency(
                                item.lineTotalInPence,
                              )}
                            </strong>
                          </li>
                        ),
                      )}
                    </ul>

                    <footer>
                      <span>
                        Requested refund
                      </span>

                      <strong>
                        {formatCurrency(
                          returnRequest.requestedRefundInPence,
                        )}
                      </strong>
                    </footer>

                    {returnRequest.note && (
                      <p className="return-history-card__note">
                        {
                          returnRequest.note
                        }
                      </p>
                    )}
                  </article>
                ),
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
