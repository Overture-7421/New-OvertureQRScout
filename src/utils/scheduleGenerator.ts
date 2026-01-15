import type {
  EventConfig,
  Personnel,
  ShiftConfig,
  Turn,
  MatchSchedule,
  GeneratedSchedule,
  ScouterTurnAssignment,
  ScheduleConstraints,
  ScheduleValidationError,
  ScheduleGenerationResult
} from '../types';

const POSITIONS = ['Blue 1', 'Blue 2', 'Blue 3', 'Red 1', 'Red 2', 'Red 3'];

export const calculateTurns = (totalMatches: number, breakPoints: number[]): Turn[] => {
  const sortedBreaks = [...breakPoints].sort((a, b) => a - b).filter(bp => bp > 0 && bp < totalMatches);
  const turns: Turn[] = [];

  let startMatch = 1;
  sortedBreaks.forEach((breakPoint, index) => {
    turns.push({
      turn: index + 1,
      startMatch,
      endMatch: breakPoint
    });
    startMatch = breakPoint + 1;
  });

  // Add final turn
  turns.push({
    turn: turns.length + 1,
    startMatch,
    endMatch: totalMatches
  });

  return turns;
};

export const validateScheduleConfig = (
  eventConfig: EventConfig,
  personnel: Personnel,
  shiftConfig: ShiftConfig,
  constraints: ScheduleConstraints
): ScheduleValidationError[] => {
  const errors: ScheduleValidationError[] = [];
  const { totalMatches } = eventConfig;
  const { scouters, leadScouters, cameras } = personnel;
  const positionsPerMatch = POSITIONS.length;

  // Check minimum scouters
  if (scouters.length < positionsPerMatch) {
    errors.push({
      type: 'error',
      message: `Not enough scouters`,
      details: `Need at least ${positionsPerMatch} scouters to cover all positions, but only have ${scouters.length}.`
    });
  }

  // Check for empty names
  if (scouters.some(s => !s.trim())) {
    errors.push({
      type: 'error',
      message: 'Empty scouter names',
      details: 'All scouters must have a name.'
    });
  }

  if (leadScouters.length === 0) {
    errors.push({
      type: 'error',
      message: 'No lead scouters',
      details: 'At least one lead scouter is required.'
    });
  }

  if (cameras.length === 0) {
    errors.push({
      type: 'error',
      message: 'No camera operators',
      details: 'At least one camera operator is required.'
    });
  }

  // Check if max matches constraint is feasible
  if (constraints.maxMatchesPerScouter !== null) {
    const totalAssignmentsNeeded = totalMatches * positionsPerMatch;
    const maxPossibleAssignments = scouters.length * constraints.maxMatchesPerScouter;

    if (maxPossibleAssignments < totalAssignmentsNeeded) {
      errors.push({
        type: 'error',
        message: 'Max matches constraint cannot be satisfied',
        details: `Need ${totalAssignmentsNeeded} total assignments (${totalMatches} matches × ${positionsPerMatch} positions), but with ${scouters.length} scouters limited to ${constraints.maxMatchesPerScouter} matches each, can only cover ${maxPossibleAssignments} assignments. Either add more scouters or increase the max matches limit.`
      });
    }
  }

  // Check turns cover all matches
  const { turns } = shiftConfig;
  if (turns.length === 0) {
    errors.push({
      type: 'error',
      message: 'No turns defined',
      details: 'Schedule must have at least one turn.'
    });
  } else {
    const coveredMatches = new Set<number>();
    for (const turn of turns) {
      for (let i = turn.startMatch; i <= turn.endMatch; i++) {
        coveredMatches.add(i);
      }
    }

    for (let i = 1; i <= totalMatches; i++) {
      if (!coveredMatches.has(i)) {
        errors.push({
          type: 'error',
          message: 'Gaps in turn coverage',
          details: `Match ${i} is not covered by any turn.`
        });
        break;
      }
    }
  }

  return errors;
};

