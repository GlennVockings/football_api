const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const League = require("../models/league");
const Player = require("../models/player");
const { authenticateToken } = require("../middleware/auth");
const { getTeam } = require("../middleware/getHelpers");
const player = require("../models/player");
const { capitalizeFirstLetter } = require("../helper/helpers");

// Gets all teams
router.get("/", async (req, res) => {
  try {
    const teamName = req.query.team;
    const year = req.query.year;

    if (!teamName || !year) {
      return res
        .status(400)
        .json({ message: "Team name and year are required query parameters" });
    }

    const formattedTeam = capitalizeFirstLetter(teamName.replace("-", " "));

    const team = await Team.findOne({ name: formattedTeam }).populate(
      "seasons.league",
      "league"
    );

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const foundSeason = team.seasons.find((season) => season.season === year);

    if (!foundSeason) {
      return res
        .status(404)
        .json({ message: `Season ${year} not found for the team` });
    }

    const leagueId = foundSeason.league; // Assuming league is stored as ObjectId in season

    const foundLeague = await League.findById(leagueId);
    const foundLeagueSeason = foundLeague.seasons.filter(
      (season) => season.season === year
    );

    const fixtures = foundLeagueSeason[0].fixtures.filter(
      (fixture) =>
        (fixture.home === team.name && fixture.status !== "") ||
        (fixture.away === team.name && fixture.status !== "")
    );

    return res.status(200).json({
      name: team.name,
      parent: team.parent,
      ground: team.ground,
      season: foundSeason,
      fixtures,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const teams = await Team.find()
      .sort({ name: "asc" })
      .select("_id name parent abbr");

    res.status(201).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific team
router.get("/:teamId", getTeam, async (req, res) => {
  try {
    res.status(200).json(res.team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// updates team information
router.patch("/:teamId", async (req, res) => {
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

// Adds a new season the team model
router.patch("/addSeason/:teamId", authenticateToken, async (req, res) => {
  const { season: teamSeason, status, league, players } = req.body;
  let foundPlayers = [];
  try {
    if (league === "") {
      return res.status(404).json({ message: "No league entered" });
    }

    const foundLeague = await League.findById(league);

    if (players.length > 0) {
      player.forEach(async (player) => {
        const foundPlayer = await Player.findById(player);

        foundPlayers.push(foundPlayer._id);
      });
    }
    const foundSeason = foundLeague.seasons.findIndex(
      (season) => season.season === teamSeason
    );

    foundLeague.seasons[foundSeason].teams.push(req.params.teamId);

    await foundLeague.save();

    const team = await Team.findById(req.params.teamId);

    team.seasons.push({
      season: teamSeason,
      status,
      league: foundLeague._id,
      players: foundPlayers,
    });

    await team.save();

    res.status(201).json({ message: "New season added" });
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

module.exports = router;
