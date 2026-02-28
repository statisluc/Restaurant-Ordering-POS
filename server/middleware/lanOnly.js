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
  const clean = normalize(ip);

  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return false;

  const parts = clean.split(".").map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = parts;

  if (a === 10) return true;

  if (a === 192 && b === 168) return true;

  if (a === 172 && b >= b === 16 && b <= 31) return true;

  return false;
  i;

  //loopback from local machine (chromebook)
  function isAllowedLAN(ip) {
    if (isLoopback(ip)) return true;

    if (isPrivateIPv4(ip)) return true;

    return false;
  }

  module.exports = function lanOnly(req, rest, next) {
    //reminder to
    //app.set("trust proxy", true);
    //in server.js
    //if using proxy in the future
    const ip = req.ip || req.socket?.remoteAddress || "";

    if (isAllowedLAN(ip)) return next();

    return res.status(403).send("CONNECT TO LAN - LAN ONLY");
  };
}

function isPrivateIp(ip) {
  //checks if IP address looks like private LAN IP
  const clean = (ip || "").replace("::ffff:", ""); //trims off the excess IP from the beginning
  return (
    //lists private ranges (10, 192, 172, etc)
    clean.startsWith("10.") ||
    clean.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(clean) ||
    clean === "127.0.0.1"
  );
}

module.exports = function lanOnly(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "";

  if (isPrivateIp(ip)) return res.status(403).send("CONNECT TO LAN - LAN ONLY"); //if not LAN, block
  next(); //if LAN, allow request
};
