import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  loginAccount,
  loginWithGoogle,
  logoutAccount,
  registerAccount,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [
    initialising,
    setInitialising,
  ] = useState(true);

  const refreshUser =
    useCallback(async () => {
      const response =
        await getCurrentUser();

      const currentUser =
        response?.user ?? null;

      setUser(currentUser);

      return currentUser;
    }, []);

  useEffect(() => {
    let active = true;

    refreshUser()
      .catch((error) => {
        if (!active) return;

        console.error(
          "Failed to restore session:",
          error,
        );

        setUser(null);
      })
      .finally(() => {
        if (active) {
          setInitialising(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshUser]);

  const register =
    useCallback(
      async (details) => {
        const response =
          await registerAccount(
            details,
          );

        setUser(response.user);

        return response;
      },
      [],
    );

  const login =
    useCallback(
      async (credentials) => {
        const response =
          await loginAccount(
            credentials,
          );

        setUser(response.user);

        return response;
      },
      [],
    );

  const logout =
    useCallback(async () => {
      await logoutAccount();
      setUser(null);
    }, []);

  const googleLogin =
    useCallback(
      async (credential) => {
        const response =
          await loginWithGoogle(
            credential,
          );

        setUser(response.user);

        return response;
      },
      [],
    );

  const value = useMemo(
    () => ({
      user,
      initialising,
      isAuthenticated:
        Boolean(user),
      register,
      login,
      googleLogin,
      logout,
      refreshUser,
    }),
    [
      user,
      initialising,
      register,
      login,
      googleLogin,
      logout,
      refreshUser,
    ],
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}
