const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Team = require("../models/team");
const Player = require("../models/player");
const { authenticateToken } = require("../middleware/auth");
const { getPlayer } = require("../middleware/getHelpers");

// GET ROUTES

// gets all players
router.get("/", authenticateToken, async (req, res) => {
  try {
    let players = await Player.find();
    res.status(201).json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:playerId", authenticateToken, getPlayer, async (req, res) => {
  try {
    res.status(201).json(res.player);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH ROUTES

router.patch("/:playerId", authenticateToken, async (req, res) => {
  const { firstName, lastName, number, position, seasons } = req.body;
  let foundPlayer;
  try {
    seasons.forEach((season) => {
      season.stats.forEach(async (stat) => {
        const foundTeam = await Team.find(stat.team);
        stat.team = foundTeam._id;
      });
    });

    foundPlayer = await Player.findById(req.params.playerId).then((player) => {
      player.firstName = firstName;
      player.lastName = lastName;
      player.number = number;
      player.position = position;
      player.seasons = seasons;
      player.save();
    });

    seasons.forEach((playerSeason) => {
      playerSeason.stats.forEach(async (stat) => {
        const foundTeam = await Team.findById(stat.team);

        if (!foundTeam) {
          return res.status(400).json({ message: "Team not found" });
        }

        const foundSeason = foundTeam.seasons.find(
          (season) => season.season === playerSeason
        );

        const playerCheck = foundSeason.players.find(foundPlayer._id);

        if (playerCheck !== null) {
          foundSeason.players.push(newPlayer._id);
        }

        await foundTeam.save();
      });
    });

    res.status(201).json(foundPlayer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

router.post("/", authenticateToken, async (req, res) => {
  const { firstName, lastName, seasons } = req.body;

  try {
    let existingPlayer = await Player.findOne({ firstName, lastName });

    if (existingPlayer) {
      return res.status(400).json({ message: "This player already exists" });
    } else {
      seasons.forEach((season) => {
        season.stats.forEach((stat) => {
          stat.team = new mongoose.Types.ObjectId(stat.team);
        });
      });

      const newPlayer = new Player({
        firstName,
        lastName,
        seasons,
      });

      await newPlayer.save();

      seasons.forEach((playerSeason) => {
        playerSeason.stats.forEach(async (stat) => {
          const foundTeam = await Team.findById(stat.team);

          if (!foundTeam) {
            return res.status(400).json({ message: "Team not found" });
          }

          const foundSeason = await foundTeam.seasons.find(
            (season) => season.season === playerSeason.season
          );

          foundSeason.players.push(newPlayer._id);

          await foundTeam.save();
        });
      });

      res.status(201).json(newPlayer);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE ROUTES
router.delete("/:playerId", authenticateToken, getPlayer, async (req, res) => {
  try {
    res.player.seasons.forEach((playerSeason) => {
      playerSeason.stats.forEach(async (stat) => {
        const foundTeam = await Team.findById(stat.team._id);

        if (!foundTeam) {
          return res.status(400).json({ message: "Team not found" });
        }

        const foundSeason = await foundTeam.seasons.find(
          (season) => season.season === playerSeason.season
        );

        const playerIndex = await foundSeason.players.findIndex(
          (player) => player._id === res.player._id
        );

        foundSeason.players.splice(playerIndex, 1);

        await foundTeam.save();
      });
    });

    // Delete the player document
    await Player.findByIdAndDelete(req.params.playerId);

    res.status(201).json({ message: "Player deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
