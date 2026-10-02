import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminReturns,
  updateAdminReturnStatus,
} from "../api/admin";

import {
  useToast,
} from "../context/ToastContext";

import {
  formatCurrency,
} from "../utils/formatCurrency";

const RETURN_STATUSES = [
  {
    value: "",
    label: "All returns",
  },
  {
    value: "requested",
    label: "Requested",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "received",
    label: "Received",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

const emptyStatusCounts = {
  all: 0,
  requested: 0,
  approved: 0,
  received: 0,
  rejected: 0,
  refunded: 0,
  completed: 0,
  cancelled: 0,
};

const REASON_LABELS = {
  changed_mind:
    "Changed mind",

  wrong_item:
    "Wrong item received",

  damaged:
    "Item arrived damaged",

  not_as_described:
    "Item not as described",

  other:
    "Other",
};

function formatDate(
  date,
) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    new Date(
      date,
    ),
  );
}

function getStatusCount(
  statusCounts,
  status,
) {
  return status
    ? statusCounts[
        status
      ] ?? 0
    : statusCounts.all ??
        0;
}

function getStatusLabel(
  status,
) {
  return (
    RETURN_STATUSES.find(
      (item) =>
        item.value ===
        status,
    )?.label ??
    status?.replaceAll(
      "_",
      " ",
    ) ??
    "Unknown"
  );
}

export default function AdminReturnsPage() {
  const toast =
    useToast();

  const [
    returnRequests,
    setReturnRequests,
  ] = useState([]);

  const [
    statusCounts,
    setStatusCounts,
  ] = useState(
    emptyStatusCounts,
  );

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 20,
    totalReturns: 0,
    totalPages: 1,
  });

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    busyReturnId,
    setBusyReturnId,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadReturns =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError("");

        try {
          const data =
            await getAdminReturns(
              page,
              statusFilter,
            );

          setReturnRequests(
            Array.isArray(
              data.returns,
            )
              ? data.returns
              : [],
          );

          setStatusCounts(
            data.statusCounts ??
              emptyStatusCounts,
          );

          setPagination(
            data.pagination ??
              {
                page,
                limit: 20,
                totalReturns: 0,
                totalPages: 1,
              },
          );
        } catch (
          requestError
        ) {
          setError(
            requestError.message ||
              "Unable to load returns",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        page,
        statusFilter,
      ],
    );

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  function selectStatus(
    status,
  ) {
    setStatusFilter(
      status,
    );

    setPage(1);
  }

  async function changeStatus(
    returnId,
    status,
  ) {
    setBusyReturnId(
      returnId,
    );

    try {
      const data =
        await updateAdminReturnStatus(
          returnId,
          status,
        );

      toast.success(
        data.message ||
          "Return updated",
      );

      await loadReturns();
    } catch (
      requestError
    ) {
      toast.error(
        requestError.message ||
          "Unable to update return",
      );
    } finally {
      setBusyReturnId(
        null,
      );
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">
          Cartify administration
        </p>

        <h1>
          Returns
        </h1>

        <p>
          Review customer return
          requests and track items
          coming back to the store.
        </p>
      </header>

      <nav
        className="admin-status-tabs"
        aria-label="Filter returns by status"
      >
        {RETURN_STATUSES.map(
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
                aria-pressed={
                  active
                }
              >
                <span>
                  {
                    status.label
                  }
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
          <p>
            {error}
          </p>

          <button
            className="secondary-button"
            type="button"
            onClick={
              loadReturns
            }
          >
            Try again
          </button>
        </div>
      )}

      <section className="admin-panel admin-returns-panel">
        <div className="admin-panel__heading">
          <div>
            <h2>
              {statusFilter
                ? `${getStatusLabel(
                    statusFilter,
                  )} returns`
                : "All returns"}
            </h2>

            <p>
              {
                pagination.totalReturns
              }{" "}
              {pagination.totalReturns ===
              1
                ? "return"
                : "returns"}

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
        returnRequests.length ===
          0 ? (
          <div className="admin-empty-state">
            <h3>
              No returns here
            </h3>

            <p>
              No customer return
              requests currently
              match this status.
            </p>
          </div>
        ) : (
          <div className="admin-return-card-list">
            {returnRequests.map(
              (
                returnRequest,
              ) => {
                const busy =
                  busyReturnId ===
                  returnRequest.id;

                return (
                  <article
                    className={`admin-return-card admin-return-card--${returnRequest.status}`}
                    key={
                      returnRequest.id
                    }
                  >
                    <header className="admin-return-card__header">
                      <div>
                        <span>
                          Return for order
                        </span>

                        <strong>
                          #
                          {
                            returnRequest.orderNumber
                          }
                        </strong>
                      </div>

                      <span
                        className={`return-status return-status--${returnRequest.status}`}
                      >
                        {getStatusLabel(
                          returnRequest.status,
                        )}
                      </span>
                    </header>

                    <div className="admin-return-card__summary">
                      <div>
                        <span>
                          Customer
                        </span>

                        {returnRequest.customer ? (
                          <>
                            <strong>
                              {
                                returnRequest
                                  .customer
                                  .firstName
                              }{" "}
                              {
                                returnRequest
                                  .customer
                                  .lastName
                              }
                            </strong>

                            <a
                              href={`mailto:${returnRequest.customer.email}`}
                            >
                              {
                                returnRequest
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
                          Requested
                        </span>

                        <strong>
                          {formatDate(
                            returnRequest.createdAt,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Reason
                        </span>

                        <strong>
                          {REASON_LABELS[
                            returnRequest.reason
                          ] ??
                            returnRequest.reason}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Requested refund
                        </span>

                        <strong>
                          {formatCurrency(
                            returnRequest
                              .requestedRefundInPence,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="admin-return-card__items">
                      <h3>
                        Returning items
                      </h3>

                      <ul>
                        {returnRequest.items.map(
                          (
                            item,
                          ) => (
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
                                  {
                                    item.title
                                  }
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
                    </div>

                    {returnRequest.note && (
                      <div className="admin-return-card__note">
                        <strong>
                          Customer note
                        </strong>

                        <p>
                          {
                            returnRequest.note
                          }
                        </p>
                      </div>
                    )}

                    <footer className="admin-return-card__footer">
                      {returnRequest.status ===
                        "requested" && (
                        <>
                          <button
                            className="secondary-button admin-return-reject"
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              changeStatus(
                                returnRequest.id,
                                "rejected",
                              )
                            }
                          >
                            Reject
                          </button>

                          <button
                            className="primary-button"
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              changeStatus(
                                returnRequest.id,
                                "approved",
                              )
                            }
                          >
                            {busy
                              ? "Updating…"
                              : "Approve return"}
                          </button>
                        </>
                      )}

                      {returnRequest.status ===
                        "approved" && (
                        <button
                          className="primary-button"
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            changeStatus(
                              returnRequest.id,
                              "received",
                            )
                          }
                        >
                          {busy
                            ? "Updating…"
                            : "Mark as received"}
                        </button>
                      )}

                      {returnRequest.status ===
                        "received" && (
                        <p className="admin-return-card__next-step">
                          Item received.
                          Refund processing
                          is the next
                          workflow step.
                        </p>
                      )}

                      {returnRequest.status ===
                        "rejected" && (
                        <p className="admin-return-card__next-step">
                          This return request
                          has been rejected.
                        </p>
                      )}
                    </footer>
                  </article>
                );
              },
            )}
          </div>
        )}

        {pagination.totalPages >
          1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
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
              Page{" "}
              {
                pagination.page
              }{" "}
              of{" "}
              {
                pagination.totalPages
              }
            </span>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
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