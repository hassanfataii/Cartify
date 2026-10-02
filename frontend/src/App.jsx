import {
  Link,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "./components/layout/AdminLayout";
import AdminRoute from "./components/layout/AdminRoute";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import SiteLayout from "./components/layout/SiteLayout";

import AccountPage from "./pages/AccountPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminReturnsPage from "./pages/AdminReturnsPage";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import OrderPage from "./pages/OrderPage";
import OrdersPage from "./pages/OrdersPage";
import ProductPage from "./pages/ProductPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ShopPage from "./pages/ShopPage";
import WishlistPage from "./pages/WishlistPage";

import "./styles/app.scss";

function NotFoundPage() {
  return (
    <main className="message-page container">
      <p className="eyebrow">
        404 error
      </p>

      <h1>
        Page not found
      </h1>

      <p>
        The page you requested doesn’t
        exist.
      </p>

      <Link
        className="primary-button"
        to="/"
      >
        Return home
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <SiteLayout />
        }
      >
        <Route
          path="/"
          element={
            <HomePage />
          }
        />

        <Route
          path="/shop"
          element={
            <ShopPage />
          }
        />

        <Route
          path="/products/:slug"
          element={
            <ProductPage />
          }
        />

        <Route
          path="/login"
          element={
            <AuthPage />
          }
        />

        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPage />
          }
        />

        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage />
          }
        />

        <Route
          element={
            <ProtectedRoute />
          }
        >
          <Route
            path="/account"
            element={
              <AccountPage />
            }
          />

          <Route
            path="/cart"
            element={
              <CartPage />
            }
          />

          <Route
            path="/wishlist"
            element={
              <WishlistPage />
            }
          />

          <Route
            path="/orders"
            element={
              <OrdersPage />
            }
          />

          <Route
            path="/orders/:orderId"
            element={
              <OrderPage />
            }
          />

          <Route
            path="/checkout/success"
            element={
              <CheckoutSuccessPage />
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <NotFoundPage />
          }
        />
      </Route>

      <Route
        element={
          <AdminRoute />
        }
      >
        <Route
          element={
            <AdminLayout />
          }
        >
          <Route
            path="/admin"
            element={
              <AdminDashboardPage />
            }
          />

          <Route
            path="/admin/products"
            element={
              <AdminProductsPage />
            }
          />

          <Route
            path="/admin/returns"
            element={
              <AdminReturnsPage />
            }
          />

          <Route
            path="/admin/orders"
            element={
              <AdminOrdersPage />
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}