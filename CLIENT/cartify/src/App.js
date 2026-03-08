import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout";
import HomePage from "./pages/homePage";
import ProductsPage from "./pages/productsPage";
import LoginPage from "./pages/loginPage";
import { AuthProvider } from "./context/authContext";
import { WishlistProvider } from "./context/wishlistContext";
import WishlistPage from "./pages/wishlistPage";
import { CartProvider } from "./context/cartContext";
import CartPage from "./pages/cartPage";
import CheckoutPage from "./pages/checkoutPage";
import CheckoutSuccess from "./pages/checkoutSuccess";
import CheckoutCancel from "./pages/checkoutCancel";
import OrdersPage from "./pages/ordersPage";
import OrderDetailPage from "./pages/orderDetailPage";
import ProfilePage from "./pages/profilePage";
import FaqPage from "./pages/faqPage";
import "./styles/base.css"; 

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ProductsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route path="*" element={<main><h2>404</h2></main>} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/faq" element={<FaqPage />} />
            </Routes>
          </Layout>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  </BrowserRouter>
);
}
