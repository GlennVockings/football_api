const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const { getLeague } = require("../middleware/getHelpers");
const { compareEvents } = require("../helper/helpers");

// GET ROUTES

// get all fixtures
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find();

    res.status(200).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/league", async (req, res) => {
  try {
    const leagueName = req.query.name;

    function formatTitle(input) {
      return input
        .replace(/-/g, " ") // Replace hyphens with spaces
        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
    }

    const league = await League.find({
      league: formatTitle(leagueName),
    }).populate([
      { path: "seasons.table.team", model: "Team", select: "name" }, // Populating seasons.table.team with name
      { path: "seasons.teams", select: "name ground" }, // Populating teams array with name and ground fields
    ]);

    res.status(201).json(league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const leagues = await League.find().select("_id league");
    return res.status(201).json(leagues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId", async (req, res) => {
  try {
    let league = await League.findById(req.params.leagueId).populate([
      {
        path: "seasons.table.team",
        model: "Team",
        select: "name",
        populate: {
          path: "seasons.players",
          model: "Player",
          select: "firstName lastName number position",
        },
      },
      {
        path: "seasons.teams",
        select: "name ground seasons",
        populate: {
          path: "seasons.players",
          model: "Player",
          select: "firstName lastName number position",
        },
      },
    ]);

    res.status(201).json(league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId/list", getLeague, (req, res) => {
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

    let upcomingFixtures = filteredSeason.fixtures.filter(
      (fixture) => fixture.status !== "completed" && fixture.dateTime != ""
    );

    upcomingFixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    // Sort and extract top three teams for goals
    const topThreeGoals = filteredSeason.table
      .sort(
        (a, b) =>
          b.for - a.for ||
          (a.team && b.team && a.team.name.localeCompare(b.team.name))
      )
      .slice(0, 3)
      .map((team) => ({ team: team.team && team.team.name, stat: team.for }));

    // Sort and extract top three teams for yellow cards
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

    // Sort and extract top three teams for red cards
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

    // Sort and extract top three teams for clean sheets
    const topThreeCleanSheets = filteredSeason.table
      .sort(
        (a, b) =>
          b.cleanSheets - a.cleanSheets ||
          (a.team && b.team && a.team.name.localeCompare(b.team.name))
      )
      .slice(0, 3)
      .map((team) => ({
        team: team.team && team.team.name,
        stat: team.cleanSheets,
      }));

    const summary = {
      season: filteredSeason.season,
      status: filteredSeason.status,
      fixtures: filteredSeason.fixtures,
      table: filteredSeason.table,
      teams: filteredSeason.teams,
      upcomingFixtures: upcomingFixtures,
      completedFixtures: completedFixtures,
      slimTable: slimTable,
      stats: [
        { name: "Goals", stats: topThreeGoals },
        { name: "Yellow Cards", stats: topThreeYellowCards },
        { name: "Red Cards", stats: topThreeRedCards },
        { name: "Clean Sheets", stats: topThreeCleanSheets },
      ],
    };

    return res.status(200).json(summary);
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
router.patch("/:leagueId/:seasonId/:fixtureId", getLeague, async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    const fixtureId = req.params.fixtureId;
    const updatedFixtureData = req.body;
    const promises = [];

    // find the season index in the league
    const seasonIndex = res.league.seasons.findIndex(
      (season) => season.id === seasonId
    );
    if (seasonIndex === -1) {
      return res.status(404).send("League not found");
    }

    // find the fixture index in the season
    const fixtureIndex = res.league.seasons[seasonIndex].fixtures.findIndex(
      (fixture) => fixture.id === fixtureId
    );
    const upcomingFixtureIndex = res.league.seasons[
      seasonIndex
    ].upcomingFixtures.findIndex((fixture) => fixture.id === fixtureId);
    const completedFixtureIndex = res.league.seasons[
      seasonIndex
    ].completedFixtures.findIndex((fixture) => fixture.id === fixtureId);

    // if fixture it's there then return an error to the user
    if (fixtureIndex === -1) {
      return res.status(404).send("Fixture not found");
    }

    // original fixture
    const originalFixture =
      res.league.seasons[seasonIndex].fixtures[fixtureIndex];

    // find the home and away table and team entries
    const homeTeam = await Team.findOne({ name: updatedFixtureData.home });
    const homeSeason = homeTeam.seasons.filter(
      (season) => season.season === res.league.seasons[seasonIndex].season
    );
    const awayTeam = await Team.findOne({ name: updatedFixtureData.away });
    const awaySeason = awayTeam.seasons.filter(
      (season) => season.season === res.league.seasons[seasonIndex].season
    );
    const homeTable = res.league.seasons[seasonIndex].table.find(
      (entry) => entry.team.name === updatedFixtureData.home
    );
    const awayTable = res.league.seasons[seasonIndex].table.find(
      (entry) => entry.team.name === updatedFixtureData.away
    );

    // if original fixture was already completed then remove the added stats
    if (originalFixture.status === "completed") {
      homeTable.for -= originalFixture.score.home;
      homeTable.against -= originalFixture.score.away;
      awayTable.for -= originalFixture.score.away;
      awayTable.against -= originalFixture.score.home;

      if (originalFixture.score.home > originalFixture.score.away) {
        homeTable.wins--;
        homeTable.points -= 3;
        awayTable.loses--;
      } else if (originalFixture.score.home < originalFixture.score.away) {
        homeTable.loses--;
        awayTable.wins--;
        awayTable.points -= 3;
      } else {
        homeTable.draws--;
        homeTable.points--;
        awayTable.draws--;
        awayTable.points--;
      }
    }

    // if fixture wasn't already completed then add one to played
    if (originalFixture.status !== "completed") {
      homeTable.played++;
      awayTable.played++;
    }

    // add the completed fixture stats
    homeTable.for += updatedFixtureData.score.home;
    homeTable.against += updatedFixtureData.score.away;
    awayTable.for += updatedFixtureData.score.away;
    awayTable.against += updatedFixtureData.score.home;

    homeSeason[0].stats.goals += updatedFixtureData.score.home;
    awaySeason[0].stats.goals += updatedFixtureData.score.away;

    if (updatedFixtureData.score.home > updatedFixtureData.score.away) {
      homeTable.wins++;
      homeTable.points += 3;
      awayTable.loses++;
      if (updatedFixtureData.score.away === 0) {
        homeSeason.stats.cleanSheets++;
      }
    } else if (updatedFixtureData.score.home < updatedFixtureData.score.away) {
      homeTable.loses++;
      awayTable.wins++;
      awayTable.points += 3;
      if (updatedFixtureData.score.home === 0) {
        awaySeason.stats.cleanSheets++;
      }
    } else {
      homeTable.draws++;
      homeTable.points++;
      awayTable.draws++;
      awayTable.points++;
    }

    // TODO: workout what to do if the events have changed
    const { addedEvents, removedEvents } = compareEvents(
      originalFixture.events,
      updatedFixtureData.events
    );

    console.log(addedEvents);

    // loop through the added events and action the stats
    for (let event of addedEvents) {
      const splitNames = event.player.split(" ");
      // find the player
      const foundPlayer = await Player.findOne({
        firstName: splitNames[0],
        lastName: splitNames[1],
      }).populate("seasons.stats.team", "name");
      // pull out the right season and stats
      const playerSeason = foundPlayer.seasons.find(
        (season) => season.season === res.league.seasons[seasonIndex].season
      );
      const playerStat = playerSeason.stats.find(
        (stat) => stat.team.name === event.team
      );

      // log the event to the apropriate stat
      switch (event.type) {
        case "yellowCard":
          playerStat.yellowCards++;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.yellowCards++;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.yellowCards++;
          }
          break;
        case "redCard":
          playerStat.redCards++;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.redCards++;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.redCards++;
          }
          break;
        case "cleanSheet":
          playerStat.cleanSheet++;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.cleanSheets++;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.cleanSheets++;
          }
          break;
        case "goal":
          playerStat.goals++;
          break;
        case "mom":
          playerStat.playerofMatch++;
          break;
        case "assist":
          playerStat.assists++;
          break;
      }
      // promises.push(foundPlayer.save());
    }

    // loop through the removed events and action the stats
    for (let event of removedEvents) {
      const splitNames = event.player.split(" ");
      // find the player
      const foundPlayer = await Player.findOne({
        firstName: splitNames[0],
        lastName: splitNames[1],
      }).populate("seasons.stats.team", "name");
      // pull out the right season and stats
      const playerSeason = foundPlayer.seasons.find(
        (season) => season.season === res.league.seasons[seasonIndex].season
      );
      const playerStat = playerSeason.stats.find(
        (stat) => stat.team.name === event.team
      );

      // log the event to the apropriate stat
      switch (event.type) {
        case "yellowCard":
          playerStat.yellowCards--;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.yellowCards--;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.yellowCards--;
          }
          break;
        case "redCard":
          playerStat.redCards--;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.redCards--;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.redCards--;
          }
          break;
        case "cleanSheet":
          playerStat.cleanSheet--;
          if (event.team === homeTeam.name) {
            homeSeason[0].stats.cleanSheets--;
          }
          if (event.team === awayTeam.name) {
            awaySeason[0].stats.cleanSheets--;
          }
          break;
        case "goal":
          playerStat.goals--;
          break;
        case "mom":
          playerStat.playerofMatch--;
          break;
        case "assist":
          playerStat.assists--;
          break;
      }
      // promises.push(foundPlayer.save());
    }

    // promises.push(homeTeam.save());
    // promises.push(awayTeam.save());

    // update the fixture in the upcoming or completed fixtures array
    switch (updatedFixtureData.status) {
      case "upcoming":
        if (upcomingFixtureIndex === -1) {
          res.league.seasons[seasonIndex].upcomingFixtures.push(
            updatedFixtureData
          );
        } else {
          res.league.seasons[seasonIndex].upcomingFixtures[
            upcomingFixtureIndex
          ] = updatedFixtureData;
        }
        break;
      case "completed":
        if (upcomingFixtureIndex !== -1) {
          res.league.seasons[seasonIndex].upcomingFixtures.splice(
            upcomingFixtureIndex,
            1
          );
        }
        if (completedFixtureIndex === -1) {
          res.league.seasons[seasonIndex].completedFixtures.push(
            updatedFixtureData
          );
        } else {
          res.league.seasons[seasonIndex].completedFixtures[
            completedFixtureIndex
          ] = updatedFixtureData;
        }
        break;
      case "postponed":
        if (upcomingFixtureIndex !== -1) {
          res.league.seasons[seasonIndex].upcomingFixtures.splice(
            upcomingFixtureIndex,
            1
          );
        }
        const newFixture = {
          _id: new mongoose.Types.ObjectId(), // Assign a new _id
          home: originalFixture.home,
          away: originalFixture.away,
          dateTime: "",
          venue: originalFixture.venue,
          score: {
            home: 0,
            away: 0,
          },
          status: "TBC", // Set status to TBC
        };
        res.league.seasons[seasonIndex].fixtures.push(newFixture);
        break;
      default:
        break;
    }

    // update the fixture
    res.league.seasons[seasonIndex].fixtures[fixtureIndex] = updatedFixtureData;

    // sort out the fixtures by date
    res.league.seasons[seasonIndex].fixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    res.league.seasons[seasonIndex].upcomingFixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    res.league.seasons[seasonIndex].completedFixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });

    // promises.push(res.league.save());

    // await Promise.all(promises);

    res.status(201).json(res.league);
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
