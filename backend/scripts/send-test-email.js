import "dotenv/config";

import {
  createEmailLayout,
  escapeHtml,
} from "../src/emails/email-layout.js";
import { sendEmail } from "../src/services/email.service.js";

async function sendTestEmail() {
  const intendedRecipient =
    process.argv[2] || "customer@example.com";

  const html = createEmailLayout({
    previewText:
      "Your Cartify email system is connected.",
    heading: "Email system connected",
    content: `
      <p style="margin: 0 0 18px">
        Hello,
      </p>

      <p style="margin: 0 0 18px">
        Cartify can now send transactional emails.
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
        <strong>Intended customer:</strong>
        ${escapeHtml(intendedRecipient)}
      </div>

      <p style="margin: 0">
        This test confirms that the shared email service
        is configured correctly.
      </p>
    `,
  });

  const result = await sendEmail({
    to: intendedRecipient,
    subject: "Cartify email system connected",
    html,
    text:
      "Cartify can now send transactional emails.",
    testLabel: "setup",
  });

  if (!result.sent) {
    console.error(
      "Test email was not sent:",
      result.reason || result.error,
    );

    process.exitCode = 1;
    return;
  }

  console.log("Test completed successfully.");
  console.log(`Resend email ID: ${result.id}`);
}

sendTestEmail().catch((error) => {
  console.error(
    "Unable to run email test:",
    error,
  );

  process.exitCode = 1;
});