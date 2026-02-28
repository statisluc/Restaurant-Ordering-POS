const express = require("express");

const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");
const os = require("os");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- SQLite ---
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });

const DB_PATH = path.join(__dirname, "data", "restaurant.db");
const SCHEMA_PATH = path.join(__dirname, "db", "schema.sql");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

// const db = new Database(path.join(__dirname, "data", "restaurant.db"));
// db.exec(`
//   CREATE TABLE IF NOT EXISTS orders (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     createdAt TEXT NOT NULL,
//     status TEXT NOT NULL,
//     items TEXT NOT NULL,
//     total INTEGER NOT NULL
//   );
// `);

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // IMPORTANT: listen on all interfaces
const LAN_IP = getLanIp();

// --- LAN-only restriction (simple + effective) ---
function isPrivateIp(ip) {
  // handles "::ffff:192.168.1.10" too
  const clean = ip.replace("::ffff:", "");
  return (
    clean.startsWith("10.") ||
    clean.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean) ||
    clean === "127.0.0.1"
  );
}

app.use((req, res, next) => {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "";
  if (!isPrivateIp(ip)) return res.status(403).send("LAN only");
  next();
});

// --- Routes ---
app.get("/", (req, res) => res.send("LAN Ordering Server is running"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/api/menu", (req, res) => {
  const items = db.prepare("SELECT * FROM menu_items").all();
  res.json(items);
});

app.post("/api/orders", (req, res) => {
  const {
    items,
    customer_name = null,
    table_number = null,
    notes = null,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }

  const createOrder = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (customer_name, table_number, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, 'NEW', datetime('now'), datetime('now'))`,
      )
      .run(customer_name, table_number, notes);

    const orderId = info.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price_cents, quantity)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (const it of items) {
      if (
        !it.item_name ||
        !Number.isInteger(it.unit_price_cents) ||
        !Number.isInteger(it.quantity)
      ) {
        throw new Error(
          "Each item needs item_name (string), unit_price_cents (int), quantity (int)",
        );
      }

      insertItem.run(
        orderId,
        it.menu_item_id ?? null,
        it.item_name,
        it.unit_price_cents,
        it.quantity,
      );
    }

    return orderId;
  });

  let orderId;
  try {
    orderId = createOrder();
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  const orderItems = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(orderId);

  const fullOrder = { ...order, items: orderItems };
  io.emit("order:new", fullOrder);
  res.json(fullOrder);
});

app.get("/api/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  const itemsStmt = db.prepare("SELECT * FROM order_items WHERE order_id = ?");

  res.json(orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) })));
});

app.patch("/api/orders/:id", (req, res) => {
  const { status } = req.body;
  db.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(status, req.params.id);
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(req.params.id);
  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(req.params.id);

  const fullOrder = { ...order, items };
  io.emit("order:update", fullOrder);
  res.json(fullOrder);
});

// io.on("connection", () => {});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Socket disonnected:", socket.id));
});

// --- Print QR to terminal for customer URL ---
(async () => {
  const baseUrl = `http://${LAN_IP}:${PORT}`;
  const qr = await QRCode.toString(baseUrl, { type: "terminal", small: true });
  console.log("\nCustomer URL:", baseUrl);
  console.log("Kitchen URL:", baseUrl + "/kitchen");
  console.log(qr);
})();

server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});
