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

  const originalEventMap = new Map();
  const updatedEventMap = new Map();

  // Populate originalEventMap with the original events
  originalEvents.forEach((event) => {
    const key = `${event.type}-${event.player}-${event.team}-${event.time}`;
    originalEventMap.set(key, event);
  });

  // Populate updatedEventMap with the updated events
  updatedEvents.forEach((event) => {
    const key = `${event.type}-${event.player}-${event.team}-${event.time}`;
    updatedEventMap.set(key, event);
  });

  // Identify removed events
  originalEventMap.forEach((event, key) => {
    if (!updatedEventMap.has(key)) {
      removedEvents.push(event);
    }
  });

  // Identify added events
  updatedEventMap.forEach((event, key) => {
    if (!originalEventMap.has(key)) {
      addedEvents.push(event);
    }
  });

  return { addedEvents, removedEvents };
}

module.exports = { generateFixtures, compareEvents, capitalizeFirstLetter };
