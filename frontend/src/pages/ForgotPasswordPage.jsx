import { useState } from "react";
import { Link } from "react-router-dom";

import {
  requestPasswordReset,
} from "../api/auth";
import { useToast } from "../context/ToastContext";

export default function ForgotPasswordPage() {
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const data =
        await requestPasswordReset(email);

      setSubmittedEmail(email);
      toast.success(data.message);
    } catch (requestError) {
      const message =
        requestError.fields?.email?.[0] ||
        requestError.message ||
        "Unable to request a password reset";

      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedEmail) {
    return (
      <main className="auth-page container">
        <section className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">
              Password recovery
            </p>

            <h1>Check your email</h1>

            <p>
              If an account exists for{" "}
              <strong>{submittedEmail}</strong>, we’ve
              sent it a password-reset link.
            </p>

            <p>
              The link expires in one hour and can only
              be used once.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setSubmittedEmail("");
              setError("");
            }}
          >
            Try another email
          </button>

          <Link
            className="primary-button"
            to="/login"
          >
            Return to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page container">
      <section className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">
            Password recovery
          </p>

          <h1>Forgot your password?</h1>

          <p>
            Enter your account email and we’ll send you
            a secure link to create a new password.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label>
            <span>Email address</span>

            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              autoComplete="email"
              required
            />
          </label>

          {error && (
            <p
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Sending reset link…"
              : "Send reset link"}
          </button>
        </form>

        <Link
          className="auth-secondary-link"
          to="/login"
        >
          Remembered your password? Return to login
        </Link>
      </section>
    </main>
  );
}