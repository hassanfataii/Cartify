import {
  createEmailLayout,
  escapeHtml,
} from "./email-layout.js";
import { sendEmail } from "../services/email.service.js";
import { createOrderItemRows } from "./order-item-rows.js";

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

function formatCurrency(
  amountInPence,
  currency = "gbp",
) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInPence / 100);
}

function displayOrderNumber(order) {
  if (order.orderNumber) {
    return order.orderNumber;
  }

  return order._id
    .toString()
    .slice(-8)
    .toUpperCase();
}

function createAddressBlock(shippingDetails) {
  const address = shippingDetails?.address;

  if (!address) {
    return "";
  }

  const addressLines = [
    shippingDetails.name,
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line));

  return `
    <div
      style="
        margin: 26px 0 0;
        padding: 18px;
        border: 1px solid #e0daeb;
        border-radius: 14px;
        background: #f8f6fc;
      "
    >
      <strong
        style="
          display: block;
          margin-bottom: 8px;
          color: #272238;
        "
      >
        Delivery address
      </strong>

      <div
        style="
          color: #716b7e;
          line-height: 1.55;
        "
      >
        ${addressLines.join("<br />")}
      </div>
    </div>
  `;
}

export function sendOrderConfirmationEmail({
  order,
  customer,
}) {
  const orderNumber =
    displayOrderNumber(order);

  const orderUrl =
    `${getFrontendUrl()}/orders/` +
    order._id.toString();

  const customerName =
    customer.firstName ||
    order.customerDetails?.name ||
    "customer";

  const html = createEmailLayout({
    previewText:
      `Payment received for order ${orderNumber}.`,

    heading: "Your order is confirmed",

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(customerName)},
      </p>

      <p style="margin: 0 0 22px">
        Your payment was successful and we’ve started
        processing your Cartify order.
      </p>

      <div
        style="
          margin-bottom: 22px;
          padding: 18px;
          border: 1px solid #e0daeb;
          border-radius: 14px;
          background: #f8f6fc;
        "
      >
        <span
          style="
            display: block;
            color: #716b7e;
            font-size: 13px;
          "
        >
          Order number
        </span>

        <strong
          style="
            color: #272238;
            font-size: 18px;
          "
        >
          ${escapeHtml(orderNumber)}
        </strong>
      </div>

      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
      >
        ${createOrderItemRows(order, { formatCurrency })}

        <tr>
          <td
            style="
              padding-top: 18px;
              color: #272238;
              font-size: 17px;
              font-weight: 700;
            "
          >
            Total paid
          </td>

          <td
            align="right"
            style="
              padding-top: 18px;
              color: #563d8c;
              font-size: 20px;
              font-weight: 800;
              white-space: nowrap;
            "
          >
            ${formatCurrency(
              order.totalInPence,
              order.currency,
            )}
          </td>
        </tr>
      </table>

      ${createAddressBlock(
        order.shippingDetails,
      )}

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
              View your order
            </a>
          </td>
        </tr>
      </table>

      <p
        style="
          margin: 0;
          color: #716b7e;
          font-size: 14px;
        "
      >
        We’ll email you again when the status of your
        order changes.
      </p>
    `,
  });

  const itemSummary = order.items
    .map(
      (item) =>
        `${item.quantity} × ${item.title} — ` +
        formatCurrency(
          item.lineTotalInPence,
          order.currency,
        ),
    )
    .join("\n");

  const text = [
    `Hi ${customerName},`,
    "",
    "Your Cartify payment was successful.",
    `Order: ${orderNumber}`,
    "",
    itemSummary,
    "",
    `Total paid: ${formatCurrency(
      order.totalInPence,
      order.currency,
    )}`,
    "",
    `View your order: ${orderUrl}`,
  ].join("\n");

  return sendEmail({
    to: customer.email,
    subject:
      `Order confirmed — ${orderNumber}`,
    html,
    text,
    testLabel: "order-confirmation",

    idempotencyKey:
      `order-confirmation/` +
      order._id.toString(),
  });
}
