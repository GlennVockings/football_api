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

module.exports = generateFixtures;
