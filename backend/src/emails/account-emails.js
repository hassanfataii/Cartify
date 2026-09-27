import {
  createEmailLayout,
  escapeHtml,
} from "./email-layout.js";
import { sendEmail } from "../services/email.service.js";

function getFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

export async function sendEmailChangeNotifications({
  userId,
  firstName,
  oldEmail,
  newEmail,
  changedAt,
}) {
  const accountUrl =
    `${getFrontendUrl()}/account`;

  const changeIdentifier =
    `${userId}/${changedAt.getTime()}`;

  const oldAddressHtml = createEmailLayout({
    previewText:
      "The email address on your Cartify account was changed.",

    heading: "Your email address was changed",

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(firstName)},
      </p>

      <p style="margin: 0 0 18px">
        The email address on your Cartify account was
        changed from:
      </p>

      <div
        style="
          margin: 22px 0;
          padding: 18px;
          border: 1px solid #e0daeb;
          border-radius: 14px;
          background: #f8f6fc;
        "
      >
        <div style="margin-bottom: 12px">
          <span
            style="
              display: block;
              color: #716b7e;
              font-size: 13px;
            "
          >
            Previous email
          </span>

          <strong style="color: #272238">
            ${escapeHtml(oldEmail)}
          </strong>
        </div>

        <div>
          <span
            style="
              display: block;
              color: #716b7e;
              font-size: 13px;
            "
          >
            New email
          </span>

          <strong style="color: #272238">
            ${escapeHtml(newEmail)}
          </strong>
        </div>
      </div>

      <p style="margin: 0">
        If you made this change, no further action is
        needed.
      </p>

      <p
        style="
          margin: 18px 0 0;
          color: #9f2536;
          font-weight: 700;
        "
      >
        If you didn’t make this change, contact Cartify
        support immediately and secure your email
        account.
      </p>
    `,
  });

  const newAddressHtml = createEmailLayout({
    previewText:
      "Your new Cartify email address is active.",

    heading: "New email address confirmed",

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(firstName)},
      </p>

      <p style="margin: 0 0 18px">
        This email address is now connected to your
        Cartify account:
      </p>

      <div
        style="
          margin: 22px 0;
          padding: 18px;
          border: 1px solid #e0daeb;
          border-radius: 14px;
          background: #f8f6fc;
        "
      >
        <strong style="color: #272238">
          ${escapeHtml(newEmail)}
        </strong>
      </div>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        style="margin: 28px 0 0"
      >
        <tr>
          <td
            style="
              border-radius: 12px;
              background: #563d8c;
            "
          >
            <a
              href="${accountUrl}"
              style="
                display: inline-block;
                padding: 14px 22px;
                color: #ffffff;
                font-weight: 700;
                text-decoration: none;
              "
            >
              Review your account
            </a>
          </td>
        </tr>
      </table>
    `,
  });

  return Promise.all([
    sendEmail({
      to: oldEmail,
      subject:
        "Your Cartify email address was changed",

      html: oldAddressHtml,

      text: [
        `Hi ${firstName},`,
        "",
        "The email address on your Cartify account was changed.",
        `Previous email: ${oldEmail}`,
        `New email: ${newEmail}`,
        "",
        "If you did not make this change, contact Cartify support immediately.",
      ].join("\n"),

      testLabel: "email-changed-old",

      idempotencyKey:
        `email-change-old/${changeIdentifier}`,
    }),

    sendEmail({
      to: newEmail,
      subject:
        "Your new Cartify email address is active",

      html: newAddressHtml,

      text: [
        `Hi ${firstName},`,
        "",
        `${newEmail} is now connected to your Cartify account.`,
        "",
        `Review your account: ${accountUrl}`,
      ].join("\n"),

      testLabel: "email-changed-new",

      idempotencyKey:
        `email-change-new/${changeIdentifier}`,
    }),
  ]);
}