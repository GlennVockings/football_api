const express = require("express");
const router = express.Router();
const { League } = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");

// GET ROUTES

// gets all players
router.get("/", async (req, res) => {
  try {
    let players = Player.find();

    // Check if sort query parameters are provided
    const sortBy = req.query.sort || "firstName"; // Default sort by firstName
    const sortOrder = req.query.sortby || "desc"; // Default sort order is ascending

    // Sort the players based on the provided parameters
    if (sortBy && sortOrder) {
      const sortCriteria = {};
      sortCriteria[sortBy] = sortOrder === "desc" ? -1 : 1;
      players = players.sort(sortCriteria);
    }

    // Execute the query and send the response
    players = await players.exec();
    res.status(200).json(players);
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

      foundTeam.players.push(newPlayer._id);

      await foundTeam.save();

      res.status(201).json(newPlayer);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE ROUTES
router.delete("/:playerId", getPlayer, async (req, res) => {
  try {
    // Find the team to which the player belongs
    const foundTeam = await Team.findById(res.player.team._id);

    // Find the index of the player in the team's players array
    const playerIndex = foundTeam.players.findIndex(
      (player) => player.toString() === res.player._id.toString()
    );

    // If the player is found in the team, remove them from the players array
    if (playerIndex !== -1) {
      foundTeam.players.splice(playerIndex, 1);
    }

    // Save the updated team document
    await foundTeam.save();

    // Delete the player document
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
