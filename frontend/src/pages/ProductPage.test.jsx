import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

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

import {
  getProductBySlug,
} from "../api/products";

import ProductPage from "./ProductPage";

vi.mock("../api/products", () => ({
  getProductBySlug: vi.fn(),
}));

vi.mock(
  "../components/products/AddToCartButton",
  () => ({
    default: () => (
      <button type="button">
        Mock add to cart
      </button>
    ),
  }),
);

vi.mock(
  "../components/products/WishlistButton",
  () => ({
    default: () => (
      <button type="button">
        Mock wishlist
      </button>
    ),
  }),
);

const product = {
  _id: "product-1",
  title: "Test Console",
  slug: "test-console",
  description:
    "A console used during frontend tests.",
  category: {
    name: "Gaming",
    slug: "gaming",
  },
  images: [
    "/images/console-front.jpg",
    "/images/console-side.jpg",
  ],
  priceInPence: 44999,
  stock: 7,
  isFeatured: true,
};

function renderProductPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/products/test-console",
      ]}
    >
      <Routes>
        <Route
          path="/products/:slug"
          element={<ProductPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProductPage", () => {
  it("loads a product and switches gallery images", async () => {
    getProductBySlug.mockResolvedValue({
      data: product,
    });

    renderProductPage();

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent("Loading product");

    expect(
      await screen.findByRole("heading", {
        name: "Test Console",
      }),
    ).toBeInTheDocument();

    const mainImage = screen.getByRole("img", {
      name: "Test Console",
    });

    expect(mainImage).toHaveAttribute(
      "src",
      "/images/console-front.jpg",
    );

    const secondImageButton =
      screen.getByRole("button", {
        name: "View image 2 of Test Console",
      });

    fireEvent.click(secondImageButton);

    expect(mainImage).toHaveAttribute(
      "src",
      "/images/console-side.jpg",
    );

    expect(secondImageButton).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(getProductBySlug).toHaveBeenCalledWith(
      "test-console",
      expect.any(AbortSignal),
    );
  });

  it("shows an API error without crashing", async () => {
    getProductBySlug.mockRejectedValue(
      new Error("Product not found"),
    );

    renderProductPage();

    expect(
      await screen.findByRole("heading", {
        name: "Product unavailable",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Product not found");

    await waitFor(() => {
      expect(
        screen.queryByRole("status"),
      ).not.toBeInTheDocument();
    });
  });

  it("separates structured features and specifications from the description", async () => {
    getProductBySlug.mockResolvedValue({
      data: {
        ...product,
        description: "A fast console for everyday play.",
        features: ["Quick loading"],
        specifications: [{ label: "Storage", value: "1TB SSD" }],
      },
    });

    renderProductPage();

    expect(await screen.findByText("Quick loading")).toBeInTheDocument();
    expect(screen.getByText("A fast console for everyday play.")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("1TB SSD")).toBeInTheDocument();
  });
});
