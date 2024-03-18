const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const League = require("../models/league");
const Player = require("../models/player");
const { authenticateToken } = require("../middleware/auth");

// Gets all teams
router.get("/", authenticateToken, async (req, res) => {
  try {
    const teams = await Team.find().populate("seasons.league", "league");

    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific team
router.get("/:teamId", authenticateToken, getTeam, async (req, res) => {
  try {
    const teamName = res.team.name;

    // Aggregate to find fixtures where the team is either home or away
    const fixtures = await League.aggregate([
      { $unwind: "$seasons" },
      { $unwind: "$seasons.fixtures" },
      {
        $match: {
          $or: [
            { "seasons.fixtures.home": teamName },
            { "seasons.fixtures.away": teamName },
          ],
        },
      },
      {
        $group: {
          _id: "$seasons.season",
          fixtures: { $push: "$seasons.fixtures" },
        },
      },
      { $project: { _id: 0, season: "$_id", fixtures: 1 } },
    ]);

    res.status(200).json({
      team: res.team,
      fixtures: fixtures,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// updates team
router.patch("/:teamId", authenticateToken, async (req, res) => {
  const { name, ground, seasons } = req.body;
  let foundTeam;
  try {
    foundTeam = await Team.findById(req.params.teamId).then((team) => {
      team.name = name;
      team.ground = ground;
      teams.seasons = seasons;
      team.save();
    });

    for (let i = 0; i < seasons.length; i++) {
      const { league, season: teamSeason } = seasons[i];

      const foundLeague = await League.findById(league);

      const currentSeason = foundLeague.seasons.find(
        (season) => season.season === teamSeason
      );

      const teamCheck = currentSeason.teams.find(team._id);

      if (teamCheck !== null) {
        currentSeason.teams.push(team._id);
      }

      await foundLeague.save();
    }

    res.status(201).json(foundTeam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// add a new team
router.post("/", authenticateToken, async (req, res) => {
  const { name, ground, seasons } = req.body;

  try {
    let existingTeam = await Team.findOne({ name });

    if (existingTeam) {
      res.status(400).json({
        message: "This team already exists",
      });
    } else {
      // create and save new team to get a _id
      const team = new Team({
        name,
        ground,
        seasons,
      });

      await team.save();

      // run through the teams seasons and add to corresponding leagues season
      for (let i = 0; i < seasons.length; i++) {
        const { league, season: teamSeason } = seasons[i];

        const foundLeague = await League.findById(league);

        const currentSeason = foundLeague.seasons.find(
          (season) => season.season === teamSeason
        );

        currentSeason.teams.push(team._id);

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
router.delete("/:teamId", authenticateToken, getTeam, async (req, res) => {
  try {
    const foundPlayers = await Player.find({
      "seasons.season.team": res.team._id,
    });

    // If any player is found, prevent deleting the team
    if (foundPlayers.length > 0) {
      return res.status(400).json({
        message: "Cannot delete team as there are players in this team",
      });
    }

    const foundLeague = await League.findById(res.team.league._id);

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

    await Team.findByIdAndDelete(req.params.teamId);

    res.status(201).json({ message: "Deleted team" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getTeam(req, res, next) {
  let team;
  try {
    team = await Team.findById(req.params.teamId)
      .populate("seasons.league", "league")
      .populate("seasons.players", "firstName lastName");
    if (team == null) {
      return res.status(404).json({ message: "Cannot find team" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.team = team;
  next();
}

module.exports = router;
