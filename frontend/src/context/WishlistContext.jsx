import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from "../api/wishlist";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

const emptyWishlist = {
  items: [],
  itemCount: 0,
};

export function WishlistProvider({
  children,
}) {
  const {
    isAuthenticated,
    initialising: authInitialising,
  } = useAuth();

  const [wishlist, setWishlist] =
    useState(emptyWishlist);

  const [loading, setLoading] =
    useState(false);

  const refreshWishlist =
    useCallback(async () => {
      if (!isAuthenticated) {
        setWishlist(emptyWishlist);
        return emptyWishlist;
      }

      setLoading(true);

      try {
        const data = await getWishlist();
        setWishlist(data.wishlist);

        return data.wishlist;
      } finally {
        setLoading(false);
      }
    }, [isAuthenticated]);

  useEffect(() => {
    if (authInitialising) {
      return;
    }

    if (isAuthenticated) {
      refreshWishlist().catch(() => {
        setWishlist(emptyWishlist);
      });
    } else {
      setWishlist(emptyWishlist);
    }
  }, [
    authInitialising,
    isAuthenticated,
    refreshWishlist,
  ]);

  const addItem = useCallback(
    async (productId) => {
      const data =
        await addWishlistItem(productId);

      setWishlist(data.wishlist);

      return data;
    },
    [],
  );

  const removeItem = useCallback(
    async (productId) => {
      const data =
        await removeWishlistItem(productId);

      setWishlist(data.wishlist);

      return data;
    },
    [],
  );

  const contains = useCallback(
    (productId) =>
      wishlist.items.some(
        (item) =>
          item.productId === String(productId),
      ),
    [wishlist.items],
  );

  const value = useMemo(
    () => ({
      wishlist,
      loading,
      refreshWishlist,
      addItem,
      removeItem,
      contains,
    }),
    [
      wishlist,
      loading,
      refreshWishlist,
      addItem,
      removeItem,
      contains,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(
    WishlistContext,
  );

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider",
    );
  }

  return context;
}