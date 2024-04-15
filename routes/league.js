const express = require("express");
const router = express.Router();
const League = require("../models/league");
const { authenticateToken } = require("../middleware/auth");
const { getLeague } = require("../middleware/getHelpers");
const { updateTableData } = require("../helper/helpers");

// GET ROUTES

// get all fixtures
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find();
    res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const leagues = await League.find().select("_id league");

    res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get league info
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

    const summary = {
      season: filteredSeason.season,
      status: filteredSeason.status,
      fixtures: filteredSeason.fixtures,
      table: filteredSeason.table,
      completedFixtures: completedFixtures,
      slimTable: slimTable,
    };

    res.status(200).json(summary);
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
    const updatedseason = req.body;

    try {
      const seasonIndex = res.league.seasons.findIndex(
        (season) => season.id === seasonId
      );
      if (seasonIndex === -1) {
        return res.status(404).send("League not found");
      }

      for (let i = 0; i > updatedseason.table.length; i++) {
        const foundTeam = await Team.findById(updatedseason.table[i].team);

        updatedseason.table[i].team = foundTeam._id;
      }

      res.league.seasons[seasonIndex] = updatedseason;
      res.league.save();

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
