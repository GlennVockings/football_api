const mongoose = require("mongoose");
const { Schema } = mongoose;

const yearSchema = new Schema({
  year: String,
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
  years: [yearSchema],
});

module.exports = mongoose.model("Team", teamSchema);
