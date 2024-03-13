const mongoose = require("mongoose");
const { Schema } = mongoose;

const teamSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ground: [String],
  league: {
    type: Schema.Types.ObjectId,
    ref: "League",
  },
  players: [{ type: Schema.Types.ObjectId, ref: "Player" }],
});

module.exports = mongoose.model("Team", teamSchema);
