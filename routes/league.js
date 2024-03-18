const express = require("express");
const router = express.Router();
const League = require("../models/league");
const { authenticateToken } = require("../middleware/auth");

// GET ROUTES

// get all fixtures
router.get("/", authenticateToken, async (req, res) => {
  try {
    const leagues = await League.find();
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

// get a specific league's fixtures
router.get("/:leagueId/:seasonId", getLeague, (req, res) => {
  const seasonId = req.params.seasonId;

  try {
    const seasonData = res.league.seasons.find(
      (season) => season.id === seasonId
    );
    if (!seasonData) {
      return res.status(404).send("League not found");
    }

    res.status(201).json(seasonData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH ROUTES

// update a season to add more fixtures if necessary
router.patch("/:leagueId", authenticateToken, async (req, res) => {
  const { league: leagueName, seasons } = req.body;
  let updatedLeague;
  try {
    updatedLeague = await League.findById(req.params.leagueId).then(
      (league) => {
        league.league = leagueName;
        league.seasons = seasons;
        league.save();
      }
    );

    res.status(201).json(updatedLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a season to add more fixtures if necessary
router.patch(
  "/:leagueId/:seasonId",
  authenticateToken,
  getLeague,
  async (req, res) => {
    const seasonId = req.params.seasonId;
    const updatedseason = req.body;

    try {
      const yaerIndex = res.league.seasons.findIndex(
        (season) => season.id === seasonId
      );
      if (yaerIndex === -1) {
        return res.status(404).send("League not found");
      }

      res.league.seasons[yaerIndex] = updatedseason;
      res.league.save();

      res.status(201).json(res.league);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// update a fixture
router.patch("/:leagueId/:seasonId/:fixtureId", getLeague, (req, res) => {
  const seasonId = req.params.seasonId;
  const fixtureId = req.params.fixtureId;
  const updatedFixtureData = req.body;

  try {
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
router.delete("/:leagueId", getLeague, async (req, res) => {
  try {
    await League.findByIdAndDelete(req.params.leagueId);
    res.status(201).json({ message: "Deleted league" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getLeague(req, res, next) {
  let league;
  try {
    league = await League.findById(req.params.leagueId).populate({
      path: "seasons.teams",
      select: "name",
    });
    if (league == null) {
      return res.status(404).json({ message: "Cannot find league" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.league = league;
  next();
}

module.exports = router;
