const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Team = require("../models/team");
const { getTeam } = require("../middleware/getHelpers");
const Player = require("../models/player");

// Gets all teams
router.get("/", async (req, res) => {
  try {
    const teams = await Team.find();

    return res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const teams = await Team.find()
      .sort({ name: "asc" })
      .select("_id name parent abbr");

    res.status(201).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/team", async (req, res) => {
  try {
    let teamName = req.query.name;

    // Function to capitalize each word
    const capitalizeWords = (str) => {
      return str.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    // Capitalize the team name
    teamName = capitalizeWords(teamName);

    const foundTeam = await findOne({ name: teamName }).populate(
      "seasons.players",
      "firstName lastName number position seasons"
    );

    res.status(200).json(foundTeam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific team for the admin panel
router.get("/:teamId", async (req, res) => {
  try {
    const teamId = req.params.teamId;

    const foundTeam = await Team.findById(teamId)
      .populate("seasons.league", "league")
      .populate("seasons.players", "firstName lastName seasons");

    for (let season of foundTeam.seasons) {
      season.players.map((player) => {
        const foundSeason = player.seasons.find(
          (playerSeason) => playerSeason.season === season.season
        );

        const foundStat = foundSeason.stats.find(
          (playerStat) => playerStat.team.toString() === teamId
        );

        foundSeason.stats = foundStat;
      });
    }

    res.status(200).json(foundTeam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// updates team information
router.patch("/:teamId/info", async (req, res) => {
  const { name, ground, parent, abbr } = req.body;
  const teamId = req.params.teamId;
  let foundTeam;
  try {
    foundTeam = await Team.findById(teamId).then((team) => {
      team.name = name;
      team.ground = ground;
      team.parent = parent;
      team.abbr = abbr;
      team.save();
    });

    res.status(201).json(foundTeam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:teamId/:seasonId/info", getTeam, async (req, res) => {
  try {
    const { league, manager, stats } = req.body;

    // find th season
    const foundSeason = res.team.seasons.find(
      (season) => season._id.toString() === req.params.seasonId
    );

    const foundLeague = await _findById(league);

    foundSeason.league = foundLeague._id;
    foundSeason.manager = manager;
    foundSeason.stats = stats;

    await res.team.save();

    res.status(200).json(res.team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// add a new team
router.post("/", async (req, res) => {
  const { name, ground, parent, seasons } = req.body;

  try {
    let existingTeam = await findOne({ name });

    if (existingTeam) {
      res.status(400).json({
        message: "This team already exists",
      });
    } else {
      // create and save new team to get a _id
      const team = new Team({
        name,
        ground,
        parent,
        seasons,
      });

      await team.save();

      // run through the teams seasons and add to corresponding leagues season
      for (let i = 0; i < seasons.length; i++) {
        const { league, season: teamSeason } = seasons[i];

        const foundLeague = await _findById(league);

        const currentSeason = foundLeague.seasons.find(
          (season) => season.season === teamSeason
        );

        const tableTemplate = {
          team: team._id,
          played: 0,
          wins: 0,
          loses: 0,
          draws: 0,
          for: 0,
          against: 0,
          points: 0,
        };

        currentSeason.table.push(tableTemplate);

        await foundLeague.save();
      }

      res.status(201).json(team);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE ROUTES

// delete a team
router.delete("/:teamId", getTeam, async (req, res) => {
  try {
    const foundPlayers = await _find({
      "seasons.season.team": res.team._id,
    });

    // If any player is found, prevent deleting the team
    if (foundPlayers.length > 0) {
      return res.status(400).json({
        message: "Cannot delete team as there are players in this team",
      });
    }

    const foundLeague = await _findById(res.team.league._id);

    const seasonIndex = foundLeague.seasons.findIndex(
      (season) => season.status === STATUS
    );

    // Find the index of the player in the team's players array
    const teamIndex = foundLeague.seasons[seasonIndex].teams.findIndex(
      (team) => team.toString() === res.team._id.toString()
    );

    if (teamIndex !== -1) {
      foundLeague.seasons[seasonIndex].teams.splice(teamIndex, 1);
    }

    // save updated league with deleted team
    await foundLeague.save();

    await findByIdAndDelete(req.params.teamId);

    res.status(201).json({ message: "Deleted team" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
