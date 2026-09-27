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

export function sendPasswordResetEmail({
  user,
  token,
  resetRequestId,
}) {
  const resetUrl =
    `${getFrontendUrl()}/reset-password?token=` +
    encodeURIComponent(token);

  const html = createEmailLayout({
    previewText:
      "Reset your Cartify password.",

    heading: "Reset your password",

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(user.firstName)},
      </p>

      <p style="margin: 0 0 18px">
        We received a request to reset the password
        for your Cartify account.
      </p>

      <p style="margin: 0 0 24px">
        This link will expire in one hour and can only
        be used once.
      </p>

      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        style="margin: 28px 0"
      >
        <tr>
          <td
            style="
              border-radius: 12px;
              background: #563d8c;
            "
          >
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                padding: 14px 22px;
                color: #ffffff;
                font-weight: 700;
                text-decoration: none;
              "
            >
              Reset password
            </a>
          </td>
        </tr>
      </table>

      <p
        style="
          margin: 0 0 14px;
          color: #716b7e;
          font-size: 14px;
        "
      >
        If you didn’t request this, ignore this email.
        Your password will remain unchanged.
      </p>

      <p
        style="
          margin: 0;
          color: #716b7e;
          font-size: 12px;
          word-break: break-all;
        "
      >
        If the button doesn’t work, copy this address:
        <br />
        ${escapeHtml(resetUrl)}
      </p>
    `,
  });

  return sendEmail({
    to: user.email,
    subject: "Reset your Cartify password",
    html,

    text: [
      `Hi ${user.firstName},`,
      "",
      "Reset your Cartify password using this link:",
      resetUrl,
      "",
      "This link expires in one hour and can only be used once.",
      "If you did not request this, ignore this email.",
    ].join("\n"),

    testLabel: "password-reset",

    idempotencyKey:
      `password-reset/${resetRequestId}`,
  });
}

export function sendPasswordChangedEmail({
  user,
}) {
  const accountUrl =
    `${getFrontendUrl()}/account`;

  const html = createEmailLayout({
    previewText:
      "Your Cartify password has been changed.",

    heading: "Password changed",

    content: `
      <p style="margin: 0 0 18px">
        Hi ${escapeHtml(user.firstName)},
      </p>

      <p style="margin: 0 0 18px">
        The password for your Cartify account was
        changed successfully.
      </p>

      <div
        style="
          margin: 24px 0;
          padding: 18px;
          border: 1px solid #e0daeb;
          border-radius: 14px;
          background: #f8f6fc;
        "
      >
        <strong style="color: #272238">
          Didn’t make this change?
        </strong>

        <p
          style="
            margin: 8px 0 0;
            color: #716b7e;
          "
        >
          Contact Cartify support immediately and
          secure your email account.
        </p>
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

  return sendEmail({
    to: user.email,
    subject: "Your Cartify password was changed",
    html,

    text: [
      `Hi ${user.firstName},`,
      "",
      "Your Cartify password was changed successfully.",
      "",
      "If you did not make this change, contact Cartify support immediately.",
      "",
      `Review your account: ${accountUrl}`,
    ].join("\n"),

    testLabel: "password-changed",
  });
}