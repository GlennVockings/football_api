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

const seasonSchema = new Schema({
  year: String,
  status: String,
  teams: [
    {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
  ],
  fixtures: [fixturesSchema],
});

const leagueSchema = new Schema({
  league: String,
  years: [seasonSchema],
});

const League = mongoose.model("League", leagueSchema);
module.exports = { League };
