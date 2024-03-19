const Team = require("../models/team");
const League = require("../models/league");
const Player = require("../models/player");

async function getTeam(req, res, next) {
  let team;
  try {
    team = await Team.findById(req.params.teamId)
      .populate("seasons.league", "league")
      .populate("seasons.players", "firstName lastName");
    if (team == null) {
      return res.status(404).json({ message: "Cannot find team" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.team = team;
  next();
}

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

async function getPlayer(req, res, next) {
  let player;
  try {
    player = await Player.findById(req.params.playerId).populate(
      "seasons.stats.team",
      "name"
    );
    if (player == null) {
      return res.status(404).json({ message: "Cannot find player" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.player = player;
  next();
}

module.exports = { getTeam, getLeague, getPlayer };
