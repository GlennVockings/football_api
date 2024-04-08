const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");
const { generateFixtures } = require("../helper/helpers");

router.patch("/generateFixtures", async (req, res) => {
  try {
    const teams = [
      "Reigate Priory II",
      "Eastbourne Rangers",
      "Nutfield",
      "Crawley AFC",
      "Barcombe",
      "Cuckfield Town",
      "Cuckfield Rangers II",
      "Peacehaven & Telscombe II",
      "Lindfield II",
      "Wivelsfield Green",
    ];
    const fixturesJSON = generateFixtures(teams);
    res.status(201).json(fixturesJSON);
  } catch (err) {
    res.status(500).json({ messsage: err.message });
  }
});

module.exports = router;
