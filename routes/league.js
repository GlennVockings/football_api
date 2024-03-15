const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");

// GET ROUTES

// get all fixtures
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find().populate({
      path: "years.teams",
      select: "name",
    });
    res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get a specific year's fixtures
router.get("/:leagueId", getLeague, (req, res) => {
  try {
    res.status(201).json(res.league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get a specific league's fixtures
router.get("/:leagueId/:yearId", getLeague, (req, res) => {
  const yearId = req.params.yearId;

  try {
    const yearData = res.league.years.find((year) => year.id === yearId);
    if (!yearData) {
      return res.status(404).send("League not found");
    }

    res.status(201).json(yearData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH ROUTES

// add new year to a league
router.patch("/:leagueId", getLeague, async (req, res) => {
  const newYearData = req.body;

  try {
    // Check if a league with the same name already exists
    const existingYear = res.league.years.find(
      (league) => league.league === newYearData.league
    );
    if (existingYear) {
      return res.status(400).json({
        message: "Year already exists in this league",
      });
    }
    // Add the new league to the season
    res.league.years.push(newYearData);

    // Save the updated season
    const newLeague = await res.league.save();

    res.status(201).json(newLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a year to add more fixtures if necessary
router.patch("/:leagueId/:yearId", getLeague, async (req, res) => {
  const yearId = req.params.yearId;
  const updatedYear = req.body;

  try {
    const yaerIndex = res.league.years.findIndex((year) => year.id === yearId);
    if (yaerIndex === -1) {
      return res.status(404).send("League not found");
    }

    res.league.years[yaerIndex] = updatedYear;
    res.league.save();

    res.status(201).json(res.league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a fixture
router.patch("/:leagueId/:yearId/:fixtureId", getLeague, (req, res) => {
  const yearId = req.params.yearId;
  const fixtureId = req.params.fixtureId;
  const updatedFixtureData = req.body;

  try {
    const yearIndex = res.league.years.findIndex((year) => year.id === yearId);
    if (yearIndex === -1) {
      return res.status(404).send("League not found");
    }

    // Find the requested fixture in the leagueData
    const fixtureIndex = res.league.years[yearIndex].fixtures.findIndex(
      (fixture) => fixture.id === fixtureId
    );
    if (fixtureIndex === -1) {
      return res.status(404).send("Fixture not found");
    }

    res.league.years[yearIndex].fixtures[fixtureIndex] = updatedFixtureData;

    const newLeague = res.league.save();
    res.status(201).json(newLeague);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST ROUTES

// create a new season
router.post("/", async (req, res) => {
  const leagueName = req.body.league;
  try {
    // checks if a year of the same name exists
    let existingLeague = await League.findOne({ league: leagueName });

    // if the year already exists then tells the user if not then adds it
    if (existingLeague) {
      res.status(400).json({
        message: "This season already exists",
      });
    } else {
      const newLeague = new League({
        league: leagueName,
        years: req.body.years,
      });
      await newLeague.save();
      res.status(201).json(newLeague);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE ROUTES

// deletes a given year
router.delete("/:leagueId", getLeague, async (req, res) => {
  try {
    // fins and deletes the specific year
    await League.findByIdAndDelete(req.params.leagueId);
    res.status(201).json({ message: "Deleted league" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getLeague(req, res, next) {
  let league;
  try {
    // find the year with the matching id
    league = await League.findById(req.params.leagueId).populate({
      path: "years.teams",
      select: "name",
    });
    // if no year is found then fire a message telling the user
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
