function generateFixtures(teams) {
  const numTeams = teams.length;
  const fixtures = [];

  // Generate fixtures for each team
  for (let i = 0; i < numTeams; i++) {
    const homeTeam = teams[i];
    for (let j = i + 1; j < numTeams; j++) {
      const awayTeam = teams[j];
      fixtures.push({
        home: homeTeam,
        away: awayTeam,
        dateTime: "",
        venue: "",
        status: "",
        events: [],
      });
      fixtures.push({
        home: awayTeam,
        away: homeTeam,
        dateTime: "",
        venue: "",
        status: "",
        events: [],
      }); // Add the reverse fixture
    }
  }

  return fixtures;
}

function updateTableData(fixtures, table) {
  // Resets the table stats
  for (let row in table) {
    table[row].played = 0;
    table[row].wins = 0;
    table[row].loses = 0;
    table[row].draws = 0;
    table[row].for = 0;
    table[row].against = 0;
    table[row].points = 0;
    table[row].yellowCards = 0;
    table[row].redCards = 0;
    table[row].cleanSheets = 0;
  }

  // Update table data based on fixtures
  for (let fixture of fixtures) {
    const { home, away, score, events, status } = fixture;

    if (status !== "completed") {
      continue;
    }

    const homeTable = table.find((row) => row.team.name === home);
    const awayTable = table.find((row) => row.team.name === away);

    homeTable.played++;
    awayTable.played++;
    homeTable.for += +score.home;
    homeTable.against += +score.away;
    awayTable.for += +score.away;
    awayTable.against += +score.home;

    if (+score.home > +score.away) {
      homeTable.wins++;
      homeTable.points += 3;
      awayTable.loses++;
      if (+score.away === 0) {
        homeTeam.cleanSheets++;
      }
    } else if (+score.home < +score.away) {
      homeTable.loses++;
      awayTable.wins++;
      awayTable.points += 3;
      if (+score.home === 0) {
        awayTable.cleanSheets++;
      }
    } else {
      homeTable.draws++;
      homeTable.points++;
      awayTable.draws++;
      awayTable.points++;
    }

    for (let event of events) {
      switch (event.type) {
        case "goal":
          continue;
        case "yellowCard":
          if (event.team === home) {
            homeTable.yellowCards++;
          } else {
            awayTable.yellowCards++;
          }
          break;
        case "redCard":
          if (event.team === home) {
            homeTable.redCards++;
          } else {
            awayTable.redCards++;
          }
          break;
        default:
          continue;
      }
    }
  }

  // Sort table by points, goal difference, and then by highest 'for'
  table.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    const goalDifferenceA = a.for - a.against;
    const goalDifferenceB = b.for - b.against;
    if (goalDifferenceB !== goalDifferenceA) {
      return goalDifferenceB - goalDifferenceA;
    }
    return a.team.name.localeCompare(b.team.name);
  });

  return table;
}

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = { generateFixtures, updateTableData, capitalizeFirstLetter };
