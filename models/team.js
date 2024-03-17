const mongoose = require("mongoose");
const { Schema } = mongoose;

const seasonSchema = new Schema({
  season: String,
  status: String,
  league: {
    type: Schema.Types.ObjectId,
    ref: "League",
  },
  players: [{ type: Schema.Types.ObjectId, ref: "Player" }],
});

const teamSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ground: [String],
  seasons: [seasonSchema],
});

module.exports = mongoose.model("Team", teamSchema);
