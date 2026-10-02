import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/admin";

function formatNotificationDate(
  value,
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function notificationIcon(type) {
  switch (type) {
    case "new_order":
      return "▤";

    case "return_request":
      return "↩";

    case "low_stock":
      return "!";

    default:
      return "•";
  }
}

export default function AdminNotifications() {
  const [open, setOpen] =
    useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const containerRef =
    useRef(null);

  async function loadNotifications() {
    try {
      const data =
        await getAdminNotifications();

      setNotifications(
        data.notifications ?? [],
      );

      setUnreadCount(
        data.unreadCount ?? 0,
      );
    } catch (error) {
      console.error(
        "Failed to load admin notifications:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  async function handleNotificationClick(
    notification,
  ) {
    if (!notification.isRead) {
      try {
        await markAdminNotificationRead(
          notification.id,
        );

        setNotifications(
          (current) =>
            current.map((item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    isRead: true,
                  }
                : item,
            ),
        );

        setUnreadCount(
          (current) =>
            Math.max(
              current - 1,
              0,
            ),
        );
      } catch (error) {
        console.error(
          "Unable to mark notification as read:",
          error,
        );
      }
    }

    setOpen(false);
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      await markAllAdminNotificationsRead();

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              isRead: true,
            }),
          ),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Unable to mark notifications as read:",
        error,
      );
    }
  }

  return (
    <div
      className="admin-notifications"
      ref={containerRef}
    >
      <button
        className="admin-notifications__button"
        type="button"
        aria-label="Administrator notifications"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
      >
        <span
          className="admin-notifications__bell"
          aria-hidden="true"
        >
            🔔
        </span>

        {unreadCount > 0 ? (
          <span className="admin-notifications__badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={`admin-notifications__panel ${
          open
            ? "admin-notifications__panel--open"
            : ""
        }`}
      >
        <header className="admin-notifications__header">
          <div>
            <strong>
              Notifications
            </strong>

            <span>
              {unreadCount
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </span>
          </div>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={
                handleMarkAllRead
              }
            >
              Mark all read
            </button>
          ) : null}
        </header>

        <div className="admin-notifications__list">
          {loading ? (
            <p className="admin-notifications__empty">
              Loading notifications…
            </p>
          ) : notifications.length ===
            0 ? (
            <p className="admin-notifications__empty">
              No notifications yet.
            </p>
          ) : (
            notifications.map(
              (notification) => {
                const content = (
                  <>
                    <span
                      className="admin-notification__icon"
                      aria-hidden="true"
                    >
                      {notificationIcon(
                        notification.type,
                      )}
                    </span>

                    <span className="admin-notification__content">
                      <strong>
                        {
                          notification.title
                        }
                      </strong>

                      <span>
                        {
                          notification.message
                        }
                      </span>

                      <time>
                        {formatNotificationDate(
                          notification.createdAt,
                        )}
                      </time>
                    </span>

                    {!notification.isRead ? (
                      <span
                        className="admin-notification__unread"
                        aria-label="Unread"
                      />
                    ) : null}
                  </>
                );

                if (
                  notification.link
                ) {
                  return (
                    <Link
                      key={
                        notification.id
                      }
                      className={`admin-notification ${
                        !notification.isRead
                          ? "admin-notification--unread"
                          : ""
                      }`}
                      to={
                        notification.link
                      }
                      onClick={() =>
                        handleNotificationClick(
                          notification,
                        )
                      }
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={
                      notification.id
                    }
                    className={`admin-notification ${
                      !notification.isRead
                        ? "admin-notification--unread"
                        : ""
                    }`}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification,
                      )
                    }
                  >
                    {content}
                  </button>
                );
              },
            )
          )}
        </div>
      </div>
    </div>
  );
}