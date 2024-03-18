const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();

router.get("/", async (req, res) => {
  try {
    const users = await User.find();

    res.status(201).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new User({
      name: req.body.name,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ name: req.body.name });

    if (!user) {
      return res.status(400).json({ message: "Cannot find user" });
    }

    if (await bcrypt.compare(req.body.password, user.password)) {
      const payload = {
        id: user._id,
        name: user.name,
        // Add other necessary fields if needed
      };
      const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);

      res.status(201).json({ accessToken: accessToken });
    } else {
      res.status(400).json({ message: "Invalid password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
