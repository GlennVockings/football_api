require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const leagueRouter = require("./routes/league");
const teamsRouter = require("./routes/teams");
const playerRouter = require("./routes/player");
const yearsRouter = require("./routes/year");
const loginRouter = require("./routes/login");
const summaryRouter = require("./routes/summary");
const statsRouter = require("./routes/stats");
const cors = require("cors");

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to database"));

app.use(express.json());

app.use(cors());

app.use("/api/v1/leagues", leagueRouter);
app.use("/api/v1/teams", teamsRouter);
app.use("/api/v1/players", playerRouter);
app.use("/api/v1/year", yearsRouter);
app.use("/api/v1/users", loginRouter);
app.use("/api/v1/summary", summaryRouter);
app.use("/api/v1/stats", statsRouter);

app.listen(5000, () => console.log("Server started"));
