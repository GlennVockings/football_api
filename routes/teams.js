const express = require("express");
const router = express.Router();
const Team = require("../models/team");
const { League } = require("../models/league");

// Gets all teams
router.get("/", async (req, res) => {
  try {
    // Extract the name query parameter from the request
    const teamNameParam = req.query.name;

    // Decode the URL-encoded query parameter
    const teamName = teamNameParam;

    // Perform a case-insensitive search for teams with matching names
    const teams = await Team.find({
      name: { $regex: new RegExp(teamName, "i") },
    }).populate("league", "league");

    // Return the matching teams
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get specific team
router.get("/:teamId", getTeam, async (req, res) => {
  try {
    const teamName = res.team.name;

    // Aggregate to find fixtures where the team is either home or away
    const fixtures = await League.aggregate([
      { $unwind: "$years" },
      { $unwind: "$years.fixtures" },
      {
        $match: {
          $and: [
            {
              $or: [
                { "years.fixtures.home": teamName },
                { "years.fixtures.away": teamName },
              ],
            },
            { "years.status": "On going" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          fixtures: { $push: "$years.fixtures" },
        },
      },
      { $project: { _id: 0 } },
    ]);

    res.status(201).json({
      team: res.team,
      fixtures: fixtures.length ? fixtures[0].fixtures : [],
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// updates team
router.patch("/:teamId", async (req, res) => {
  const updatedTeamData = req.body;

  try {
    await Team.findByIdAndUpdate(req.params.teamId, updatedTeamData);

    res.status(201).json(updatedTeamData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// add a new team
router.post("/", async (req, res) => {
  const { name, ground, league, players } = req.body;
  const status = "On going";

  try {
    let existingTeam = await Team.findOne({ name });

    if (existingTeam) {
      res.status(400).json({
        message: "This team already exists",
      });
    } else {
      const foundLeague = await League.findById(league);

      if (!foundLeague) {
        return res.status(400).json({
          message: "League not found",
        });
      }

      const currentYear = foundLeague.years.find(
        (year) => year.status === status
      );

      const team = new Team({
        name,
        ground,
        league: foundLeague._id,
        players,
      });

      // Save the team
      await team.save();

      // Push the team ID to the league's teams array
      currentYear.teams.push(team._id);

      await foundLeague.save();

      res.status(201).json(team);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE ROUTES

// delete a team
router.delete("/:teamId", async (req, res) => {
  try {
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
      .populate("league", "league")
      .populate("players", "firstName lastName");
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
