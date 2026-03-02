//mainly to set proper IP address to connect for when customer scans QR code

const express = require("express");

module.exports = function createSystemRouter() {
  const router = express.Router();

  router.get("/info", (req, res) => {
    const port = process.env.PORT || 3000;

    const lanHost = process.env.LAN_HOST;

    const hostFromReq = (req.headers.host || "").split(":")[0];

    const host = lanHost || hostFromReq || "127.0.0.1";
    const baseUrl = `http://${host}:${port}`;

    res.json({ baseUrl });
  });

  return router;
};
