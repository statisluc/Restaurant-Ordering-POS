const express = require("express");

module.exports = function createMenuRouter(db) {
  const router = express.Router();

  //fetches menu items in the database
  router.get("/menu", (req, rest) => {
    const items = db.prepare("SELECT * FROM menu_items").all();
    rest.json(items);
  });
  return router;
};
