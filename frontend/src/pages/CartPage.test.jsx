import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAccount } from "../api/account";
import { createCheckoutSession } from "../api/checkout";
import CartPage from "./CartPage";

const mocks = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/account", () => ({ getAccount: vi.fn() }));
vi.mock("../api/checkout", () => ({ createCheckoutSession: vi.fn() }));
vi.mock("../context/ToastContext", () => ({ useToast: () => mocks.toast }));
vi.mock("../context/CartContext", () => ({
  useCart: () => ({
    cart: {
      items: [{ productId: "product-1", slug: "test", title: "Test product", image: "/test.jpg", priceInPence: 2000, quantity: 1, lineTotalInPence: 2000, stock: 3 }],
      itemCount: 1,
      subtotalInPence: 2000,
    },
    loading: false,
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

function renderCart() {
  return render(<MemoryRouter><CartPage /></MemoryRouter>);
}

beforeEach(() => vi.clearAllMocks());

describe("Cart checkout address", () => {
  it("blocks checkout when there are no saved addresses", async () => {
    getAccount.mockResolvedValue({ user: { addresses: [] } });
    renderCart();

    expect(await screen.findByText("Add a delivery address to continue to payment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proceed to checkout" })).toBeDisabled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("sends the selected saved address to checkout", async () => {
    getAccount.mockResolvedValue({ user: { addresses: [
      { id: "home", label: "Home", recipientName: "Test User", line1: "1 Test Road", city: "London", postcode: "SW1A 1AA", isDefault: true },
      { id: "office", label: "Office", recipientName: "Test User", line1: "2 Test Road", city: "London", postcode: "SW1A 1AB", isDefault: false },
    ] } });
    createCheckoutSession.mockRejectedValue(new Error("Test checkout stopped"));

    renderCart();
    const office = await screen.findByRole("radio", { name: /Office/ });
    fireEvent.click(office);
    fireEvent.click(screen.getByRole("button", { name: "Proceed to checkout" }));

    await waitFor(() => {
      expect(createCheckoutSession).toHaveBeenCalledWith("office");
    });
  });
});
