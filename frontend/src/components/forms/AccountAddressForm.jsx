import {
  useState,
} from "react";

import {
  addAccountAddress,
  updateAccountAddress,
} from "../../api/account";

import {
  useToast,
} from "../../context/ToastContext";

function firstError(fields) {
  return Object.values(fields || {})
    .flat()
    .find(Boolean);
}

export default function AccountAddressForm({
  address,
  onSaved,
  onCancel,
}) {
  const toast = useToast();

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [generalError, setGeneralError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const editing = Boolean(address);

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    const form = new FormData(
      event.currentTarget,
    );

    const payload = {
      label: form.get("label"),
      recipientName:
        form.get("recipientName"),
      line1: form.get("line1"),
      line2: form.get("line2"),
      city: form.get("city"),
      county: form.get("county"),
      postcode: form.get("postcode"),
      country: form.get("country"),
      phone: form.get("phone"),
      isDefault:
        form.get("isDefault") === "on",
    };

    try {
      const response = editing
        ? await updateAccountAddress(
            address.id,
            payload,
          )
        : await addAccountAddress(
            payload,
          );

      toast.success(
        response.message ||
          "Address saved successfully",
      );

      onSaved(response.addresses);
    } catch (requestError) {
      const message =
        firstError(
          requestError.fields,
        ) ||
        requestError.message ||
        "Unable to save this address";

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
      className="account-form address-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="account-form__row">
        <label>
          <span>
            Address label
          </span>

          <input
            name="label"
            type="text"
            defaultValue={
              address?.label || ""
            }
            placeholder="Home or Work"
            required
          />

          {fieldErrors.label?.[0] && (
            <small className="field-error">
              {fieldErrors.label[0]}
            </small>
          )}
        </label>

        <label>
          <span>
            Recipient name
          </span>

          <input
            name="recipientName"
            type="text"
            autoComplete="name"
            defaultValue={
              address?.recipientName || ""
            }
            required
          />

          {fieldErrors
            .recipientName?.[0] && (
            <small className="field-error">
              {
                fieldErrors
                  .recipientName[0]
              }
            </small>
          )}
        </label>
      </div>

      <label>
        <span>
          Address line one
        </span>

        <input
          name="line1"
          type="text"
          autoComplete="address-line1"
          defaultValue={
            address?.line1 || ""
          }
          required
        />

        {fieldErrors.line1?.[0] && (
          <small className="field-error">
            {fieldErrors.line1[0]}
          </small>
        )}
      </label>

      <label>
        <span>
          Address line two
        </span>

        <input
          name="line2"
          type="text"
          autoComplete="address-line2"
          defaultValue={
            address?.line2 || ""
          }
        />

        {fieldErrors.line2?.[0] && (
          <small className="field-error">
            {fieldErrors.line2[0]}
          </small>
        )}
      </label>

      <div className="account-form__row">
        <label>
          <span>
            Town or city
          </span>

          <input
            name="city"
            type="text"
            autoComplete="address-level2"
            defaultValue={
              address?.city || ""
            }
            required
          />

          {fieldErrors.city?.[0] && (
            <small className="field-error">
              {fieldErrors.city[0]}
            </small>
          )}
        </label>

        <label>
          <span>
            County
          </span>

          <input
            name="county"
            type="text"
            autoComplete="address-level1"
            defaultValue={
              address?.county || ""
            }
          />

          {fieldErrors.county?.[0] && (
            <small className="field-error">
              {fieldErrors.county[0]}
            </small>
          )}
        </label>
      </div>

      <div className="account-form__row">
        <label>
          <span>
            Postcode
          </span>

          <input
            name="postcode"
            type="text"
            autoComplete="postal-code"
            defaultValue={
              address?.postcode || ""
            }
            required
          />

          {fieldErrors.postcode?.[0] && (
            <small className="field-error">
              {fieldErrors.postcode[0]}
            </small>
          )}
        </label>

        <label>
          <span>
            Country
          </span>

          <select
            name="country"
            autoComplete="country"
            defaultValue={
              address?.country || "GB"
            }
            required
          >
            <option value="GB">
              United Kingdom
            </option>
          </select>

          {fieldErrors.country?.[0] && (
            <small className="field-error">
              {fieldErrors.country[0]}
            </small>
          )}
        </label>
      </div>

      <label>
        <span>
          Delivery phone number
        </span>

        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={
            address?.phone || ""
          }
        />

        {fieldErrors.phone?.[0] && (
          <small className="field-error">
            {fieldErrors.phone[0]}
          </small>
        )}
      </label>

      <label className="account-checkbox">
        <input
          name="isDefault"
          type="checkbox"
          defaultChecked={
            address?.isDefault || false
          }
        />

        <span>
          Use as my default address
        </span>
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
          className="secondary-button"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Saving address…"
            : editing
              ? "Save address"
              : "Add address"}
        </button>
      </div>
    </form>
  );
}