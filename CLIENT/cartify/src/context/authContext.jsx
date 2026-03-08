import React from "react";
import { login, register, me } from "../api/auth";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [token, setToken] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const tk = localStorage.getItem("auth.token") || "";
    const u = localStorage.getItem("auth.user");
    if (tk) setToken(tk);
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
  }, []);

  React.useEffect(() => {
    if (token) {
      localStorage.setItem("auth.token", token);
    } else {
      localStorage.removeItem("auth.token");
    }
  }, [token]);

  React.useEffect(() => {
    if (user) {
      localStorage.setItem("auth.user", JSON.stringify(user));
    } else {
      localStorage.removeItem("auth.user");
    }
  }, [user]);

  const loginWithCredentials = async (email, password) => {
    setLoading(true);
    setError("");
    try {
      const { token: tk, user: u } = await login({ email, password });
      setToken(tk || "");
      setUser(u || null);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Login failed";
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const registerWithCredentials = async ({ firstName, lastName, email, password }) => {
    setLoading(true);
    setError("");
    try {
      const { token: tk, user: u } = await register({ firstName, lastName, email, password });
      setToken(tk || "");
      setUser(u || null);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Registration failed";
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    if (!token) return { ok: false, error: "No token" };
    setLoading(true);
    setError("");
    try {
      const u = await me(token);
      setUser(u || null);
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Failed to fetch user";
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setError("");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        loginWithCredentials,
        registerWithCredentials,
        fetchMe,
        logout,
        setUser,
        setToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