export const generateSchedule = (
  eventConfig: EventConfig,
  personnel: Personnel,
  shiftConfig: ShiftConfig,
  constraints: ScheduleConstraints = { maxMatchesPerScouter: null }
): ScheduleGenerationResult => {
  // Validate first
  const validationErrors = validateScheduleConfig(eventConfig, personnel, shiftConfig, constraints);
  const errors = validationErrors.filter(e => e.type === 'error');
  const warnings: ScheduleValidationError[] = validationErrors.filter(e => e.type === 'warning');

  if (errors.length > 0) {
    return {
      success: false,
      schedule: null,
      errors,
      warnings
    };
  }

  const { scouters, leadScouters, cameras } = personnel;
  const { turns } = shiftConfig;
  const { maxMatchesPerScouter } = constraints;

  const schedule: MatchSchedule[] = [];

  // Track match counts per scouter
  const scouterMatchCounts = new Map<string, number>();
  scouters.forEach(s => scouterMatchCounts.set(s, 0));

  // Track which position each scouter last had (for rotation)
  const scouterLastPosition = new Map<string, number>();
  scouters.forEach((s, i) => scouterLastPosition.set(s, i % POSITIONS.length));

  let leadScouterIndex = 0;
  let cameraIndex = 0;

  for (const turn of turns) {
    // Get lead scouter and camera for this turn
    const turnLeadScouter = leadScouters[leadScouterIndex % leadScouters.length] || '';
    const turnCamera = cameras[cameraIndex % cameras.length] || '';

    // Increment for next turn
    leadScouterIndex++;
    cameraIndex++;

    // Generate matches for this turn
    for (let matchNum = turn.startMatch; matchNum <= turn.endMatch; matchNum++) {
      const assignments: { position: string; scouter: string; teamNumber: number | null }[] = [];

      // For each position, find the best available scouter
      for (let posIndex = 0; posIndex < POSITIONS.length; posIndex++) {
        const position = POSITIONS[posIndex];

        // Find available scouters (those who haven't hit their limit)
        const availableScouters = scouters.filter(s => {
          const count = scouterMatchCounts.get(s) || 0;
          if (maxMatchesPerScouter !== null && count >= maxMatchesPerScouter) {
            return false;
          }
          // Also check if already assigned in this match
          return !assignments.some(a => a.scouter === s);
        });

        if (availableScouters.length === 0) {
          // This shouldn't happen if validation passed, but handle gracefully
          warnings.push({
            type: 'warning',
            message: `No available scouter for Match ${matchNum}, ${position}`,
            details: 'All scouters have reached their match limit or are already assigned.'
          });
          assignments.push({ position, scouter: '', teamNumber: null });
          continue;
        }

        // Sort by: 1) lowest match count, 2) different position than last time
        availableScouters.sort((a, b) => {
          const countA = scouterMatchCounts.get(a) || 0;
          const countB = scouterMatchCounts.get(b) || 0;

          // Primary: fewest matches
          if (countA !== countB) {
            return countA - countB;
          }

          // Secondary: prefer scouters who haven't scouted this position recently
          const lastPosA = scouterLastPosition.get(a) || 0;
          const lastPosB = scouterLastPosition.get(b) || 0;
          const diffA = lastPosA === posIndex ? 1 : 0;
          const diffB = lastPosB === posIndex ? 1 : 0;

          return diffA - diffB;
        });

        const selectedScouter = availableScouters[0];
        assignments.push({ position, scouter: selectedScouter, teamNumber: null });

        // Update tracking
        scouterMatchCounts.set(selectedScouter, (scouterMatchCounts.get(selectedScouter) || 0) + 1);
        scouterLastPosition.set(selectedScouter, posIndex);
      }

      const matchSchedule: MatchSchedule = {
        matchNumber: matchNum,
        leadScouter: turnLeadScouter,
        camera: turnCamera,
        assignments
      };

      schedule.push(matchSchedule);
    }
  }

  // Post-generation validation
  const unassignedPositions = schedule.flatMap(m =>
    m.assignments.filter(a => !a.scouter).map(a => `Match ${m.matchNumber} - ${a.position}`)
  );

  if (unassignedPositions.length > 0) {
    warnings.push({
      type: 'warning',
      message: `${unassignedPositions.length} positions left unassigned`,
      details: unassignedPositions.slice(0, 5).join(', ') + (unassignedPositions.length > 5 ? '...' : '')
    });
  }

  // Check workload balance
  const counts = Array.from(scouterMatchCounts.values());
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  if (maxCount - minCount > Math.ceil(eventConfig.totalMatches / scouters.length)) {
    warnings.push({
      type: 'warning',
      message: 'Uneven workload distribution',
      details: `Match counts range from ${minCount} to ${maxCount}. Consider adjusting constraints.`
    });
  }

  const generatedSchedule: GeneratedSchedule = {
    event: eventConfig,
    personnel,
    shifts: shiftConfig,
    schedule
  };

  return {
    success: true,
    schedule: generatedSchedule,
    errors: [],
    warnings
  };
};

