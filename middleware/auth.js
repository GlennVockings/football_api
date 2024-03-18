const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
  // Gather the jwt access token from the request header
  const token = req.headers["authorization"];
  if (token == null) return res.status(401).json({ message: "No access" }); // if there isn't any token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403);
    req.user = user;
    next(); // pass the execution off to whatever request the client intended
  });
}

module.exports = { authenticateToken };
