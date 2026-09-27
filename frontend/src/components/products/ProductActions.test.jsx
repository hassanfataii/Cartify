import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

const mocks = vi.hoisted(() => ({
  auth: {
    isAuthenticated: false,
  },

  addItem: vi.fn(),
  addWishlistItem: vi.fn(),
  removeWishlistItem: vi.fn(),
  contains: vi.fn(),

  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock(
  "../../context/AuthContext",
  () => ({
    useAuth: () => mocks.auth,
  }),
);

vi.mock(
  "../../context/CartContext",
  () => ({
    useCart: () => ({
      addItem: mocks.addItem,
    }),
  }),
);

vi.mock(
  "../../context/WishlistContext",
  () => ({
    useWishlist: () => ({
      addItem: mocks.addWishlistItem,
      removeItem: mocks.removeWishlistItem,
      contains: mocks.contains,
    }),
  }),
);

vi.mock(
  "../../context/ToastContext",
  () => ({
    useToast: () => mocks.toast,
  }),
);

function renderWithRoutes(component) {
  return render(
    <MemoryRouter
      initialEntries={[
        "/products/test-product",
      ]}
    >
      <Routes>
        <Route
          path="/products/:slug"
          element={component}
        />

        <Route
          path="/login"
          element={<p>Login page</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.auth.isAuthenticated = false;
  mocks.contains.mockReturnValue(false);

  vi.clearAllMocks();
});

describe("product actions", () => {
  it("sends signed-out shoppers to login when adding to cart", async () => {
    const user = userEvent.setup();

    renderWithRoutes(
      <AddToCartButton
        productId="product-1"
        stock={4}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add to cart",
      }),
    );

    expect(
      screen.getByText("Login page"),
    ).toBeInTheDocument();

    expect(
      mocks.toast.info,
    ).toHaveBeenCalledWith(
      "Log in to add products to your cart",
    );

    expect(
      mocks.addItem,
    ).not.toHaveBeenCalled();
  });

  it("adds a product to an authenticated cart", async () => {
    mocks.auth.isAuthenticated = true;

    mocks.addItem.mockResolvedValue({
      message: "Product added to your cart",
    });

    const user = userEvent.setup();

    renderWithRoutes(
      <AddToCartButton
        productId="product-1"
        stock={4}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add to cart",
      }),
    );

    await waitFor(() => {
      expect(
        mocks.addItem,
      ).toHaveBeenCalledWith(
        "product-1",
        1,
      );
    });

    expect(
      mocks.toast.success,
    ).toHaveBeenCalledWith(
      "Product added to your cart",
    );
  });

  it("adds a product to an authenticated wishlist", async () => {
    mocks.auth.isAuthenticated = true;

    mocks.addWishlistItem.mockResolvedValue({
      message: "Product added to your wishlist",
    });

    const user = userEvent.setup();

    renderWithRoutes(
      <WishlistButton productId="product-1" />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add to wishlist",
      }),
    );

    await waitFor(() => {
      expect(
        mocks.addWishlistItem,
      ).toHaveBeenCalledWith("product-1");
    });

    expect(
      mocks.toast.success,
    ).toHaveBeenCalledWith(
      "Product added to your wishlist",
    );
  });
});