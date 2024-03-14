require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const leagueRouter = require("./routes/league");
const teamsRouter = require("./routes/teams");
const playerRouter = require("./routes/player");

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to database"));

app.use(express.json());

app.use("/api/v1/leagues", leagueRouter);
app.use("/api/v1/teams", teamsRouter);
app.use("/api/v1/players", playerRouter);

app.listen(3000, () => console.log("Server started"));