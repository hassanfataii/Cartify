import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  deleteAccountAddress,
  getAccount,
  updateAccountProfile,
} from "../api/account";

import AccountAddressForm from "../components/forms/AccountAddressForm";
import AccountPasswordForm from "../components/forms/AccountPasswordForm";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useCart,
} from "../context/CartContext";

import {
  useToast,
} from "../context/ToastContext";

import {
  useWishlist,
} from "../context/WishlistContext";

function firstError(fields) {
  return Object.values(fields || {})
    .flat()
    .find(Boolean);
}

function formatMemberSince(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      month: "long",
      year: "numeric",
    },
  ).format(new Date(date));
}

export default function AccountPage() {
  const {
    logout,
    refreshUser,
  } = useAuth();

  const { cart } = useCart();
  const { wishlist } = useWishlist();

  const toast = useToast();
  const navigate = useNavigate();

  const [account, setAccount] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState({});

  const [generalError, setGeneralError] =
    useState("");

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [profileEmail, setProfileEmail] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [addressFormOpen, setAddressFormOpen] =
    useState(false);

  const [editingAddress, setEditingAddress] =
    useState(null);

  const [
    deletingAddressId,
    setDeletingAddressId,
  ] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setError("");

      try {
        const response =
          await getAccount();

        if (!cancelled) {
          setAccount(response.user);
          setProfileEmail(response.user.email);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message ||
              "Unable to load your account",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProfileSubmit(
    event,
  ) {
    event.preventDefault();

    // React clears event.currentTarget after the
    // synchronous portion of the handler. Capture the
    // form and input before awaiting any requests.
    const formElement =
      event.currentTarget;

    const currentPasswordInput =
      formElement.elements.namedItem(
        "currentPassword",
      );

    const form =
      new FormData(formElement);

    setSavingProfile(true);
    setFieldErrors({});
    setGeneralError("");

    try {
      const response =
        await updateAccountProfile({
          firstName:
            form.get("firstName"),

          lastName:
            form.get("lastName"),

          email:
            form.get("email"),

          phone:
            form.get("phone"),

          currentPassword:
            form.get("currentPassword") || "",
        });

      setAccount(response.user);
      setProfileEmail(response.user.email);

      await refreshUser();

      toast.success(
        response.message ||
          "Account details updated",
      );

      if (
        currentPasswordInput instanceof
        HTMLInputElement
      ) {
        currentPasswordInput.value = "";
      }

      setEditingProfile(false);
    } catch (requestError) {
      const message =
        firstError(
          requestError.fields,
        ) ||
        requestError.message ||
        "Unable to update your account";

      setFieldErrors(
        requestError.fields || {},
      );

      setGeneralError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  }

  function openProfileForm() {
    setProfileEmail(account.email);
    setFieldErrors({});
    setGeneralError("");
    setEditingProfile(true);
  }

  function closeProfileForm() {
    setProfileEmail(account.email);
    setFieldErrors({});
    setGeneralError("");
    setEditingProfile(false);
  }

  function openNewAddressForm() {
    setEditingAddress(null);
    setAddressFormOpen(true);
  }

  function openEditAddressForm(address) {
    setEditingAddress(address);
    setAddressFormOpen(true);

    window.requestAnimationFrame(() => {
      document
        .getElementById("address-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function closeAddressForm() {
    setEditingAddress(null);
    setAddressFormOpen(false);
  }

  function handleAddressesSaved(
    addresses,
  ) {
    setAccount((current) => ({
      ...current,
      addresses,
    }));

    closeAddressForm();
  }

  async function handleDeleteAddress(
    address,
  ) {
    const confirmed = window.confirm(
      `Remove the ${address.label} address?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingAddressId(address.id);

    try {
      const response =
        await deleteAccountAddress(
          address.id,
        );

      setAccount((current) => ({
        ...current,
        addresses:
          response.addresses,
      }));

      toast.success(
        response.message ||
          "Address removed",
      );

      if (
        editingAddress?.id ===
        address.id
      ) {
        closeAddressForm();
      }
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to remove this address",
      );
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();

      toast.success(
        "You’ve been logged out.",
      );

      navigate("/");
    } catch (requestError) {
      toast.error(
        requestError.message ||
          "Unable to log out",
      );

      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="message-page">
        <p role="status">
          Loading your account…
        </p>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="message-page">
        <p className="eyebrow">
          Your account
        </p>

        <h1>
          Account unavailable
        </h1>

        <p role="alert">
          {error}
        </p>

        <button
          className="primary-button"
          type="button"
          onClick={() =>
            window.location.reload()
          }
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="account-page">
      <header className="account-heading">
        <div>
          <p className="eyebrow">
            Your Cartify account
          </p>

          <h1>
            Hi, {account.firstName}
          </h1>

          <p>
            Manage your personal details,
            deliveries and shopping activity.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? "Logging out…"
            : "Logout"}
        </button>
      </header>

      <section
        className="account-summary"
        aria-label="Account summary"
      >
        <article className="account-summary-card">
          <span>
            Cart
          </span>

          <strong>
            {cart.itemCount}
          </strong>

          <Link to="/cart">
            View cart
          </Link>
        </article>

        <article className="account-summary-card">
          <span>
            Wishlist
          </span>

          <strong>
            {wishlist.itemCount}
          </strong>

          <Link to="/wishlist">
            View wishlist
          </Link>
        </article>

        <article className="account-summary-card">
          <span>
            Saved addresses
          </span>

          <strong>
            {account.addresses.length}
          </strong>

          <a href="#addresses">
            Manage addresses
          </a>
        </article>

        <article className="account-summary-card">
          <span>
            Member since
          </span>

          <strong className="account-summary-card__text">
            {formatMemberSince(
              account.createdAt,
            )}
          </strong>

          <Link to="/orders">
            View orders
          </Link>
        </article>
      </section>

      <nav
        className="account-navigation"
        aria-label="Account navigation"
      >
        <a href="#personal-details">
          Personal details
        </a>

        <a href="#addresses">
          Addresses
        </a>

        <a href="#security">
          Security
        </a>

        <Link to="/orders">
          Orders
        </Link>

        <Link to="/wishlist">
          Wishlist
        </Link>

        {account.role === "admin" && (
          <Link to="/admin">
            Administration
          </Link>
        )}
      </nav>

      <section
        className="account-panel"
        id="personal-details"
      >
        <div className="account-panel__heading account-panel__heading--actions">
          <div>
            <p className="eyebrow">
              Profile
            </p>

            <h2>
              Personal details
            </h2>

            <p>
              Keep your contact information
              up to date.
            </p>
          </div>

          {!editingProfile && (
            <button
              className="secondary-button"
              type="button"
              onClick={openProfileForm}
            >
              Edit information
            </button>
          )}
        </div>

        {!editingProfile ? (
          <dl className="account-detail-list">
            <div>
              <dt>Name</dt>
              <dd>
                {account.firstName} {account.lastName}
              </dd>
            </div>

            <div>
              <dt>Email address</dt>
              <dd>{account.email}</dd>
            </div>

            <div>
              <dt>Phone number</dt>
              <dd>{account.phone || "Not provided"}</dd>
            </div>
          </dl>
        ) : (
          <form
            className="account-form"
            onSubmit={handleProfileSubmit}
            noValidate
          >
            <div className="account-form__row">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  defaultValue={account.firstName}
                  required
                />

                {fieldErrors.firstName?.[0] && (
                  <small className="field-error">
                    {fieldErrors.firstName[0]}
                  </small>
                )}
              </label>

              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  defaultValue={account.lastName}
                  required
                />

                {fieldErrors.lastName?.[0] && (
                  <small className="field-error">
                    {fieldErrors.lastName[0]}
                  </small>
                )}
              </label>
            </div>

            <label>
              <span>Email address</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                required
              />

              {fieldErrors.email?.[0] && (
                <small className="field-error">
                  {fieldErrors.email[0]}
                </small>
              )}
            </label>

            <label>
              <span>Phone number</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={account.phone}
              />

              {fieldErrors.phone?.[0] && (
                <small className="field-error">
                  {fieldErrors.phone[0]}
                </small>
              )}
            </label>

            {profileEmail.trim().toLowerCase() !==
              account.email.toLowerCase() && (
              <label>
                <span>Current password</span>
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />

                {fieldErrors.currentPassword?.[0] && (
                  <small className="field-error">
                    {fieldErrors.currentPassword[0]}
                  </small>
                )}
              </label>
            )}

            {generalError && (
              <p className="auth-error" role="alert">
                {generalError}
              </p>
            )}

            <div className="account-form__actions">
              <button
                className="secondary-button"
                type="button"
                onClick={closeProfileForm}
                disabled={savingProfile}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="submit"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving changes…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        className="account-panel"
        id="addresses"
      >
        <div className="account-panel__heading account-panel__heading--actions">
          <div>
            <p className="eyebrow">
              Delivery
            </p>

            <h2>
              Saved addresses
            </h2>

            <p>
              Store your delivery details
              for faster checkout.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={openNewAddressForm}
          >
            Add address
          </button>
        </div>

        {account.addresses.length === 0 ? (
          <div className="account-empty-state">
            <h3>
              No saved addresses
            </h3>

            <p>
              Add your first delivery
              address when you’re ready.
            </p>
          </div>
        ) : (
          <div className="address-grid">
            {account.addresses.map(
              (address) => (
                <article
                  className="address-card"
                  key={address.id}
                >
                  <div className="address-card__heading">
                    <h3>
                      {address.label}
                    </h3>

                    {address.isDefault && (
                      <span className="address-default">
                        Default
                      </span>
                    )}
                  </div>

                  <address>
                    <strong>
                      {
                        address
                          .recipientName
                      }
                    </strong>

                    <span>
                      {address.line1}
                    </span>

                    {address.line2 && (
                      <span>
                        {address.line2}
                      </span>
                    )}

                    <span>
                      {address.city}
                    </span>

                    {address.county && (
                      <span>
                        {address.county}
                      </span>
                    )}

                    <span>
                      {address.postcode}
                    </span>

                    <span>
                      United Kingdom
                    </span>

                    {address.phone && (
                      <span>
                        {address.phone}
                      </span>
                    )}
                  </address>

                  <div className="address-card__actions">
                    <button
                      type="button"
                      onClick={() =>
                        openEditAddressForm(
                          address,
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="danger-link"
                      type="button"
                      onClick={() =>
                        handleDeleteAddress(
                          address,
                        )
                      }
                      disabled={
                        deletingAddressId ===
                        address.id
                      }
                    >
                      {deletingAddressId ===
                      address.id
                        ? "Removing…"
                        : "Remove"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {addressFormOpen && (
          <div
            className="address-form-panel"
            id="address-form"
          >
            <div className="account-panel__heading">
              <div>
                <h3>
                  {editingAddress
                    ? `Edit ${editingAddress.label}`
                    : "Add a new address"}
                </h3>

                <p>
                  Enter the delivery
                  information below.
                </p>
              </div>
            </div>

            <AccountAddressForm
              key={
                editingAddress?.id ||
                "new-address"
              }
              address={editingAddress}
              onSaved={
                handleAddressesSaved
              }
              onCancel={
                closeAddressForm
              }
            />
          </div>
        )}
      </section>

      <section
        className="account-panel"
        id="security"
      >
        <div className="account-panel__heading">
          <div>
            <p className="eyebrow">
              Security
            </p>

            <h2>
              {account?.hasPassword ? "Change password" : "Set a password"}
            </h2>

            <p>
              {account?.hasPassword
                ? "Use a strong password that you don’t use elsewhere."
                : "You can keep using Google, or set a Cartify password for email sign-in."}
            </p>
          </div>
        </div>

        <AccountPasswordForm
          hasPassword={account?.hasPassword ?? true}
          onPasswordSet={() => setAccount((current) => current ? { ...current, hasPassword: true } : current)}
        />
      </section>

      <section className="account-panel">
        <div className="account-panel__heading">
          <div>
            <p className="eyebrow">
              Shopping
            </p>

            <h2>
              Your activity
            </h2>

            <p>
              Review purchases and products
              you’ve saved for later.
            </p>
          </div>
        </div>

        <div className="account-link-list">
          <Link to="/orders">
            <span>
              Order history
            </span>

            <strong>
              View your orders →
            </strong>
          </Link>

          <Link to="/wishlist">
            <span>
              Wishlist
            </span>

            <strong>
              {wishlist.itemCount} saved →
            </strong>
          </Link>

          <Link to="/cart">
            <span>
              Shopping cart
            </span>

            <strong>
              {cart.itemCount} items →
            </strong>
          </Link>
        </div>
      </section>

      {account.role === "admin" && (
        <section className="account-panel account-admin-card">
          <p className="eyebrow">
            Administrator
          </p>

          <h2>
            Manage Cartify
          </h2>

          <p>
            Review products, orders,
            payments and inventory.
          </p>

          <Link
            className="primary-button"
            to="/admin"
          >
            Open administration
          </Link>
        </section>
      )}
    </main>
  );
}
