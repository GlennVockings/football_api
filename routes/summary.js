const express = require("express");
const router = express.Router();
const League = require("../models/league");
const { authenticateToken } = require("../middleware/auth");

router.get("/", async (req, res) => {
  try {
    // Find leagues with ongoing seasons
    const leagues = await League.find().populate({
      path: "seasons.table.team",
      select: "name",
    });

    const filteredLeagues = leagues.map((league) => {
      const seasonIndex = league.seasons.findIndex(
        (season) => season.status === "Completed"
      );

      league.seasons.splice(seasonIndex, 1);

      // Filter out fixtures with empty or undefined dateTime values
      const completedFixtures = league.seasons[0].fixtures
        .filter((fixture) => fixture.status === "completed" && fixture.dateTime)
        .sort((a, b) => {
          // Convert dateTime strings to Date objects for comparison
          const dateA = new Date(a.dateTime);
          const dateB = new Date(b.dateTime);
          // Sort by dateTime in descending order
          return dateB - dateA;
        })
        .slice(0, 7); // Select the first 7 fixtures

      // Replace fixtures array with the last 7 completed fixtures
      league.seasons[0].fixtures = completedFixtures;

      return league; // Need to return the modified league object
    });

    res.status(201).json(filteredLeagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/leagues", async (req, res) => {
  try {
    const leagues = await League.find().select("_id league");

    res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
