import type { Schedule, ScheduleEntry } from '../types';

export const parseScheduleFile = (content: string): Schedule | null => {
  try {
    const lines = content.split('\n').map(line => line.trim());
    let eventName = '';
    const matches: ScheduleEntry[] = [];

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Parse event name
      if (line.toLowerCase().startsWith('event:')) {
        eventName = line.substring(6).trim();
        continue;
      }

      // Parse schedule entries
      // Support comma, tab, or multiple spaces as separators
      const parts = line.split(/[,\t]+|\s{2,}/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 4) {
        const [scouterId, matchStr, position, teamStr] = parts;
        const matchNumber = parseInt(matchStr, 10);
        const teamNumber = parseInt(teamStr, 10);

        if (!isNaN(matchNumber) && !isNaN(teamNumber)) {
          matches.push({
            scouterId,
            matchNumber,
            position,
            teamNumber
          });
        }
      }
    }

    return {
      eventName: eventName || 'Unknown Event',
      matches
    };
  } catch (error) {
    console.error('Error parsing schedule file:', error);
    return null;
  }
};

export const getScouterMatches = (schedule: Schedule, scouterId: string): ScheduleEntry[] => {
  return schedule.matches.filter(
    match => match.scouterId.toLowerCase() === scouterId.toLowerCase()
  );
};

export const getUniqueScouterIds = (schedule: Schedule): string[] => {
  const ids = new Set(schedule.matches.map(m => m.scouterId));
  return Array.from(ids).sort();
};
