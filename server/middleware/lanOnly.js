//enforcing local network only

function normalizeIP(ip) {
  if (!ip) return "";

  let clean = String(ip).trim();

  if (clean.startsWith("::ffff:")) clean = clean.slice(7);

  const zoneIndex = clean.indexOf("%");
  if (zoneIndex !== -1) clean = clean.slice(0, zoneIndex);

  return clean;
}

function isLoopback(ip) {
  const clean = normalizeIP(ip);
  return clean === "127.0.0.1" || clean === "::1";
}

function isPrivateIPv4(ip) {
  const clean = normalizeIP(ip);

  // Must look like IPv4
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return false;

  const parts = clean.split(".").map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 172.16.0.0 – 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

//loopback from local machine (chromebook)
function isAllowedLAN(ip) {
  return isLoopback(ip) || isPrivateIPv4(ip);
}

module.exports = function lanOnly(req, res, next) {
  //reminder to
  //app.set("trust proxy", true);
  //in server.js
  //if using proxy in the future
  const ip = req.ip || req.socket?.remoteAddress || "";

  //remember to remove
  console.log("lanOnly ip:", ip);

  if (!isAllowedLAN(ip)) {
    return res.status(403).send("CONNECT TO LAN - LAN ONLY");
  }
  return next();
};
