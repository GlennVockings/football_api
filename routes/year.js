const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");
const { generateFixtures } = require("../helper/helpers");

router.patch("/generateFixtures", async (req, res) => {
  try {
    const teams = [
      "Ridgewood",
      "Godstone",
      "AFC Varndeanians II",
      "Polegate Town",
      "AFC Uckfield Town II",
      "Hurstpierpoint",
      "Ringmer AFC II",
      "DCK",
      "Sovereign Saints",
      "West Hoathly",
    ];
    const fixturesJSON = generateFixtures(teams);
    res.status(201).json(fixturesJSON);
  } catch (err) {
    res.status(500).json({ messsage: err.message });
  }
});

module.exports = router;
