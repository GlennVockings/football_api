const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const { authenticateToken } = require("../middleware/auth");
const { getLeague } = require("../middleware/getHelpers");
const { updateTableData, capitalizeFirstLetter } = require("../helper/helpers");

// GET ROUTES

// get all fixtures
router.get("/", async (req, res) => {
  try {
    const leagueName = req.query.league;

    if (leagueName) {
      const formattedLeague = capitalizeFirstLetter(
        leagueName.replace("-", " ")
      );

      let league = await League.findOne({ league: formattedLeague }).populate([
        { path: "seasons.table.team", model: "Team", select: "name" }, // Populating seasons.table.team with name
        { path: "seasons.teams", select: "name ground" }, // Populating teams array with name and ground fields
      ]);

      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }

      return res.status(200).json(league);
    }

    const leagues = await League.find()
      .populate([
        { path: "seasons.table.team", model: "Team", select: "name" }, // Populating seasons.table.team with name
        { path: "seasons.teams", select: "name ground" }, // Populating teams array with name and ground fields
      ])
      .lean();
    res.status(200).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const leagues = await League.find().select("_id league");
    return res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId", getLeague, (req, res) => {
  try {
    res.status(201).json(res.league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId/summary", getLeague, (req, res) => {
  try {
    const filteredSeason = res.league.seasons.find(
      (season) => season.status === "On going"
    );

    if (!filteredSeason) {
      // If no ongoing season is found, return an empty array of completed fixtures
      return res.status(200).json({ message: "No ongoing season found" });
    }

    // Filter out fixtures with empty or undefined dateTime values
    const completedFixtures = filteredSeason.fixtures
      .filter((fixture) => fixture.status === "completed" && fixture.dateTime)
      .sort((a, b) => b.dateTime - a.dateTime)
      .slice(0, 7); // Select the first 7 fixtures

    const slimTable = filteredSeason.table.slice(0, 5);

    // Sort top three teams for goals
    const topThreeGoals = filteredSeason.table
      .slice(0, 3)
      .sort(
        (a, b) =>
          b.for - a.for ||
          (a.team && b.team && a.team.name.localeCompare(b.team.name))
      )
      .map((team) => ({ team: team.team && team.team.name, stat: team.for }));

    // Sort top three teams for yellow cards
    const topThreeYellowCards = filteredSeason.table
      .sort(
        (a, b) =>
          b.yellowCards - a.yellowCards ||
          (a.team && b.team && a.team.name.localeCompare(b.team.name))
      )
      .slice(0, 3)
      .map((team) => ({
        team: team.team && team.team.name,
        stat: team.yellowCards,
      }));

    // Sort top three teams for red cards
    const topThreeRedCards = filteredSeason.table
      .sort(
        (a, b) =>
          b.redCards - a.redCards ||
          (a.team && b.team && a.team.name.localeCompare(b.team.name))
      )
      .slice(0, 3)
      .map((team) => ({
        team: team.team && team.team.name,
        stat: team.redCards,
      }));

    const summary = {
      season: filteredSeason.season,
      status: filteredSeason.status,
      fixtures: filteredSeason.fixtures,
      table: filteredSeason.table,
      completedFixtures: completedFixtures,
      slimTable: slimTable,
      stats: [
        { name: "Goals", stats: topThreeGoals },
        { name: "Yellow Cards", stats: topThreeYellowCards },
        { name: "Red Cards", stats: topThreeRedCards },
      ],
    };

    return res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId/upcomingFixtures", getLeague, (req, res) => {
  try {
    const foundSeason = res.league.seasons.find(
      (season) => season.status === "On going"
    );

    if (!foundSeason) {
      // If no ongoing season is found, return an empty array of completed fixtures
      return res.status(200).json({ message: "No ongoing season found" });
    }

    const filteredSeason = foundSeason.fixtures.filter(
      (fixture) => fixture.status !== "completed" && fixture.dateTime != ""
    );

    if (filteredSeason.length < 1) {
      return res.status(201).json({ message: "No Upcoming fixtures" });
    }

    filteredSeason.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    res.status(200).json(filteredSeason);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH ROUTES

// update a league's name
router.patch("/:leagueId", authenticateToken, async (req, res) => {
  const { league: leagueName } = req.body;
  let updatedLeague;
  try {
    updatedLeague = await League.findById(req.params.leagueId).then(
      (league) => {
        league.league = leagueName;
        league.save();
      }
    );

    res.status(201).json(updatedLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a league to add more seasons if necessary
router.patch("/addSeason/:leagueId", authenticateToken, async (req, res) => {
  const { season, status, fixtures } = req.body;
  let updatedLeague;
  let newTable = [];
  try {
    if (teams.length > 0) {
      teams.forEach(async (team) => {
        const foundTeam = await Team.findById(team);
        newTable.push(foundTeam._id);
      });
    }

    updatedLeague = await League.findById(req.params.leagueId).then(
      (league) => {
        league.seasons.push({
          season,
          status,
          table: newTable,
          fixtures,
        });
        league.save();
      }
    );

    res.status(201).json(updatedLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a seasons information
router.patch(
  "/:leagueId/:seasonId",
  authenticateToken,
  getLeague,
  async (req, res) => {
    const seasonId = req.params.seasonId;
    const { season, status, fixtures, table, teams } = req.body;

    try {
      let teamsArray = [];
      const seasonIndex = res.league.seasons.findIndex(
        (season) => season.id === seasonId
      );
      if (seasonIndex === -1) {
        return res.status(404).send("Season not found");
      }

      for (let i = 0; i < teams.length; i++) {
        const foundTeam = await Team.findById(teams[i]);

        if (!foundTeam) {
          return res.status(404).send(`Team with ID ${teams[i]} not found`);
        }

        teamsArray.push(foundTeam._id);
        table.team = foundTeam._id;
      }

      console.log(teamsArray);

      res.league.seasons[seasonIndex] = {
        season,
        status,
        fixtures,
        table,
        teams: teamsArray,
      };
      await res.league.save();

      res.status(201).json(res.league);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// update a fixture
router.patch("/:leagueId/:seasonId/:fixtureId", getLeague, (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    const fixtureId = req.params.fixtureId;
    const updatedFixtureData = req.body;

    const seasonIndex = res.league.seasons.findIndex(
      (season) => season.id === seasonId
    );
    if (seasonIndex === -1) {
      return res.status(404).send("League not found");
    }

    const fixtureIndex = res.league.seasons[seasonIndex].fixtures.findIndex(
      (fixture) => fixture.id === fixtureId
    );

    if (fixtureIndex === -1) {
      return res.status(404).send("Fixture not found");
    }

    res.league.seasons[seasonIndex].fixtures[fixtureIndex] = updatedFixtureData;

    res.league.seasons[seasonIndex].fixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    const updatedTable = updateTableData(
      res.league.seasons[seasonIndex].fixtures,
      res.league.seasons[seasonIndex].table
    );

    res.league.seasons[seasonIndex].table = updatedTable;

    const newLeague = res.league.save();

    res.status(201).json(newLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

// create a new season
router.post("/", authenticateToken, async (req, res) => {
  const leagueName = req.body.league;
  try {
    let existingLeague = await League.findOne({ league: leagueName });

    if (existingLeague) {
      res.status(400).json({
        message: "This season already exists",
      });
    } else {
      const newLeague = new League({
        league: leagueName,
        seasons: req.body.seasons,
      });
      await newLeague.save();
      res.status(201).json(newLeague);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE ROUTES

// deletes a given season
router.delete("/:leagueId", authenticateToken, getLeague, async (req, res) => {
  try {
    await League.findByIdAndDelete(req.params.leagueId);
    res.status(201).json({ message: "Deleted league" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
