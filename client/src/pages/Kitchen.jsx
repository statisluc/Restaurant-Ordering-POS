import { useEffect, useState } from "react";
import { io } from "socket.io-client";

//port in LAN where chromebook server runs
const SERVER_URL = "http://localhost:3000";

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    //initial load which shows existing orders if any exist (from restaurant.db)
    fetch(`${SERVER_URL}/api/orders`) //orders
      .then((r) => r.json())
      .then(setOrders)
      .catch(console.error); //"here is what messed up"

    //establishes live socket connection
    const socket = io(SERVER_URL);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // prioritizes new orders - places new orders to the top
    socket.on("order:new", (fullOrder) => {
      setOrders((prev) => [fullOrder, ...prev]);
    });

    // updates orders (new, in process, delivered, completed)
    socket.on("order:update", (fullOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === fullOrder.id ? fullOrder : o)),
      );
    });

    //cleanup , turns off connection when leaving page so we dont leave it open/exposed
    return () => {
      socket.off("order:new");
      socket.off("order:updated");
      socket.disconnect();
    };
  }, []);

  async function setStatus(id, status) {
    const res = await fetch(`${SERVER_URL}/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed To Update Order");
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>Kitchen Dashboard</h1>
      <div style={{ opacity: 0.8 }}>
        Socket: {connected ? "Connected" : "Disconnected"}
      </div>

      {orders.length === 0 ? (
        <p>NO ORDERS</p> //if there are no orders, display this
      ) : (
        orders.map(
          (
            o, //for each order... have this style
          ) => (
            <div
              key={o.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Order #{o.id}</strong>
                <span>Status: {o.status}</span>
              </div>

              <div style={{ marginTop: 8, opacity: 0.8 }}>
                {o.customer_name
                  ? `Name: ${o.customer_name}`
                  : "No customer name"}{" "}
                {o.table_number
                  ? `Table: ${o.table_number}`
                  : "No Table Number"}
              </div>

              <div style={{ marginTop: 10 }}>
                {o.items?.map((it) => (
                  <div key={it.id}>
                    {it.quantity}x {it.item_name}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={() => setStatus(o.id, "IN_PROGRESS")}>
                  START
                </button>
                <button onClick={() => setStatus(o.id, "READY")}>READY</button>
                <button onClick={() => setStatus(o.id, "DONE")}>DONE</button>
              </div>
            </div>
          ),
        )
      )}
    </div>
  );
}
