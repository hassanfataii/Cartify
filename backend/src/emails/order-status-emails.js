import {
  createEmailLayout,
  escapeHtml,
} from "./email-layout.js";
import { sendEmail } from "../services/email.service.js";
import { createOrderItemRows } from "./order-item-rows.js";

const STATUS_CONTENT = {
  processing: {
    heading: "Your order is being processed",
    message:
      "We’re preparing your order and will let you know when it moves to the next stage.",
  },

  shipped: {
    heading: "Your order has been shipped",
    message:
      "Your order is now on its way. Keep an eye out for its arrival.",
  },

  delivered: {
    heading: "Your order has been delivered",
    message:
      "Your order has been marked as delivered. We hope you enjoy your purchase.",
  },

  cancelled: {
    heading: "Your order has been cancelled",
    message:
      "Your order has been marked as cancelled. If you weren’t expecting this, please contact Cartify support.",
  },

  requires_attention: {
    heading: "Your order needs attention",
    message:
      "We’ve encountered an issue while processing your order. Please check your account for the latest information.",
  },
};

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

function displayOrderNumber(order) {
  return (
    order.orderNumber ||
    order._id
      .toString()
      .slice(-8)
      .toUpperCase()
  );
}

export function sendOrderStatusEmail({
  order,
  customer,
  statusChangeId,
}) {
  const content =
    STATUS_CONTENT[order.status];

  if (!content) {
    return Promise.resolve({
      sent: false,
      skipped: true,
      reason:
        "This order status has no email template",
    });
  }

  const orderNumber =
    displayOrderNumber(order);

  const orderUrl =
    `${getFrontendUrl()}/orders/` +
    order._id.toString();

  const firstName =
    customer.firstName || "customer";

  const readableStatus =
    order.status.replaceAll("_", " ");

  const html = createEmailLayout({
    previewText:
      `${orderNumber} is now ${readableStatus}.`,

    heading: content.heading,

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(firstName)},
      </p>

      <p style="margin: 0 0 24px">
        ${escapeHtml(content.message)}
      </p>

      <div
        style="
          margin: 0 0 24px;
          padding: 18px;
          border: 1px solid #e0daeb;
          border-radius: 14px;
          background: #f8f6fc;
        "
      >
        <span
          style="
            display: block;
            margin-bottom: 5px;
            color: #716b7e;
            font-size: 13px;
          "
        >
          Order
        </span>

        <strong
          style="
            display: block;
            margin-bottom: 14px;
            color: #272238;
            font-size: 18px;
          "
        >
          ${escapeHtml(orderNumber)}
        </strong>

        <span
          style="
            display: inline-block;
            padding: 7px 11px;
            border-radius: 999px;
            color: #563d8c;
            background: #ece6fa;
            font-size: 13px;
            font-weight: 700;
            text-transform: capitalize;
          "
        >
          ${escapeHtml(readableStatus)}
        </span>
      </div>

      <h2 style="margin:0 0 8px;color:#272238;font-size:16px;">Items in your order</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
        ${createOrderItemRows(order, { showPrices: false })}
      </table>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        style="margin: 28px 0 20px"
      >
        <tr>
          <td
            style="
              border-radius: 12px;
              background: #563d8c;
            "
          >
            <a
              href="${orderUrl}"
              style="
                display: inline-block;
                padding: 14px 22px;
                color: #ffffff;
                font-weight: 700;
                text-decoration: none;
              "
            >
              View order details
            </a>
          </td>
        </tr>
      </table>

      ${
        order.status === "cancelled"
          ? `
            <p
              style="
                margin: 0;
                color: #716b7e;
                font-size: 14px;
              "
            >
              This message confirms the order status
              only. Any applicable refund will be
              handled separately.
            </p>
          `
          : ""
      }
    `,
  });

  const text = [
    `Hi ${firstName},`,
    "",
    content.heading,
    content.message,
    "",
    `Order: ${orderNumber}`,
    `Status: ${readableStatus}`,
    "",
    `View your order: ${orderUrl}`,
  ].join("\n");

  return sendEmail({
    to: customer.email,

    subject:
      `${content.heading} — ${orderNumber}`,

    html,
    text,
    testLabel: `order-${order.status}`,

    idempotencyKey:
      `order-status/${order._id}/` +
      statusChangeId,
  });
}
