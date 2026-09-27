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

export function sendWelcomeEmail({ user }) {
  const accountUrl = `${getFrontendUrl()}/account`;
  const firstName = escapeHtml(user.firstName);

  const html = createEmailLayout({
    previewText:
      "Your Cartify account has been created.",
    heading: `Welcome to Cartify, ${user.firstName}`,
    content: `
      <p style="margin: 0 0 18px">
        Hi ${firstName},
      </p>

      <p style="margin: 0 0 18px">
        Your Cartify account has been created
        successfully. You can now save products,
        manage your cart and keep track of your orders.
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
              href="${accountUrl}"
              style="
                display: inline-block;
                padding: 14px 22px;
                color: #ffffff;
                font-weight: 700;
                text-decoration: none;
              "
            >
              Visit your account
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
        If you didn’t create this account, you can
        ignore this email for now.
      </p>
    `,
  });

  return sendEmail({
    to: user.email,
    subject: "Welcome to Cartify",
    html,
    text:
      `Hi ${user.firstName}, your Cartify account ` +
      `has been created successfully. Visit your ` +
      `account at ${accountUrl}`,
    testLabel: "welcome",
  });
}