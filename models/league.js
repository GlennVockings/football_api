const mongoose = require("mongoose");
const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    type: String,
    player: String,
    team: String,
  },
  { _id: false }
);

const fixturesSchema = new Schema({
  home: {
    type: String,
    required: true,
  },
  away: {
    type: String,
    required: true,
  },
  dateTime: String,
  venue: String,
  status: {
    type: String,
    default: "TBC",
  },
  score: {
    home: Number,
    away: Number,
  },
  events: [eventSchema],
});

const tableSchema = new Schema({
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
  },
  played: {
    type: Number,
    default: 0,
  },
  wins: {
    type: Number,
    default: 0,
  },
  loses: {
    type: Number,
    default: 0,
  },
  draws: {
    type: Number,
    default: 0,
  },
  for: {
    type: Number,
    default: 0,
  },
  against: {
    type: Number,
    default: 0,
  },
  points: {
    type: Number,
    default: 0,
  },
});

const seasonSchema = new Schema({
  season: String,
  status: String,
  fixtures: [fixturesSchema],
  upcomingFixtures: [fixturesSchema],
  completedFixtures: [fixturesSchema],
  table: [tableSchema],
  teams: [
    {
      team: {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
      goals: {
        type: Number,
        default: 0,
      },
      cleanSheets: {
        type: Number,
        default: 0,
      },
      yellowCards: {
        type: Number,
        default: 0,
      },
      redCards: {
        type: Number,
        default: 0,
      },
    },
  ],
});

const leagueSchema = new Schema({
  league: String,
  seasons: [seasonSchema],
});

module.exports = mongoose.model("League", leagueSchema);
