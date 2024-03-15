const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");

router.patch("/", async (req, res) => {
  try {
    // Extract year information from the request body
    const { leagueYear, teamYear, playerYear } = req.body;

    // Update all leagues to add a new year
    const league = await League.updateMany(
      {},
      { $push: { years: { year: leagueYear, status: "On going" } } }
    );

    // Update all teams to add a new year
    const team = await Team.updateMany(
      {},
      {
        $push: {
          years: { year: teamYear, status: "On going", league: league._id },
        },
      }
    );

    // Update all players to add a new year
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
