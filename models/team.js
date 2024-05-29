const mongoose = require("mongoose");
const { Schema } = mongoose;

const statsSchema = new Schema({
  goals: {
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
  cleanSheets: {
    type: Number,
    default: 0,
  },
});

const seasonSchema = new Schema({
  season: String,
  status: String,
  league: {
    type: Schema.Types.ObjectId,
    ref: "League",
  },
  players: [{ type: Schema.Types.ObjectId, ref: "Player" }],
  manager: String,
  stats: [statsSchema],
});

const teamSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ground: [String],
  seasons: [seasonSchema],
  parent: String,
  abbr: String,
});

module.exports = mongoose.model("Team", teamSchema);