export const getScouterAssignments = (
  generatedSchedule: GeneratedSchedule,
  scouterName: string
): ScouterTurnAssignment[] => {
  const { shifts, schedule } = generatedSchedule;
  const turnAssignments: ScouterTurnAssignment[] = [];

  for (const turn of shifts.turns) {
    const turnMatches = schedule.filter(
      m => m.matchNumber >= turn.startMatch && m.matchNumber <= turn.endMatch
    );

    const assignments: ScouterTurnAssignment['assignments'] = [];

    for (const match of turnMatches) {
      const scouterAssignment = match.assignments.find(
        a => a.scouter.toLowerCase() === scouterName.toLowerCase()
      );

      if (scouterAssignment) {
        assignments.push({
          matchNumber: match.matchNumber,
          position: scouterAssignment.position,
          teamNumber: scouterAssignment.teamNumber,
          leadScouter: match.leadScouter
        });
      }
    }

    if (assignments.length > 0) {
      turnAssignments.push({
        turn: turn.turn,
        startMatch: turn.startMatch,
        endMatch: turn.endMatch,
        assignments
      });
    }
  }

  return turnAssignments;
};

export const getAllScouterNames = (generatedSchedule: GeneratedSchedule): string[] => {
  return generatedSchedule.personnel.scouters;
};

export const exportToCSV = (generatedSchedule: GeneratedSchedule): string => {
  const headers = ['Match #', 'Lead Scouter', 'Camera', ...POSITIONS];
  const rows = [headers.join(',')];

  for (const match of generatedSchedule.schedule) {
    const row = [
      match.matchNumber.toString(),
      match.leadScouter,
      match.camera,
      ...match.assignments.map(a => a.scouter)
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
};

export const exportEventConfig = (generatedSchedule: GeneratedSchedule): string => {
  return JSON.stringify(generatedSchedule.event, null, 2);
};

export const exportPersonnel = (generatedSchedule: GeneratedSchedule): string => {
  return JSON.stringify(generatedSchedule.personnel, null, 2);
};

export const exportFullSchedule = (generatedSchedule: GeneratedSchedule): string => {
  return JSON.stringify(generatedSchedule, null, 2);
};

export const parseScheduleJSON = (jsonString: string): GeneratedSchedule | null => {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!parsed.event || !parsed.personnel || !parsed.shifts || !parsed.schedule) {
      console.error('Invalid schedule JSON structure');
      return null;
    }

    return parsed as GeneratedSchedule;
  } catch (error) {
    console.error('Error parsing schedule JSON:', error);
    return null;
  }
};

export const getScouterStats = (
  generatedSchedule: GeneratedSchedule
): Map<string, { totalMatches: number; positions: Map<string, number> }> => {
  const stats = new Map<string, { totalMatches: number; positions: Map<string, number> }>();

  for (const match of generatedSchedule.schedule) {
    for (const assignment of match.assignments) {
      if (!assignment.scouter) continue;

      if (!stats.has(assignment.scouter)) {
        stats.set(assignment.scouter, { totalMatches: 0, positions: new Map() });
      }

      const scouterStats = stats.get(assignment.scouter)!;
      scouterStats.totalMatches++;

      const posCount = scouterStats.positions.get(assignment.position) || 0;
      scouterStats.positions.set(assignment.position, posCount + 1);
    }
  }

  return stats;
};

export const getNextScouterForPosition = (
  generatedSchedule: GeneratedSchedule,
  currentMatchNumber: number,
  position: string
): string | null => {
  // Find the next match after the current one
  const nextMatch = generatedSchedule.schedule.find(m => m.matchNumber === currentMatchNumber + 1);
  if (!nextMatch) return null;

  // Find who is scouting the same position in the next match
  const nextAssignment = nextMatch.assignments.find(a => a.position === position);
  return nextAssignment?.scouter || null;
};

export const isLastMatchOfTurn = (
  generatedSchedule: GeneratedSchedule,
  matchNumber: number,
  scouterName: string
): { isLast: boolean; turnNumber: number | null } => {
  const assignments = getScouterAssignments(generatedSchedule, scouterName);

  for (const turnAssignment of assignments) {
    const lastAssignmentInTurn = turnAssignment.assignments[turnAssignment.assignments.length - 1];
    if (lastAssignmentInTurn && lastAssignmentInTurn.matchNumber === matchNumber) {
      return { isLast: true, turnNumber: turnAssignment.turn };
    }
  }

  return { isLast: false, turnNumber: null };
};
