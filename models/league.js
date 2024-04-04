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
  status: String,
  events: [eventSchema],
});

const tableSchema = new Schema({
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
  },
  played: Number,
  wins: Number,
  loses: Number,
  draws: Number,
  for: Number,
  against: Number,
  points: Number,
});

const seasonSchema = new Schema({
  season: String,
  status: String,
  fixtures: [fixturesSchema],
  table: [tableSchema],
});

const leagueSchema = new Schema({
  league: String,
  seasons: [seasonSchema],
});

module.exports = mongoose.model("League", leagueSchema);
