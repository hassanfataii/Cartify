import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addItemToCart,
  clearCart as clearCartRequest,
  getCart,
  removeCartItem as removeCartItemRequest,
  updateCartItem as updateCartItemRequest,
} from "../api/cart";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

const emptyCart = {
  id: null,
  items: [],
  itemCount: 0,
  subtotalInPence: 0,
};

export function CartProvider({ children }) {
  const { isAuthenticated, initialising: authInitialising } =
    useAuth();

  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(emptyCart);
      return emptyCart;
    }

    setLoading(true);

    try {
      const data = await getCart();
      setCart(data.cart);
      return data.cart;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authInitialising) {
      return;
    }

    if (isAuthenticated) {
      refreshCart().catch(() => {
        setCart(emptyCart);
      });
    } else {
      setCart(emptyCart);
    }
  }, [
    authInitialising,
    isAuthenticated,
    refreshCart,
  ]);

  async function addItem(productId, quantity = 1) {
    const data = await addItemToCart(productId, quantity);
    setCart(data.cart);
    return data;
  }

  async function updateItem(productId, quantity) {
    const data = await updateCartItemRequest(
      productId,
      quantity,
    );

    setCart(data.cart);
    return data;
  }

  async function removeItem(productId) {
    const data = await removeCartItemRequest(productId);
    setCart(data.cart);
    return data;
  }

  async function clear() {
    const data = await clearCartRequest();
    setCart(data.cart);
    return data;
  }

  const value = useMemo(
    () => ({
      cart,
      loading,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart: clear,
    }),
    [cart, loading, refreshCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return context;
}