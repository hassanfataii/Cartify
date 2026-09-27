import { Resend } from "resend";

let resendClient;

function getEmailMode() {
  return (
    process.env.EMAIL_MODE
      ?.trim()
      .toLowerCase() || "log"
  );
}

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(
      process.env.RESEND_API_KEY,
    );
  }

  return resendClient;
}

function createTestAddress(label = "general") {
  const safeLabel = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return (
    `delivered+${safeLabel || "general"}` +
    "@resend.dev"
  );
}

function emailErrorMessage(error) {
  if (!error) {
    return "Unknown email error";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error.name ||
    JSON.stringify(error)
  );
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  testLabel = "cartify",
  idempotencyKey,
}) {
  const mode = getEmailMode();

  if (mode === "log") {
    console.log("[EMAIL LOG]", {
      to,
      subject,
      testLabel,
      idempotencyKey,
    });

    return {
      sent: false,
      skipped: true,
      reason: "Email mode is set to log",
    };
  }

  if (mode !== "test" && mode !== "live") {
    console.error("[EMAIL SKIPPED] Invalid EMAIL_MODE:", mode);
    return { sent: false, skipped: true, reason: "Invalid email mode" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[EMAIL SKIPPED] RESEND_API_KEY is missing",
    );

    return {
      sent: false,
      skipped: true,
      reason: "Resend API key is missing",
    };
  }

  if (!process.env.EMAIL_FROM) {
    console.warn(
      "[EMAIL SKIPPED] EMAIL_FROM is missing",
    );

    return {
      sent: false,
      skipped: true,
      reason: "Sender address is missing",
    };
  }

  if (!to) {
    console.warn(
      "[EMAIL SKIPPED] Recipient is missing",
    );

    return {
      sent: false,
      skipped: true,
      reason: "Recipient address is missing",
    };
  }

  const recipient =
    mode === "live"
      ? to
      : createTestAddress(testLabel);

  const payload = {
    from: process.env.EMAIL_FROM,
    to: [recipient],
    subject,
    html,
    text,
  };

  try {
    const resend = getResendClient();

    const result = idempotencyKey
      ? await resend.emails.send(
          payload,
          {
            idempotencyKey,
          },
        )
      : await resend.emails.send(payload);

    const { data, error } = result;

    if (error) {
      console.error("[EMAIL FAILED]", {
        recipient,
        subject,
        error,
      });

      return {
        sent: false,
        skipped: false,
        error:
          emailErrorMessage(error),
      };
    }

    console.log("[EMAIL SENT]", {
      id: data.id,
      mode,
      recipient,
      intendedRecipient: to,
      subject,
      idempotencyKey,
    });

    return {
      sent: true,
      skipped: false,
      id: data.id,
      recipient,
      intendedRecipient: to,
    };
  } catch (error) {
    const message =
      emailErrorMessage(error);

    console.error("[EMAIL FAILED]", {
      recipient,
      subject,
      message,
    });

    return {
      sent: false,
      skipped: false,
      error: message,
    };
  }
}
