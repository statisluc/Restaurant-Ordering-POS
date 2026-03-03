import { useEffect, useState } from "react";
import QRCode from "qrcode";

//connects back to the same origin that served the page (connects back to port 3000 automatically)
import socket from "../socket";

function isOlderThan1Hour(order) {
  const created = new Date(order.created_at);
  return Date.now() - created.getTime() > 60 * 60 * 1000;
}

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    //load pre-existing orders upon page load
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.filter((o) => !isOlderThan1Hour(o))))
      .catch(console.error);
    (async () => {
      try {
        const res = await fetch("/api/info");
        const data = await res.json();
        setBaseUrl(data.baseUrl);

        const qr = await QRCode.toDataURL(data.baseUrl, {
          margin: 1,
          scale: 8,
        });
        setQrDataUrl(qr);
      } catch (e) {
        console.error(e);
      }
    })();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("order:new", (fullOrder) => {
      if (isOlderThan1Hour(fullOrder)) return; //prevents old orders from showing up for 30secs when socket reconnects
      //   setOrders((prev) =>
      //     prev.map((o) => (o.id === fullOrder.id ? fullOrder : o)),
      //   );
      setOrders((prev) => [fullOrder, ...prev]);
    });

    socket.on("order:update", (fullOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === fullOrder.id ? fullOrder : o)),
      );
    });

    const t = setInterval(() => {
      setOrders((prev) => prev.filter((o) => !isOlderThan1Hour(o)));
    }, 30_000);

    return () => {
      clearInterval(t);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("order:new");
      socket.off("order:update");
    };
  }, []);

  //   useEffect(() => {
  //     //initial load which shows existing orders if any exist (from restaurant.db)
  //     fetch(`${SERVER_URL}/api/orders`) //orders
  //       .then((r) => r.json())
  //       .then(setOrders)
  //       .catch(console.error); //"here is what messed up"

  //     //establishes live socket connection
  //     const socket = io(SERVER_URL);

  //     socket.on("connect", () => setConnected(true));
  //     socket.on("disconnect", () => setConnected(false));

  //     // prioritizes new orders - places new orders to the top
  //     socket.on("order:new", (fullOrder) => {
  //       setOrders((prev) => [fullOrder, ...prev]);
  //     });

  //     // updates orders (new, in process, delivered, completed)
  //     socket.on("order:update", (fullOrder) => {
  //       setOrders((prev) =>
  //         prev.map((o) => (o.id === fullOrder.id ? fullOrder : o)),
  //       );
  //     });

  //     //cleanup , turns off connection when leaving page so we dont leave it open/exposed
  //     return () => {
  //       socket.off("order:new");
  //       socket.off("order:updated");
  //       socket.disconnect();
  //     };
  //   }, []);

  async function setStatus(id, status) {
    const res = await fetch(`/api/orders/${id}`, {
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
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui",
        // display: "grid",
        // justifyContent: "center",
      }}
    >
      <h1>Kitchen Dashboard</h1>
      <div style={{ opacity: 0.8 }}>
        Socket: {connected ? "Connected" : "Disconnected"}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>Customer QR</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>{baseUrl}</div>
        </div>

        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Customer QR Code"
            style={{
              width: 180,
              height: 180,
              borderRadius: 12,
              border: "1px solid #ddd",
            }}
          />
        ) : (
          <div
            style={{
              width: 180,
              height: 180,
              display: "grid",
              placeItems: "center",
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          >
            Loading QR Code
          </div>
        )}
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
                  ? `|| Table: ${o.table_number}`
                  : "No Table Number"}
              </div>

              <div style={{ marginTop: 10 }}>
                {o.items?.map((it) => (
                  <div key={it.id}>
                    {it.quantity}x {it.item_name}
                  </div>
                ))}
                {o.notes ? (
                  <div style={{ marginTop: 8, opacity: 0.85 }}>
                    <strong>Notes:</strong> {o.notes}
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={() => setStatus(o.id, "IN_PROGRESS")}>
                  START
                </button>
                <button onClick={() => setStatus(o.id, "READY")}>READY</button>
                <button onClick={() => setStatus(o.id, "COMPLETED")}>
                  DONE
                </button>
                <button onClick={() => setStatus(o.id, "CANCELLED")}>
                  CANCEL
                </button>
              </div>
            </div>
          ),
        )
      )}
    </div>
  );
}
