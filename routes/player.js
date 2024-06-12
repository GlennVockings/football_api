const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Team = require("../models/team");
const Player = require("../models/player");
const { authenticateToken } = require("../middleware/auth");
const { getPlayer } = require("../middleware/getHelpers");

// GET ROUTES

// gets all players
router.get("/", async (req, res) => {
  try {
    let players = await Player.find();
    res.status(201).json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const players = await Player.find().select("_id firstName lastName");

    res.status(200).json(players);
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

router.patch("/:playerId", async (req, res) => {
  const { firstName, lastName, number, position } = req.body;
  let foundPlayer;
  try {
    foundPlayer = await Player.findById(req.params.playerId).then((player) => {
      player.firstName = firstName;
      player.lastName = lastName;
      player.number = number;
      player.position = position;
      player.save();
    });

    res.status(201).json(foundPlayer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

router.post("/", async (req, res) => {
  const newPlayers = req.body;

  try {
    const promises = [];
    for (const newPlayer of newPlayers) {
      const { firstName, lastName, team, season } = newPlayer;

      // if player exists then don't add it and tell the user
      let existingPlayer = await Player.findOne({ firstName, lastName });
      if (existingPlayer) {
        return res.status(400).json({
          message: `This player ${firstName} ${lastName} already exists`,
        });
      }

      const addedPlayer = new Player({
        firstName,
        lastName,
        number: 0,
        position: "",
        seasons: [
          {
            season,
            status: "On going",
            stats: [
              {
                team,
                appearances: 0,
                goals: 0,
                started: 0,
                yellowCards: 0,
                redCards: 0,
                playerofMatch: 0,
                cleanSheet: 0,
                assists: 0,
              },
            ],
          },
        ],
      });

      await addedPlayer.save();

      for (const playerSeason of addedPlayer.seasons) {
        for (const stat of playerSeason.stats) {
          const foundTeam = await Team.findById(stat.team);
          if (!foundTeam) {
            return res.status(400).json({ message: "Team not found" });
          }
          const foundSeason = foundTeam.seasons.find(
            (teamSeason) => teamSeason.season === season
          );
          if (!foundSeason) {
            return res.status(400).json({ message: "Season not found" });
          }
          foundSeason.players.push(addedPlayer._id);
          promises.push(foundTeam.save());
        }
      }
    }

    // Wait for all teams to be saved
    await Promise.all(promises);

    res.status(201).json({ message: "Added players" });
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

        const foundSeason = foundTeam.seasons.find(
          (season) => season.season === playerSeason.season
        );

        const playerIndex = foundSeason.players.findIndex(
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
