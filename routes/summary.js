const express = require("express");
const router = express.Router();
const League = require("../models/league");
const { authenticateToken } = require("../middleware/auth");

router.get("/", authenticateToken, async (req, res) => {
  try {
    const leagues = await League.aggregate([
      // Unwind the seasons array to get each season as a separate document
      { $unwind: "$seasons" },
      // Match seasons with status "On going"
      { $match: { "seasons.status": "On going" } },
      // Group by league id and select the latest season
      {
        $group: {
          _id: "$_id",
          league: { $first: "$league" },
          latestSeason: { $last: "$seasons" },
        },
      },
    ]);

    res.json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
