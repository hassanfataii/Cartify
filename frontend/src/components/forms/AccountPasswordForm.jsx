import {
  useState,
} from "react";

import {
  changeAccountPassword,
} from "../../api/account";

import {
  useToast,
} from "../../context/ToastContext";

function firstError(fields) {
  return Object.values(fields || {})
    .flat()
    .find(Boolean);
}

export default function AccountPasswordForm({ hasPassword, onPasswordSet }) {
  const toast = useToast();

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [generalError, setGeneralError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const formElement =
      event.currentTarget;

    const form = new FormData(
      formElement,
    );

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    try {
      const response =
        await changeAccountPassword({
          currentPassword:
            form.get("currentPassword"),
          newPassword:
            form.get("newPassword"),
          confirmPassword:
            form.get("confirmPassword"),
        });

      formElement.reset();
      onPasswordSet?.();

      toast.success(
        response.message ||
          "Password changed successfully",
      );
    } catch (requestError) {
      const message =
        firstError(
          requestError.fields,
        ) ||
        requestError.message ||
        "Unable to change your password";

      setFieldErrors(
        requestError.fields || {},
      );

      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="account-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {hasPassword && <label>
        <span>
          Current password
        </span>

        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />

        {fieldErrors
          .currentPassword?.[0] && (
          <small className="field-error">
            {
              fieldErrors
                .currentPassword[0]
            }
          </small>
        )}
      </label>}

      <label>
        <span>
          New password
        </span>

        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          aria-describedby="new-password-help"
          required
        />

        <small
          className="form-help"
          id="new-password-help"
        >
          Use 8–72 characters, including
          uppercase, lowercase and a number.
        </small>

        {fieldErrors
          .newPassword?.[0] && (
          <small className="field-error">
            {
              fieldErrors
                .newPassword[0]
            }
          </small>
        )}
      </label>

      <label>
        <span>
          Confirm new password
        </span>

        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />

        {fieldErrors
          .confirmPassword?.[0] && (
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

      <div className="account-form__actions">
        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? (hasPassword ? "Changing password…" : "Setting password…")
            : (hasPassword ? "Change password" : "Set password")}
        </button>
      </div>
    </form>
  );
}
