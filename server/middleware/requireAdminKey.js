//runs before route handler

module.exports = function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ error: "ADMIN_KEY not set on server" }); //if i forget to set admin key
  }
  if (key !== process.env.ADMIN_KEY) {
    //if key is wrong...
    return res.status(403).json({ error: "FORBIDDEN - BAD ADMIN KEY" }); //block request
  }
  next(); //if everything is good and nothing got flagged above, proceed
};
