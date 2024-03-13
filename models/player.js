const mongoose = require("mongoose");
const { Schema } = mongoose;

const playerSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  number: Number,
  position: String,
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team",
  },
  appearances: Number,
  goals: Number,
  assists: Number,
  yellowCards: Number,
  redCards: Number,
  started: Number,
  playerofMatch: Number,
  cleanSheet: Number,
});

module.exports = mongoose.model("Player", playerSchema);
