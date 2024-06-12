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

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function compareEvents(originalEvents, updatedEvents) {
  const addedEvents = [];
  const removedEvents = [];

  // Create copies of the original events to track unmatched events
  const unmatchedOriginalEvents = [...originalEvents];

  // Identify added events and remove matched original events
  updatedEvents.forEach((updatedEvent) => {
    const originalIndex = unmatchedOriginalEvents.findIndex(
      (originalEvent) =>
        originalEvent.type === updatedEvent.type &&
        originalEvent.player === updatedEvent.player &&
        originalEvent.team === updatedEvent.team &&
        originalEvent.time === updatedEvent.time
    );

    if (originalIndex === -1) {
      addedEvents.push(updatedEvent);
    } else {
      // Remove matched original event to prevent it from being marked as removed
      unmatchedOriginalEvents.splice(originalIndex, 1);
    }
  });

  // All remaining unmatched original events are considered removed
  unmatchedOriginalEvents.forEach((event) => {
    removedEvents.push(event);
  });

  return { addedEvents, removedEvents };
}

function updatePlayerStats(event, player, seasonName, home, away, toAdd) {
  // Pull out the right season and stats
  const playerSeason = player.seasons.find(
    (season) => season.season === seasonName
  );
  const playerStat = playerSeason.stats.find(
    (stat) => stat.team.name === event.team
  );

  const isHome = home.players.some((player) => {
    const split = event.player.split(" ");
    return player.firstName === split[0] && player.lastName === split[1];
  });

  // Log the event to the appropriate stat
  switch (event.type) {
    case "yellowCard":
      toAdd ? playerStat.yellowCards++ : playerStat.yellowCards--;
      if (isHome) {
        toAdd ? home.stats.yellowCards++ : home.stats.yellowCards--;
      } else {
        toAdd ? away.stats.yellowCards++ : away.stats.yellowCards--;
      }
      break;
    case "redCard":
      toAdd ? playerStat.redCards++ : playerStat.redCards--;
      if (isHome) {
        toAdd ? home.stats.redCards++ : home.stats.redCards--;
      } else {
        toAdd ? away.stats.redCards++ : away.stats.redCards--;
      }
      break;
    case "cleanSheet":
      toAdd ? playerStat.cleanSheets++ : playerStat.cleanSheets--;
      if (isHome) {
        toAdd ? home.stats.cleanSheets++ : home.stats.cleanSheets--;
      } else {
        toAdd ? away.stats.cleanSheets++ : away.stats.cleanSheets--;
      }
      break;
    case "goal":
      toAdd ? playerStat.goals++ : playerStat.goals--;
      break;
    case "mom":
      toAdd ? playerStat.playerofMatch++ : playerStat.playerofMatch--;
      break;
    case "assist":
      toAdd ? playerStat.assists++ : playerStat.assists--;
      break;
    case "appearance":
      toAdd ? playerStat.appearances++ : playerStat.appearances--;
      break;
  }
}

module.exports = {
  generateFixtures,
  compareEvents,
  capitalizeFirstLetter,
  updatePlayerStats,
};
