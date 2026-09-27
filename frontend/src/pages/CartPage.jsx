import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getAccount } from "../api/account";
import { createCheckoutSession } from "../api/checkout";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/formatCurrency";


export default function CartPage() {
  const {
    cart,
    loading,
    updateItem,
    removeItem,
    clearCart,
  } = useCart();

  const toast = useToast();

  const [busyProductId, setBusyProductId] =
    useState(null);
  const [clearing, setClearing] = useState(false);
  const [checkingOut, setCheckingOut] =
    useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressError, setAddressError] = useState("");
  const [addressReload, setAddressReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAddresses() {
      setAddressesLoading(true);
      setAddressError("");

      try {
        const response = await getAccount();
        if (!active) return;

        const savedAddresses = response.user?.addresses ?? [];
        setAddresses(savedAddresses);
        setSelectedAddressId((current) =>
          savedAddresses.some((address) => address.id === current)
            ? current
            : (savedAddresses.find((address) => address.isDefault)?.id ??
                savedAddresses[0]?.id ?? ""),
        );
      } catch (error) {
        if (active) {
          setAddresses([]);
          setSelectedAddressId("");
          setAddressError(error.message || "Unable to load your addresses");
        }
      } finally {
        if (active) setAddressesLoading(false);
      }
    }

    loadAddresses();
    return () => { active = false; };
  }, [addressReload]);

  async function changeQuantity(item, quantity) {
    if (quantity < 1 || quantity > item.stock) {
      return;
    }

    setBusyProductId(item.productId);

    try {
      await updateItem(item.productId, quantity);
    } catch (error) {
      toast.error(
        error.message || "Unable to update your cart",
      );
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleRemove(item) {
    setBusyProductId(item.productId);

    try {
      await removeItem(item.productId);

      toast.success(
        `${item.title} removed from your cart`,
      );
    } catch (error) {
      toast.error(
        error.message || "Unable to remove this item",
      );
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleClearCart() {
    const confirmed = window.confirm(
      "Remove every item from your cart?",
    );

    if (!confirmed) {
      return;
    }

    setClearing(true);

    try {
      await clearCart();
      toast.success("Your cart has been cleared");
    } catch (error) {
      toast.error(
        error.message || "Unable to clear your cart",
      );
    } finally {
      setClearing(false);
    }
  }

  async function handleCheckout() {
    if (!selectedAddressId) {
      toast.error("Select a saved delivery address before checkout");
      return;
    }

    setCheckingOut(true);

    try {
      const data = await createCheckoutSession(selectedAddressId);

      if (!data.checkoutUrl) {
        throw new Error(
          "Checkout URL was not returned",
        );
      }

      window.location.assign(data.checkoutUrl);
    } catch (error) {
      toast.error(
        error.message || "Unable to start checkout",
      );

      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="message-page">
        <p>Loading your cart...</p>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="message-page cart-empty">
        <p className="eyebrow">Your basket</p>
        <h1>Your cart is empty</h1>

        <p>
          Apparently the products haven’t seduced you yet.
        </p>

        <Link className="primary-button" to="/shop">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-heading">
        <div>
          <p className="eyebrow">Your basket</p>
          <h1>Shopping cart</h1>

          <p>
            {cart.itemCount}{" "}
            {cart.itemCount === 1 ? "item" : "items"}
          </p>
        </div>

        <button
          className="cart-clear-button"
          type="button"
          onClick={handleClearCart}
          disabled={clearing || checkingOut}
        >
          {clearing ? "Clearing..." : "Clear cart"}
        </button>
      </div>

      <div className="cart-layout">
        <section
          className="cart-items"
          aria-label="Cart products"
        >
          {cart.items.map((item) => {
            const busy =
              busyProductId === item.productId;

            return (
              <article
                className="cart-item"
                key={item.productId}
              >
                <Link
                  className="cart-item__image"
                  to={`/products/${item.slug}`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                  />
                </Link>

                <div className="cart-item__information">
                  <Link to={`/products/${item.slug}`}>
                    <h2>{item.title}</h2>
                  </Link>

                  <p>
                    {formatCurrency(item.priceInPence)} each
                  </p>

                  <p>
                    {item.stock} currently available
                  </p>

                  <button
                    className="cart-item__remove"
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={busy || checkingOut}
                  >
                    Remove
                  </button>
                </div>

                <div className="cart-item__quantity">
                  <span>Quantity</span>

                  <div>
                    <button
                      type="button"
                      aria-label={`Decrease ${item.title} quantity`}
                      onClick={() =>
                        changeQuantity(
                          item,
                          item.quantity - 1,
                        )
                      }
                      disabled={
                        busy ||
                        checkingOut ||
                        item.quantity <= 1
                      }
                    >
                      −
                    </button>

                    <strong>{item.quantity}</strong>

                    <button
                      type="button"
                      aria-label={`Increase ${item.title} quantity`}
                      onClick={() =>
                        changeQuantity(
                          item,
                          item.quantity + 1,
                        )
                      }
                      disabled={
                        busy ||
                        checkingOut ||
                        item.quantity >= item.stock
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <strong className="cart-item__total">
                  {formatCurrency(
                    item.lineTotalInPence,
                  )}
                </strong>
              </article>
            );
          })}
        </section>

        <aside className="cart-summary">
          <h2>Order summary</h2>

          <div>
            <span>Items</span>
            <span>{cart.itemCount}</span>
          </div>

          <div>
            <span>Delivery</span>
            <span>Calculated at checkout</span>
          </div>

          <div className="cart-summary__total">
            <strong>Subtotal</strong>

            <strong>
              {formatCurrency(cart.subtotalInPence)}
            </strong>
          </div>

          <section className="checkout-address" aria-labelledby="checkout-address-title">
            <div className="checkout-address__heading">
              <h3 id="checkout-address-title">Delivery address</h3>
              <Link to="/account#addresses">Manage addresses</Link>
            </div>

            {addressesLoading && <p role="status">Loading addresses…</p>}

            {!addressesLoading && addressError && (
              <div role="alert" className="checkout-address__notice">
                <p>{addressError}</p>
                <button type="button" onClick={() => setAddressReload((count) => count + 1)}>
                  Try again
                </button>
              </div>
            )}

            {!addressesLoading && !addressError && addresses.length === 0 && (
              <div className="checkout-address__notice">
                <p>Add a delivery address to continue to payment.</p>
                <Link to="/account#addresses">Add an address</Link>
              </div>
            )}

            {!addressesLoading && !addressError && addresses.length > 0 && (
              <div className="checkout-address__list" role="radiogroup" aria-label="Choose a delivery address">
                {addresses.map((address) => (
                  <label className="checkout-address__option" key={address.id}>
                    <input
                      type="radio"
                      name="deliveryAddress"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      disabled={checkingOut}
                    />
                    <span>
                      <strong>{address.label}{address.isDefault ? " · Default" : ""}</strong>
                      <span>{address.recipientName}</span>
                      <span>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</span>
                      <span>{address.city}, {address.postcode}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <button
            className="primary-button"
            type="button"
            onClick={handleCheckout}
            disabled={checkingOut || addressesLoading || !selectedAddressId || Boolean(addressError)}
          >
            {checkingOut
              ? "Opening checkout..."
              : "Proceed to checkout"}
          </button>

          <div className="checkout-test-note" role="note">
            <strong>Demo payment</strong>
            <p>
              For test-mode checkout, use 4242 4242 4242 4242 with any
              future expiry date and any three-digit CVC. 
            </p>
          </div>

          <Link to="/shop">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
}
