function generateFixtures(teams) {
  const numTeams = teams.length;
  const fixtures = [];
  const isOdd = numTeams % 2 !== 0;

  if (isOdd) {
    teams.push("Ghost Team");
  }

  const totalRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < totalRounds; round++) {
    const roundFixtures = [];
    for (let match = 0; match < matchesPerRound; match++) {
      const homeIndex = match;
      const awayIndex = (numTeams - 1 + match - round) % (numTeams - 1);
      const homeTeam = teams[homeIndex];
      const awayTeam = teams[awayIndex];
      if (homeTeam !== awayTeam) {
        roundFixtures.push({
          home: homeTeam,
          away: awayTeam,
          dateTime: "",
          venue: "",
          status: "",
          events: [],
        });
      }
    }
    fixtures.push(roundFixtures);

    teams.splice(1, 0, teams.pop());
  }

  return fixtures.flat();
}

function updateTableData(fixtures, table) {
  // resets the table stats
  for (let row in table) {
    table[row].played = 0;
    table[row].wins;
    table[row].loses;
    table[row].draws;
    table[row].for;
    table[row].against;
    table[row].points;
    table[row].yellowCards;
    table[row].redCards;
  }

  for (let fixture in fixtures) {
    const { home, away, score, events, status } = fixtures[fixture];

    if (status !== "completed") {
      continue;
    }

    const homeTable = table.find((row) => row.team.name === home);
    const awayTable = table.find((row) => row.team.name === away);

    homeTable.played++;
    homeTable.for = +score.home;
    homeTable.against = +score.away;
    awayTable.for = +score.away;
    awayTable.against = +score.home;

    if (score.home > score.away) {
      homeTable.wins++;
      homeTable.points = +3;
      awayTable.loses++;
    } else if (score.home < score.away) {
      homeTable.loses++;
      awayTable.wins++;
      awayTable.points = +3;
    } else {
      homeTable.draws++;
      homeTable.points = +1;
      awayTable.draws++;
      awayTable.points = +1;
    }

    for (let event in events) {
      switch (event.type) {
        case "goal":
          continue;
        case "yellowCard":
          if (event.team === home) {
            homeTable.yellowCards++;
          } else {
            awayTable.yellowCards++;
          }
        case "redCard":
          if (event.team === home) {
            homeTable.redCards++;
          } else {
            awayTable.redCards++;
          }
        default:
          continue;
      }
    }
  }

  return table;
}

module.exports = { generateFixtures, updateTableData };
