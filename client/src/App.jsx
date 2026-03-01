import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then(setMenu)
      .catch((e) => {
        console.error(e);
        setStatusMsg("Failed to load menu. Check if server is runnning");
      });
  }, []);

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((x) => x.menu_item_id === item.id);
      if (existing) {
        return prev.map((x) =>
          x.menu_item_id === item.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          item_name: item.name,
          unit_price_cents: item.price_cents,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(menu_item_id) {
    setCart((prev) => prev.filter((x) => x.menu_item_id !== menu_item_id));
  }

  const totalCents = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.unit_price_cents * it.quantity, 0);
  }, [cart]);

  async function submitOrder() {
    setStatusMsg("");

    if (cart.length === 0) {
      setStatusMsg("Cart is empty");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          customer_name: customerName || null,
          table_number: tableNumber || null,
          notes: notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMsg(data?.error || "Order Failed");
        return;
      }

      setCart([]);
      setCustomerName("");
      setTableNumber("");
      setNotes("");
      setStatusMsg(`Order Placed! Order #${data.id}`);
    } catch (e) {
      console.error(e);
      setStatusMsg("Order failed. Check if server is running");
    }
  }

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h1>Customer Ordering</h1>
        <a href="/kitchen">Kitchen Dashboard</a>
      </header>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {/* menu */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <h2>Menu</h2>
          {menu.length === 0 ? (
            <p style={{ opacity: 0.7 }}>NO MENU ITEMS</p>
          ) : (
            menu.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{it.name}</div>
                  <div style={{ opacity: 0.7 }}>
                    ${(it.price_cents / 100).toFixed(2)}
                  </div>
                </div>
                <button onClick={() => addToCart(it)}>Add</button>
              </div>
            ))
          )}
        </div>

        {/* cart  */}

        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
        >
          <h2>Cart</h2>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              placeholder="Table number (optional)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            {cart.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Cart Is Empty. Add Items!</p>
            ) : (
              cart.map((it) => (
                <div
                  key={it.menu_item_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <div>
                    {it.quantity}x {it.item_name}
                  </div>
                  <button onClick={() => removeFromCart(it.menu_item_id)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 12, fontWeight: 700 }}>
            Total: ${(totalCents / 100).toFixed(2)}
          </div>

          <button
            style={{ marginTop: 12, width: "100%" }}
            onClick={submitOrder}
          >
            Place Order
          </button>
          {statusMsg && <p style={{ marginTop: 10 }}>{statusMsg}</p>}
        </div>
      </div>
    </div>
  );
}
