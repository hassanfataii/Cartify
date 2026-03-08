import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function LoginPage() {
  const [mode, setMode] = React.useState("login");
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const nav = useNavigate();
  const { loginWithCredentials, registerWithCredentials } = useAuth();

  const onSubmitLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const { ok, error } = await loginWithCredentials(data.email, data.password);
      if (!ok) throw new Error(error || "Login failed");
      nav("/shop");
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const { ok, error } = await registerWithCredentials({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password
      });
      if (!ok) throw new Error(error || "Registration failed");
      nav("/shop");
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="container">
        <div className="logreg">
          <div className="toggle-form">
            <button
              id="loginBtn"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
              disabled={loading}
            >
              Login
            </button>
            <button
              id="registerBtn"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
              type="button"
              disabled={loading}
            >
              Register
            </button>
          </div>

          <form
            id="login"
            className={`logreg-form ${mode === "login" ? "active" : ""}`}
            onSubmit={onSubmitLogin}
          >
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit" disabled={loading}>
              {loading ? "Please wait…" : "Login"}
            </button>
          </form>

          <form
            id="register"
            className={`logreg-form ${mode === "register" ? "active" : ""}`}
            onSubmit={onSubmitRegister}
          >
            <input name="firstName" type="text" placeholder="First Name" required />
            <input name="lastName" type="text" placeholder="Last Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="phone" type="tel" placeholder="Phone Number" />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit" disabled={loading}>
              {loading ? "Please wait…" : "Register"}
            </button>
          </form>

          {error && <p className="auth-error">{error}</p>}
        </div>
      </section>
    </main>
  );
}
