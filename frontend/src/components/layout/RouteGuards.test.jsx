import {
  render,
  screen,
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import AdminRoute from "./AdminRoute";
import ProtectedRoute from "./ProtectedRoute";

const authState = vi.hoisted(() => ({
  value: {
    user: null,
    isAuthenticated: false,
    initialising: false,
  },
}));

vi.mock(
  "../../context/AuthContext",
  () => ({
    useAuth: () => authState.value,
  }),
);

function LoginPage() {
  const location = useLocation();

  return (
    <p>
      Login destination:{" "}
      {location.state?.from || "none"}
    </p>
  );
}

beforeEach(() => {
  authState.value = {
    user: null,
    isAuthenticated: false,
    initialising: false,
  };
});

describe("route protection", () => {
  it("shows a loading state while authentication initialises", () => {
    authState.value = {
      user: null,
      isAuthenticated: false,
      initialising: true,
    };

    render(
      <MemoryRouter
        initialEntries={[
          "/cart",
        ]}
      >
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/cart"
              element={<p>Private cart</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Checking your session...",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Private cart"),
    ).not.toBeInTheDocument();
  });

  it("redirects signed-out customers and remembers the destination", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/orders?page=2",
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/orders"
              element={<p>Private orders</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Login destination: /orders?page=2",
      ),
    ).toBeInTheDocument();
  });

  it("allows authenticated customers into protected routes", () => {
    authState.value = {
      user: {
        role: "customer",
      },
      isAuthenticated: true,
      initialising: false,
    };

    render(
      <MemoryRouter
        initialEntries={[
          "/cart",
        ]}
      >
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/cart"
              element={<p>Private cart</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Private cart"),
    ).toBeInTheDocument();
  });

  it("redirects signed-out admins and remembers the exact admin page", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/admin/orders?status=shipped",
        ]}
      >
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route element={<AdminRoute />}>
            <Route
              path="/admin/orders"
              element={<p>Admin orders</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Login destination: /admin/orders?status=shipped",
      ),
    ).toBeInTheDocument();
  });

  it("redirects customers away from administrator routes", () => {
    authState.value = {
      user: {
        role: "customer",
      },
      isAuthenticated: true,
      initialising: false,
    };

    render(
      <MemoryRouter
        initialEntries={[
          "/admin",
        ]}
      >
        <Routes>
          <Route
            path="/"
            element={<p>Store home</p>}
          />

          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={<p>Admin dashboard</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Store home"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Admin dashboard"),
    ).not.toBeInTheDocument();
  });

  it("allows administrators into administrator routes", () => {
    authState.value = {
      user: {
        role: "admin",
      },
      isAuthenticated: true,
      initialising: false,
    };

    render(
      <MemoryRouter
        initialEntries={[
          "/admin",
        ]}
      >
        <Routes>
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={<p>Admin dashboard</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Admin dashboard"),
    ).toBeInTheDocument();
  });
});