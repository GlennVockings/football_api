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
          foundSeason.players.push(foundPlayer._id);
        }

        await foundTeam.save();
      });
    });

    res.status(201).json(foundPlayer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/addSeason/:playerId", authenticateToken, async (req, res) => {
  const { season, status, stats } = req.body;
  try {
    const foundPlayer = await Player.findById(req.params.playerId);

    for (const stat of stats) {
      let foundTeam = await Team.findById(stat.team);
      const foundSeason = foundTeam.seasons.find(
        (season) => season.season == stat.season
      );

      if (!foundSeason) {
        return res.status(404).json;
      }

      foundSeason.players.push(req.params.playerId);

      await foundTeam.save();
    }

    foundPlayer.seasons.push({
      season,
      status,
      stats,
    });

    await foundPlayer.save();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

router.post("/", authenticateToken, async (req, res) => {
  const newPlayers = req.body;

  try {
    const promises = [];
    for (const newPlayer of newPlayers) {
      const { firstName, lastName, number, position, seasons } = newPlayer;
      let existingPlayer = await Player.findOne({ firstName, lastName });

      if (existingPlayer) {
        return res.status(400).json({ message: "This player already exists" });
      }

      for (const season of seasons) {
        for (const stat of season.stats) {
          const foundTeam = await Team.findById(stat.team);
          if (!foundTeam) {
            return res.status(400).json({ message: "Team not found" });
          }
          stat.team = foundTeam._id;
        }
      }

      const addedPlayer = new Player({
        firstName,
        lastName,
        number,
        position,
        seasons,
      });

      await addedPlayer.save();

      for (const playerSeason of seasons) {
        for (const stat of playerSeason.stats) {
          const foundTeam = await Team.findById(stat.team);
          if (!foundTeam) {
            return res.status(400).json({ message: "Team not found" });
          }
          const foundSeason = foundTeam.seasons.find(
            (season) => season.season === playerSeason.season
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
