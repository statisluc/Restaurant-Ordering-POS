//reads JSON (menu.seed.json) file and inserts menu items into SQLite

//ensures endpoints cannot be publicly accessible
//uses requireAdminKey middleware to ensure

const express = require("express");
const fs = require("fs");
const path = require("path");
const requireAdminKey = require("../middleware/requireAdminKey");

module.exports = function createAdminRouter(db) {
  const router = express.Router();

  router.post("/admin/menu/import", requireAdminKey, (req, res) => {
    try {
      const seedPath = path.join(__dirname, "..", "db", "menu.seed.json");
      const raw = fs.readFileSync(seedPath, "utf8");
      const items = JSON.parse(raw);

      if (!Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ error: "menu.seed.json must be a non-empty array" });
      }

      const insert = db.prepare(
        `INSERT INTO menu_items (name, description, category, price_cents, is_available) VALUES (?, ?, ?, ?, ?)`,
      );

      const importTx = db.transaction(() => {
        for (const it of items) {
          if (!it.name || !Number.isInteger(it.price_cents)) {
            throw new Error(
              "Each item needs name (string) and price_cents (int)",
            );
          }
          insert.run(
            it.name,
            it.description ?? null,
            it.category ?? null,
            it.price_cents,
            it.is_available ?? 1,
          );
        }
      });

      importTx();

      return res.json({ ok: true, imported: items.length });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  });
  return router;
};
