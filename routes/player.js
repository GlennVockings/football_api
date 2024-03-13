const express = require("express");
const router = express.Router();
const { League } = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");

// GET ROUTES

// gets all players
router.get("/", async (req, res) => {
  try {
    const players = await Player.find();
    res.status(201).json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:playerId", getPlayer, async (req, res) => {
  try {
    res.status(201).json(res.player);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH ROUTES

router.patch("/:playerId", async (req, res) => {
  const updatedPlayerData = req.body;

  try {
    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.playerId,
      updatedPlayerData,
      { new: true } // Return the updated document
    );

    res.status(201).json(updatedPlayer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

router.post("/", async (req, res) => {
  const { firstName, lastName, team } = req.body;

  try {
    let existingPlayer = await Player.findOne({ firstName, lastName });

    if (existingPlayer) {
      return res.status(400).json({ message: "This player already exists" });
    } else {
      const foundTeam = await Team.findById(team);

      if (!foundTeam) {
        return res.status(400).json({ message: "Team not found" });
      }

      const newPlayer = new Player({
        firstName,
        lastName,
        number: req.body.number,
        position: req.body.position,
        appearances: req.body.appearances,
        goals: req.body.goals,
        assists: req.body.assists,
        yellowCards: req.body.yellowCards,
        redCards: req.body.redCards,
        started: req.body.started,
        playerofMatch: req.body.playerofMatch,
        cleanSheet: req.body.cleanSheet,
        team: foundTeam._id,
      });

      await newPlayer.save();

      res.status(201).json(newPlayer);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE ROUTES

router.delete("/:playerId", getPlayer, async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.playerId);
    res.status(201).json({ message: "Player deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getPlayer(req, res, next) {
  let player;
  try {
    player = await Player.findById(req.params.playerId).populate(
      "team",
      "name"
    );
    if (player == null) {
      return res.status(404).json({ message: "Cannot find player" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.player = player;
  next();
}

module.exports = router;
