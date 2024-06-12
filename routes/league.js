const express = require("express");
const router = express.Router();
const League = require("../models/league");
const Team = require("../models/team");
const Player = require("../models/player");
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");
const { getLeague } = require("../middleware/getHelpers");
const { compareEvents, updatePlayerStats } = require("../helper/helpers");

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

    league.seasons.forEach((season) => {
      season.fixtures.sort((a, b) => {
        if (!a.dateTime && !b.dateTime) {
          return 0; // Both have no dateTime
        }
        if (!a.dateTime) {
          return 1; // a has no dateTime, push to bottom
        }
        if (!b.dateTime) {
          return -1; // b has no dateTime, push to bottom
        }
        const dateA = new Date(a.dateTime);
        const dateB = new Date(b.dateTime);
        return dateA - dateB;
      });
    });

    res.status(201).json(league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:leagueId/list", getLeague, async (req, res) => {
  try {
    const filteredSeason = res.league.seasons.find(
      (season) => season.status === "On going"
    );

    if (!filteredSeason) {
      // If no ongoing season is found, return an empty array of completed fixtures
      return res.status(200).json({ message: "No ongoing season found" });
    }

    const teams = await Team.find();
    const players = await Player.find().populate("seasons.stats.team", "name");

    const filteredTeams = teams.filter((team) => {
      const foundSeason = team.seasons.find(
        (season) => season.season === filteredSeason.season
      );
      return (
        foundSeason && foundSeason.league.toString() === req.params.leagueId
      );
    });

    // Extract the team names from filteredTeams
    const teamNames = filteredTeams.map((team) => team.name);

    // Filter players based on the filtered team names
    const filteredPlayers = players.filter((player) => {
      return player.seasons.some(
        (season) =>
          season.season === filteredSeason.season &&
          season.stats.some((stat) => teamNames.includes(stat.team.name))
      );
    });

    // Sort teams based on stats
    const topThreeGoals = filteredTeams
      .map((team) => {
        const foundSeason = team.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        return { team: team.name, stat: foundSeason.stats.goals };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    console.log(topThreeGoals);

    const topThreeYellowCards = filteredTeams
      .map((team) => {
        const foundSeason = team.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        return { team: team.name, stat: foundSeason.stats.yellowCards };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const topThreeRedCards = filteredTeams
      .map((team) => {
        const foundSeason = team.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        return { team: team.name, stat: foundSeason.stats.redCards };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const topThreeCleanSheets = filteredTeams
      .map((team) => {
        const foundSeason = team.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        return { team: team.name, stat: foundSeason.stats.cleanSheets };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    // Sort players based on stats
    const topThreePlayerGoals = filteredPlayers
      .map((player) => {
        const foundSeason = player.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        const foundStat = foundSeason.stats.find((stat) =>
          teamNames.includes(stat.team.name)
        );
        return {
          player: `${player.firstName} ${player.lastName}`,
          team: foundStat.team.name,
          stat: foundStat.goals,
        };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const topThreePlayerYellowCards = filteredPlayers
      .map((player) => {
        const foundSeason = player.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        const foundStat = foundSeason.stats.find((stat) =>
          teamNames.includes(stat.team.name)
        );
        return {
          player: `${player.firstName} ${player.lastName}`,
          team: foundStat.team.name,
          stat: foundStat.yellowCards,
        };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const topThreePlayerRedCards = filteredPlayers
      .map((player) => {
        const foundSeason = player.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        const foundStat = foundSeason.stats.find((stat) =>
          teamNames.includes(stat.team.name)
        );
        return {
          player: `${player.firstName} ${player.lastName}`,
          team: foundStat.team.name,
          stat: foundStat.redCards,
        };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const topThreePlayerCleanSheets = filteredPlayers
      .map((player) => {
        const foundSeason = player.seasons.find(
          (season) => season.season === filteredSeason.season
        );
        const foundStat = foundSeason.stats.find((stat) =>
          teamNames.includes(stat.team.name)
        );
        return {
          player: `${player.firstName} ${player.lastName}`,
          team: foundStat.team.name,
          stat: foundStat.cleanSheet,
        };
      })
      .sort((a, b) => b.stat - a.stat)
      .slice(0, 3);

    const summary = {
      season: filteredSeason.season,
      status: filteredSeason.status,
      fixtures: filteredSeason.fixtures,
      table: filteredSeason.table,
      teams: filteredSeason.teams,
      upcomingFixtures: filteredSeason.upcomingFixtures,
      completedFixtures: filteredSeason.completedFixtures,
      stats: {
        team: [
          { name: "Goals", stats: topThreeGoals },
          { name: "Yellow Cards", stats: topThreeYellowCards },
          { name: "Red Cards", stats: topThreeRedCards },
          { name: "Clean Sheets", stats: topThreeCleanSheets },
        ],
        player: [
          { name: "Goals", stats: topThreePlayerGoals },
          { name: "Yellow Cards", stats: topThreePlayerYellowCards },
          { name: "Red Cards", stats: topThreePlayerRedCards },
          { name: "Clean Sheets", stats: topThreePlayerCleanSheets },
        ],
      },
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

// adds fixtures to a season
router.patch(
  "/:leagueId/:seasonId/addFixtures",
  getLeague,
  async (req, res) => {
    const seasonId = req.params.seasonId;
    const { fixtures } = req.body;

    try {
      const seasonIndex = res.league.seasons.findIndex(
        (season) => season.id === seasonId
      );
      if (seasonIndex === -1) {
        return res.status(404).send("Season not found");
      }

      fixtures.forEach((fixture) => {
        res.league.seasons[seasonIndex].fixtures.push(fixture);
      });

      await res.league.save();

      res.status(201).json(res.league);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.patch("/:leagueId/:seasonId/editTable", getLeague, async (req, res) => {
  try {
    const seasonId = req.params.seasonId;

    const seasonIndex = res.league.seasons.findIndex(
      (season) => season.id === seasonId
    );
    if (seasonIndex === -1) {
      return res.status(404).send("Season not found");
    }

    res.league.seasons[seasonIndex].table = req.body;

    res.league.seasons[seasonIndex].table.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const goalDifferenceA = a.for - a.against;
      const goalDifferenceB = b.for - b.against;
      if (goalDifferenceB !== goalDifferenceA) {
        return goalDifferenceB - goalDifferenceA;
      }
      return a.team.name.localeCompare(b.team.name);
    });

    await res.league.save();

    res.status(200).json(res.league);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update a fixture
router.patch("/:leagueId/:seasonId/:fixtureId", getLeague, async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    const fixtureId = req.params.fixtureId;
    const updatedFixtureData = req.body;
    const promises = [];

    // if status isn't filled out then return error
    if (
      updatedFixtureData.status === "" ||
      updatedFixtureData.status === undefined
    ) {
      return res.status(500).json({ message: "No status" });
    }

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

    // if fixture isn't there then return an error to the user
    if (fixtureIndex === -1) {
      return res.status(404).send("Fixture not found");
    }

    // get the original fixture
    const originalFixture =
      res.league.seasons[seasonIndex].fixtures[fixtureIndex];

    // find the home and away table and team entries
    const homeTeam = await Team.findOne({
      name: updatedFixtureData.home,
    }).populate("seasons.players", "_id firstName lastName");
    const homeSeason = homeTeam.seasons.filter(
      (season) => season.season === res.league.seasons[seasonIndex].season
    );
    const awayTeam = await Team.findOne({
      name: updatedFixtureData.away,
    }).populate("seasons.players", "_id firstName lastName");
    const awaySeason = awayTeam.seasons.filter(
      (season) => season.season === res.league.seasons[seasonIndex].season
    );
    const homeTable = res.league.seasons[seasonIndex].table.find(
      (entry) => entry.team.name === updatedFixtureData.home
    );
    const awayTable = res.league.seasons[seasonIndex].table.find(
      (entry) => entry.team.name === updatedFixtureData.away
    );

    // handle the original status to make sure stats aren't duplicated
    switch (originalFixture.status) {
      case "TBC":
        break;
      case "upcoming":
        break;
      case "home walkover":
        homeTable.played--;
        awayTable.played--;

        homeTable.wins--;
        homeTable.points -= 3;
        awayTable.loses--;
        break;
      case "away walkover":
        homeTable.played--;
        awayTable.played--;

        awayTable.wins--;
        awayTable.points -= 3;
        homeTable.loses--;
        break;
      case "completed":
        homeTable.played--;
        awayTable.played--;
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
        break;
      default:
        break;
    }

    switch (updatedFixtureData.status) {
      case "TBC":
        break;
      case "upcoming":
        if (completedFixtureIndex === -1) {
          res.league.seasons[seasonIndex].completedFixtures.splice(
            updatedFixtureData,
            1
          );
        }
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
      case "home walkover":
        homeTable.played++;
        awayTable.played++;

        homeTable.wins++;
        homeTable.points += 3;
        awayTable.loses++;

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
      case "away walkover":
        homeTable.played++;
        awayTable.played++;

        awayTable.wins++;
        awayTable.points += 3;
        homeTable.loses++;

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
      case "completed":
        homeTable.played++;
        awayTable.played++;
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
            homeSeason[0].stats.cleanSheets++;
          }
        } else if (
          updatedFixtureData.score.home < updatedFixtureData.score.away
        ) {
          homeTable.loses++;
          awayTable.wins++;
          awayTable.points += 3;
          if (updatedFixtureData.score.home === 0) {
            awaySeason[0].stats.cleanSheets++;
          }
        } else {
          homeTable.draws++;
          homeTable.points++;
          awayTable.draws++;
          awayTable.points++;
        }

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

    const { addedEvents, removedEvents } = compareEvents(
      originalFixture.events,
      updatedFixtureData.events
    );

    let updatedPlayers = {};

    // loop through the added events and action the stats
    for (let event of addedEvents) {
      const splitNames = event.player.split(" ");

      if (updatedPlayers[event.player]) {
        // Update player stats from stored object
        updatePlayerStats(
          event,
          updatedPlayers[event.player],
          res.league.seasons[seasonIndex].season,
          homeSeason[0],
          awaySeason[0],
          true
        );
        continue;
      }

      // find the player
      const foundPlayer = await Player.findOne({
        firstName: splitNames[0],
        lastName: splitNames[1],
      }).populate("seasons.stats.team", "name");

      updatePlayerStats(
        event,
        foundPlayer,
        res.league.seasons[seasonIndex].season,
        homeSeason[0],
        awaySeason[0],
        true
      );

      updatedPlayers[event.player] = foundPlayer;
    }

    // loop through the removed events and action the stats
    for (let event of removedEvents) {
      const splitNames = event.player.split(" ");

      if (updatedPlayers[event.player]) {
        // Update player stats from stored object
        updatePlayerStats(
          event,
          updatedPlayers[event.player],
          res.league.seasons[seasonIndex].season,
          homeSeason[0],
          awaySeason[0],
          false
        );
        continue; // Skip to the next event
      }

      // find the player
      const foundPlayer = await Player.findOne({
        firstName: splitNames[0],
        lastName: splitNames[1],
      }).populate("seasons.stats.team", "name");

      updatePlayerStats(
        event,
        foundPlayer,
        res.league.seasons[seasonIndex].season,
        homeSeason[0],
        awaySeason[0],
        false
      );

      updatedPlayers[event.player] = foundPlayer;
    }

    for (const playerName in updatedPlayers) {
      promises.push(updatedPlayers[playerName].save());
    }

    promises.push(homeTeam.save());
    promises.push(awayTeam.save());

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

    res.league.seasons[seasonIndex].table.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const goalDifferenceA = a.for - a.against;
      const goalDifferenceB = b.for - b.against;
      if (goalDifferenceB !== goalDifferenceA) {
        return goalDifferenceB - goalDifferenceA;
      }
      return a.team.name.localeCompare(b.team.name);
    });

    promises.push(res.league.save());

    await Promise.all(promises);

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
