const express = require("express");
const router = express.Router();
const League = require("../models/league");
const { authenticateToken } = require("../middleware/auth");
const { getLeague } = require("../middleware/getHelpers");

router.get("/team/:leagueId", getLeague, async (req, res) => {
  try {
    const foundSeason = res.league.seasons.find(
      (season) => season.status === "On going"
    );

    // Sort top three teams for goals
    const topThreeGoals = foundSeason.table
      .slice(0, 3)
      .sort((a, b) => b.for - a.for || a.team.name.localeCompare(b.team.name))
      .map((team) => ({ team: team.team.name, stat: team.for }));

    // Sort top three teams for yellow cards
    const topThreeYellowCards = foundSeason.table
      .sort(
        (a, b) =>
          b.yellowCards - a.yellowCards ||
          a.team.name.localeCompare(b.team.name)
      )
      .slice(0, 3)
      .map((team) => ({ team: team.team.name, stat: team.yellowCards }));

    // Sort top three teams for red cards
    const topThreeRedCards = foundSeason.table
      .sort(
        (a, b) =>
          b.redCards - a.redCards || a.team.name.localeCompare(b.team.name)
      )
      .slice(0, 3)
      .map((team) => ({ team: team.team.name, stat: team.redCards }));

    // Add stats field to league object
    const stats = [
      { name: "Goals", stats: topThreeGoals },
      { name: "Yellow Cards", stats: topThreeYellowCards },
      { name: "Red Cards", stats: topThreeRedCards },
    ];

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
