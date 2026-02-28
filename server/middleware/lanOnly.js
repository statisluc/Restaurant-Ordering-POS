//enforcing local network only

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
