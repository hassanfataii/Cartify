import { useState } from "react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";

function firstError(fields) {
  return Object.values(fields || {})
    .flat()
    .find(Boolean);
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [fieldErrors, setFieldErrors] =
    useState({});
  const [generalError, setGeneralError] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const {
    user,
    initialising,
    login,
    googleLogin,
    register,
  } = useAuth();

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const requestedDestination =
    location.state?.from;

  const destination =
    typeof requestedDestination === "string" &&
    requestedDestination.startsWith("/")
      ? requestedDestination
      : "/shop";

  function changeMode(nextMode) {
    setMode(nextMode);
    setFieldErrors({});
    setGeneralError("");
  }

  async function handleLogin(event) {
    event.preventDefault();

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    const form =
      new FormData(event.currentTarget);

    try {
      await login({
        email: form.get("email"),
        password: form.get("password"),
      });

      toast.success(
        "Welcome back. You’re now logged in.",
      );

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      const message =
        firstError(error.fields) ||
        error.message ||
        "Login failed";

      setFieldErrors(error.fields || {});
      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    const form =
      new FormData(event.currentTarget);

    try {
      await register({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
      });

      toast.success(
        "Account created successfully. Welcome to Cartify!",
      );

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      const message =
        firstError(error.fields) ||
        error.message ||
        "Registration failed";

      setFieldErrors(error.fields || {});
      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential) {
    if (submitting || !credential) return;
    setSubmitting(true);
    setGeneralError("");
    try {
      await googleLogin(credential);
      toast.success("You’re signed in with Google.");
      navigate(destination, { replace: true });
    } catch (error) {
      const message = error.message || "Google sign-in failed";
      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (initialising) {
    return (
      <main className="auth-page container">
        <p role="status">
          Checking your session…
        </p>
      </main>
    );
  }

  if (user) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return (
    <main className="auth-page container">
      <section className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">
            Your Cartify account
          </p>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create an account"}
          </h1>

          <p>
            {mode === "login"
              ? "Log in to access your cart, wishlist and orders."
              : "Register to start building your cart and wishlist."}
          </p>
        </div>

        <div
          className="auth-toggle"
          aria-label="Authentication options"
        >
          <button
            className={
              mode === "login"
                ? "active"
                : ""
            }
            type="button"
            onClick={() =>
              changeMode("login")
            }
            disabled={submitting}
          >
            Login
          </button>

          <button
            className={
              mode === "register"
                ? "active"
                : ""
            }
            type="button"
            onClick={() =>
              changeMode("register")
            }
            disabled={submitting}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form
            className="auth-form"
            onSubmit={handleLogin}
            noValidate
          >
            <label>
              <span>Email address</span>

              <input
                name="email"
                type="email"
                autoComplete="email"
                required
              />

              {fieldErrors.email?.[0] && (
                <small className="field-error">
                  {fieldErrors.email[0]}
                </small>
              )}
            </label>

            <label>
              <span>Password</span>

              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />

              {fieldErrors.password?.[0] && (
                <small className="field-error">
                  {fieldErrors.password[0]}
                </small>
              )}
            </label>

            <div className="auth-form__assistance">
              <Link to="/forgot-password">
                Forgot your password?
              </Link>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Logging in…"
                : "Login"}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleRegister}
            noValidate
          >
            <div className="auth-form__row">
              <label>
                <span>First name</span>

                <input
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
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
                required
              />

              {fieldErrors.email?.[0] && (
                <small className="field-error">
                  {fieldErrors.email[0]}
                </small>
              )}
            </label>

            <label>
              <span>
                Phone number (optional)
              </span>

              <input
                name="phone"
                type="tel"
                autoComplete="tel"
              />

              {fieldErrors.phone?.[0] && (
                <small className="field-error">
                  {fieldErrors.phone[0]}
                </small>
              )}
            </label>

            <label>
              <span>Password</span>

              <input
                name="password"
                type="password"
                autoComplete="new-password"
                aria-describedby={
                  "password-requirements"
                }
                required
              />

              <small
                id="password-requirements"
                className="form-help"
              >
                Use 8–72 characters, including
                uppercase, lowercase and a number.
              </small>

              {fieldErrors.password?.[0] && (
                <small className="field-error">
                  {fieldErrors.password[0]}
                </small>
              )}
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Creating account…"
                : "Create account"}
            </button>
          </form>
        )}

        <div className="auth-google-option">
          <span className="auth-google-option__divider">or continue with</span>
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
        </div>

        {generalError && (
          <p
            className="auth-error"
            role="alert"
          >
            {generalError}
          </p>
        )}
      </section>
    </main>
  );
}
