// src/pages/profilePage.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Toast({ toast, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`toast ${toast.type || "info"}`}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        padding: "10px 14px",
        borderRadius: 8,
        background: toast.type === "error" ? "#fee2e2" : "#ecfdf5",
        color: toast.type === "error" ? "#991b1b" : "#065f46",
        boxShadow: "0 4px 14px rgba(0,0,0,.12)",
        zIndex: 9999,
      }}
    >
      {toast.message}
    </div>
  );
}

export default function ProfilePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { hash } = useLocation();

  const allowedTabs = React.useMemo(() => new Set(["account", "addresses", "orders", "password"]), []);
  const initialTab = React.useMemo(() => {
    const h = hash ? hash.replace("#", "") : "account";
    return allowedTabs.has(h) ? h : "account";
  }, [hash, allowedTabs]);

  const [active, setActive] = React.useState(initialTab);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [account, setAccount] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [initialAccount, setInitialAccount] = React.useState(null);

  const [addresses, setAddresses] = React.useState([]);
  const [addressForm, setAddressForm] = React.useState({
    _id: null,
    label: "",
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "",
  });

  const [pwForm, setPwForm] = React.useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [pwMessage, setPwMessage] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  React.useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    setActive(initialTab);
  }, [user, initialTab, navigate]);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const meRes = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const a = {
            firstName: me.firstName || "",
            lastName: me.lastName || "",
            email: me.email || "",
            phone: me.phone || "",
          };
          setAccount(a);
          setInitialAccount(a);
          if (Array.isArray(me.addresses)) setAddresses(me.addresses);
        }
        if (!Array.isArray(addresses) || addresses.length === 0) {
          const addrRes = await fetch(`${API}/api/users/addresses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (addrRes.ok) setAddresses(await addrRes.json());
        }
      } catch {
        setErr("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, token]); 

  const navTo = (tab) => (e) => {
    e.preventDefault();
    const target = allowedTabs.has(tab) ? tab : "account";
    setActive(target);
    const el = document.getElementById(target);
    if (el) el.focus();
  };

  const onAccountChange = (e) => {
    const { name, value } = e.target;
    setAccount((s) => ({ ...s, [name]: value }));
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      setErr("");
      const payload = {};
      if (account.firstName !== initialAccount?.firstName) payload.firstName = account.firstName;
      if (account.lastName !== initialAccount?.lastName) payload.lastName = account.lastName;
      if (account.phone !== initialAccount?.phone) payload.phone = account.phone;
      if (account.email && account.email !== initialAccount?.email) payload.email = account.email.trim().toLowerCase();

      const res = await fetch(`${API}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save account");
      }
      const updated = await res.json();
      const merged = {
        ...account,
        ...(updated || {}),
      };
      const a = {
        firstName: merged.firstName ?? "",
        lastName: merged.lastName ?? "",
        email: merged.email ?? "",
        phone: merged.phone ?? "",
      };
      setAccount(a);
      setInitialAccount(a);
      showToast("Account updated");
    } catch (e1) {
      setErr(e1.message || "Failed to save account");
      showToast(e1.message || "Failed to save account", "error");
    } finally {
      setBusy(false);
    }
  };

  const onAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressForm((s) => ({ ...s, [name]: value }));
  };

  const editAddress = (addr) => {
    setAddressForm({
      _id: addr._id || null,
      label: addr.label || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      postcode: addr.postcode || "",
      country: addr.country || "",
    });
    setActive("addresses");
  };

  const clearAddressForm = () =>
    setAddressForm({ _id: null, label: "", line1: "", line2: "", city: "", postcode: "", country: "" });

  const saveAddress = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      setErr("");
      const isEdit = Boolean(addressForm._id);
      const url = isEdit
        ? `${API}/api/users/addresses/${addressForm._id}`
        : `${API}/api/users/addresses`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressForm),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save address");
      }
      const list = await fetch(`${API}/api/users/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (list.ok) setAddresses(await list.json());
      clearAddressForm();
      showToast(isEdit ? "Address updated" : "Address added");
    } catch (e1) {
      setErr(e1.message || "Failed to save address");
      showToast(e1.message || "Failed to save address", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    if (busy) return;
    setBusy(true);
    try {
      setErr("");
      const res = await fetch(`${API}/api/users/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to delete address");
      }
      setAddresses((s) => s.filter((a) => String(a._id) !== String(id)));
      if (String(addressForm._id) === String(id)) clearAddressForm();
      showToast("Address deleted");
    } catch (e) {
      setErr(e.message || "Failed to delete address");
      showToast(e.message || "Failed to delete address", "error");
    } finally {
      setBusy(false);
    }
  };

  const onPwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((s) => ({ ...s, [name]: value }));
    if (name === "new") {
      const strong =
        value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
      setPwMessage(strong ? "Strong password" : "Use 8+ chars with a mix of upper/lowercase and numbers");
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (pwForm.new !== pwForm.confirm) {
      setErr("New password and confirmation do not match");
      showToast("New password and confirmation do not match", "error");
      return;
    }
    setBusy(true);
    try {
      setErr("");
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current: pwForm.current, password: pwForm.new }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update password");
      }
      setPwForm({ current: "", new: "", confirm: "" });
      setPwMessage("");
      showToast("Password updated");
    } catch (e1) {
      setErr(e1.message || "Failed to update password");
      showToast(e1.message || "Failed to update password", "error");
    } finally {
      setBusy(false);
    }
  };

  const tabLinkCls = (tab) => `profile-link-tab${active === tab ? " active" : ""}`;

  const phonePlaceholder = "Phone (optional)";

  return (
    <main className="profile-page container mt-8 mb-8">
      <div className="profile-layout">
        <aside className="profile-nav" aria-label="Profile navigation">
          <a href="#account" className={tabLinkCls("account")} onClick={navTo("account")}><i className="fa-solid fa-user"></i> Account</a>
          <a href="#addresses" className={tabLinkCls("addresses")} onClick={navTo("addresses")}><i className="fa-solid fa-location-dot"></i> Addresses</a>
          <a href="#orders" className={tabLinkCls("orders")} onClick={navTo("orders")}><i className="fa-solid fa-receipt"></i> Orders</a>
          <a href="#password" className={tabLinkCls("password")} onClick={navTo("password")}><i className="fa-solid fa-key"></i> Change Password</a>
          <Link to="/wishlist" className="profile-link"><i className="fa-regular fa-heart"></i> Wishlist</Link>
        </aside>

        <section className="profile-content">
          {loading && <p>Loading…</p>}
          {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

          <section id="account" className="profile-card anchor-section" tabIndex={-1} style={{ display: active === "account" ? "block" : "none" }}>
            <h2>Account Info</h2>
            <form id="formAccount" className="form-grid" onSubmit={saveAccount}>
              <label><span>First Name</span><input type="text" name="firstName" value={account.firstName} onChange={onAccountChange} placeholder="John" required /></label>
              <label><span>Last Name</span><input type="text" name="lastName" value={account.lastName} onChange={onAccountChange} placeholder="Doe" required /></label>
              <label className="full"><span>Email</span><input type="email" name="email" value={account.email} onChange={onAccountChange} placeholder="john@example.com" required /></label>
              <label className="full"><span>Phone</span><input type="tel" name="phone" value={account.phone} onChange={onAccountChange} placeholder={phonePlaceholder} /></label>
              <div className="actions">
                <button type="submit" className="btn" disabled={busy}>
                  <i className="fa-solid fa-floppy-disk"></i> Save
                </button>
              </div>
            </form>
          </section>

          <section id="addresses" className="profile-card anchor-section" tabIndex={-1} style={{ display: active === "addresses" ? "block" : "none" }}>
            <h2>Address Book</h2>
            <div className="address-list" id="addressList">
              {!addresses.length ? <p>No saved addresses.</p> :
                addresses.map((a) => (
                  <div key={String(a._id)} className="address-card">
                    <div className="addr-lines">
                      {a.label ? <div><strong>{a.label}</strong></div> : null}
                      <div>{a.line1}</div>
                      {a.line2 ? <div>{a.line2}</div> : null}
                      <div>{a.city} {a.postcode}</div>
                      <div>{a.country}</div>
                    </div>
                    <div className="addr-actions">
                      <button className="btn" onClick={() => editAddress(a)} disabled={busy}>Edit</button>
                      <button className="btn" onClick={() => deleteAddress(a._id)} disabled={busy}>Delete</button>
                    </div>
                  </div>
                ))
              }
            </div>

            <h3 className="mt-4">Add / Edit Address</h3>
            <form id="formAddress" className="form-grid" onSubmit={saveAddress}>
              <label className="full"><span>Label</span><input type="text" name="label" value={addressForm.label} onChange={onAddressChange} placeholder="Home / Work / Other" /></label>
              <label className="full"><span>Address Line 1</span><input type="text" name="line1" value={addressForm.line1} onChange={onAddressChange} placeholder="Flat 1, 221B Baker Street" required /></label>
              <label className="full"><span>Address Line 2</span><input type="text" name="line2" value={addressForm.line2} onChange={onAddressChange} placeholder="" /></label>
              <label><span>City</span><input type="text" name="city" value={addressForm.city} onChange={onAddressChange} placeholder="London" required /></label>
              <label><span>Postcode</span><input type="text" name="postcode" value={addressForm.postcode} onChange={onAddressChange} placeholder="SW1A 1AA" required /></label>
              <label className="full"><span>Country</span><input type="text" name="country" value={addressForm.country} onChange={onAddressChange} placeholder="United Kingdom" required /></label>
              <div className="actions">
                <button type="submit" className="btn" disabled={busy}>
                  <i className="fa-solid fa-plus"></i> {addressForm._id ? "Update Address" : "Save Address"}
                </button>
                {addressForm._id && (
                  <button type="button" className="btn" onClick={clearAddressForm} disabled={busy} style={{ marginLeft: 8 }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section id="orders" className="profile-card anchor-section" tabIndex={-1} style={{ display: active === "orders" ? "block" : "none" }}>
            <h2>Your Orders</h2>
            <p>View and track your past orders.</p>
            <Link className="btn" to="/orders"><i className="fa-solid fa-box-open"></i> View all orders</Link>
          </section>

          <section id="password" className="profile-card anchor-section" tabIndex={-1} style={{ display: active === "password" ? "block" : "none" }}>
            <h2>Change Password</h2>
            <form id="formPassword" className="form-grid" onSubmit={updatePassword}>
              <label className="full"><span>Current Password</span><input type="password" name="current" value={pwForm.current} onChange={onPwChange} required /></label>
              <label className="full">
                <span>New Password</span>
                <input type="password" name="new" value={pwForm.new} onChange={onPwChange} id="pwNew" required />
              </label>
              <label className="full">
                <span>Confirm New Password</span>
                <input type="password" name="confirm" value={pwForm.confirm} onChange={onPwChange} id="pwConfirm" required />
              </label>
              <div className="actions">
                <button type="submit" className="btn" disabled={busy}>
                  <i className="fa-solid fa-key"></i> Update Password
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
