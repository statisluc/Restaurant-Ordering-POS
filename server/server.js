require("dotenv").config(); //loads .env into process.env

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");
const os = require("os");
const fs = require("fs");
const path = require("path");

const lanOnly = require("./middleware/lanOnly");

//Routers endpoints
const createMenuRouter = require("./routes/menu");
const createOrdersRouter = require("./routes/orders");
const createAdminRouter = require("./routes/admin");

const app = express();

//middleware to parse JSON request body
app.use(express.json());

//middleware to allow frontend to contact backend
app.use(cors());

//creates real HTTP server so socket.io can attach to it
const server = http.createServer(app);

//socket.io server (for that realtime fun stuff)
const io = new Server(server, { cors: { origin: "*" } });

//sqlite setup
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });

const DB_PATH = path.join(__dirname, "data", "restaurant.db");
const SCHEMA_PATH = path.join(__dirname, "db", "schema.sql");

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

//finds LAN IP for QR code

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
const HOST = "0.0.0.0";
const LAN_IP = getLanIp();

//lan only restrictions
app.use(lanOnly);

//health and info routes
app.get("/", (req, res) => res.send("LAN Ordering Server is running"));
app.get("health", (req, res) => res.json({ ok: true }));

//routers get mounted under /api
app.use("/api", createMenuRouter(db));
app.use("/api", createOrdersRouter(db, io));
app.use("/api", createAdminRouter(db));

//logs Socket for debugging
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

//prints QR to terminal
(async () => {
  const baseUrl = `http://${LAN_IP}:${PORT}`;
  const qr = await QRCode.toString(baseUrl, { type: "terminal", small: true });
  console.log("\nCustomer URL:", baseUrl);
  console.log("Kitchen URL:", baseUrl + "/kitchen");
  console.log(qr);
})();

//start
server.listen(PORT, HOST, () => {
  console.log(`Server is Listening on ${HOST}:${PORT}`);
});
