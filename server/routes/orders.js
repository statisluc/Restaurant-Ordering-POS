const express = require("express");

//db = sqlite databse connection
//io = socket.io server, so we can make real-time updates

module.exports = function createOrdersRouter(db, io) {
  const router = express.Router();

  //when customer places order...

  //validate request
  //insert into orders table
  //insert items into order_items table
  //fetch completed order back from database
  //emit socket event (real time update, new order)
  //return JSON to client

  router.post("/orders", (req, res) => {
    const {
      items,
      customer_name = null,
      table_number = (null.notes = null),
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be non-empty array" });
    }

    const createOrder = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO orders (customer_name, table_number, notes, status, created_at, updated_at) VALUES (?, ?, ?, 'NEW', datetime('now'), datetime('now'))`,
        )
        .run(customer_name, table_number, notes);

      const orderId = info.lastInsertRowid;

      const insertItem = db.prepare(
        `INSER INTO order_items (order_id, menu_item_id, item_name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)`,
      );

      for (const it of items) {
        if (
          !it.item_name ||
          !Number.isInteger(it.unit_price_cents) ||
          !Number.isInteger(it.quantity)
        ) {
          throw new Error(
            "Each item needs item_name (string), unit_price_cents (int), quantity (int)", //prevents partial orders incase something breaks halfway
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

    //realtime update, pushes new order
    io.emit("order:new", fullOrder);

    res.json(fullOrder);
  });

  //initial page load, kitchen fetching all orders
  router.get("/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
    const itemsStmt = db.prepare(
      "SELECT * FROM order_items WHERE order_id = ?",
    );

    res.json(orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) })));
  });
  //kitchen update order status (IN_PROCESS, READY, DONE)
  //after updating orders, emit order:update so dashboard syncs
  router.patch("/orders/:id", (req, res) => {
    const { status } = req.body;

    db.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(status, req.params.id);

    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(req.params.id);

    const items = db
      .prepare("SELECT * FROM order_items WHERE order_id =?")
      .all(req.params.id);

    const fullOrder = { ...order, items };

    //push status change
    io.emit("order:update", fullOrder);

    res.json(fullOrder);
  });
  return router;
};
