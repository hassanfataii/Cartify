import { useState } from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  resetAccountPassword,
} from "../api/auth";
import { useToast } from "../context/ToastContext";

function firstError(fields) {
  return Object.values(fields || {})
    .flat()
    .find(Boolean);
}

export default function ResetPasswordPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const token =
    searchParams.get("token")?.trim() || "";

  const [fieldErrors, setFieldErrors] =
    useState({});
  const [generalError, setGeneralError] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [completed, setCompleted] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    const form =
      new FormData(event.currentTarget);

    const password =
      String(form.get("password") || "");

    const confirmPassword =
      String(
        form.get("confirmPassword") || "",
      );

    if (password !== confirmPassword) {
      const message =
        "The passwords do not match";

      setFieldErrors({
        confirmPassword: [message],
      });

      setGeneralError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    try {
      const data =
        await resetAccountPassword({
          token,
          password,
        });

      setCompleted(true);
      toast.success(data.message);
    } catch (requestError) {
      const message =
        firstError(requestError.fields) ||
        requestError.message ||
        "Unable to reset your password";

      setFieldErrors(
        requestError.fields || {},
      );

      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page container">
        <section className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">
              Invalid reset link
            </p>

            <h1>Reset token missing</h1>

            <p>
              This password-reset link is incomplete.
              Request a new one to continue.
            </p>
          </div>

          <Link
            className="primary-button"
            to="/forgot-password"
          >
            Request another link
          </Link>
        </section>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="auth-page container">
        <section className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">
              Password updated
            </p>

            <h1>Your password has been reset</h1>

            <p>
              Your old password will no longer work.
              Log in using the new password you just
              created.
            </p>
          </div>

          <Link
            className="primary-button"
            to="/login"
          >
            Continue to login
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
            Secure your account
          </p>

          <h1>Create a new password</h1>

          <p>
            Choose a password you haven’t used for this
            account before.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label>
            <span>New password</span>

            <input
              name="password"
              type="password"
              autoComplete="new-password"
              aria-describedby={
                "reset-password-requirements"
              }
              required
            />

            <small
              id="reset-password-requirements"
              className="form-help"
            >
              Use 8–72 characters, including uppercase,
              lowercase and a number.
            </small>

            {fieldErrors.password?.[0] && (
              <small className="field-error">
                {fieldErrors.password[0]}
              </small>
            )}
          </label>

          <label>
            <span>Confirm new password</span>

            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />

            {fieldErrors.confirmPassword?.[0] && (
              <small className="field-error">
                {
                  fieldErrors
                    .confirmPassword[0]
                }
              </small>
            )}
          </label>

          {generalError && (
            <p
              className="auth-error"
              role="alert"
            >
              {generalError}
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Resetting password…"
              : "Reset password"}
          </button>
        </form>

        <Link
          className="auth-secondary-link"
          to="/forgot-password"
        >
          Request a different reset link
        </Link>
      </section>
    </main>
  );
}