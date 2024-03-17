const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");
const generateFixtures = require("../helper/helpers");

router.patch("/generateFixtures", async (req, res) => {
  try {
    const teams = [
      "Ridgewood",
      "AFC Varndeanians II",
      "Godstone",
      "Ringmer AFC II",
      "Polegate Town",
      "Hurstpierpoint",
      "AFC Uckfield Town II",
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

router.patch("/", async (req, res) => {
  try {
    const { leagueYear, teamYear, playerYear } = req.body;

    const league = await League.updateMany(
      {},
      { $push: { years: { year: leagueYear, status: "On going" } } }
    );

    const team = await Team.updateMany(
      {},
      {
        $push: {
          years: { year: teamYear, status: "On going", league: league._id },
        },
      }
    );

    const player = await Player.updateMany(
      {},
      { $push: { years: { year: playerYear, status: "On going" } } }
    );

    res
      .status(200)
      .json({ message: "New year added successfully", league, team, player });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
