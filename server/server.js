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

function isRFC1918(ip) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

// 100.64.0.0/10 (CGNAT / often seen in ChromeOS VM networking)
function isCGNAT(ip) {
  return /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip);
}

function getLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  // Prefer real LAN IPs first (192.168 / 10 / 172.16-31)
  const rfc1918 = candidates.find(isRFC1918);
  if (rfc1918) return rfc1918;

  // Otherwise, avoid CGNAT like 100.115.* if possible
  const nonCgnat = candidates.find((ip) => !isCGNAT(ip));
  if (nonCgnat) return nonCgnat;

  // Fallback
  return candidates[0] || "127.0.0.1";
}

// function getLanIp() {
//   const nets = os.networkInterfaces();
//   for (const name of Object.keys(nets)) {
//     for (const net of nets[name]) {
//       if (net.family === "IPv4" && !net.internal) return net.address;
//     }
//   }
//   return "127.0.0.1";
// }

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const LAN_HOST = process.env.LAN_HOST || getLanIp();

//lan only restrictions
app.use(lanOnly);

//health and info routes
// app.get("/", (req, res) => res.send("LAN Ordering Server is running"));
app.get("/health", (req, res) => res.json({ ok: true }));

//routers get mounted under /api
app.use("/api", createMenuRouter(db));
app.use("/api", createOrdersRouter(db, io));
app.use("/api", createAdminRouter(db));

//single URL
app.use(express.static(path.join(__dirname, "..", "client", "dist"))); //needs ".." to go up one directory
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

//logs Socket for debugging
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));
});

//prints QR to terminal
(async () => {
  const baseUrl = `http://${LAN_HOST}:${PORT}`;
  const qr = await QRCode.toString(baseUrl, { type: "terminal", small: true });
  console.log("\nCustomer URL:", baseUrl);
  console.log("Kitchen URL:", baseUrl + "/kitchen");
  console.log(qr);
})();

//start
server.listen(PORT, HOST, () => {
  console.log(`Server is Listening on ${HOST}:${PORT}`);
});
