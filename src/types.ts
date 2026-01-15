export type FieldType = 'text' | 'number' | 'dropdown' | 'switch' | 'counter';

export interface FieldConfig {
  label: string;
  key: string;
  type: FieldType;
  options?: string[];
}

export interface Config {
  PREMATCH: FieldConfig[];
  AUTONOMOUS: FieldConfig[];
  TELEOP: FieldConfig[];
  ENDGAME: FieldConfig[];
}

export type Phase = 'PREMATCH' | 'AUTONOMOUS' | 'TELEOP' | 'ENDGAME';

export interface FormData {
  [key: string]: string | number | boolean;
}

// Schedule Types for Configuration System

export interface EventConfig {
  localLabel: string;
  tbaLabel: string;
  amountOfTeams: number;
  matchesPerTeam: number;
  totalMatches: number;
  teamsPerMatch: number;
  allianceBlue: string;
  allianceRed: string;
}

export interface Personnel {
  leadScouters: string[];
  scouters: string[];
  cameras: string[];
}

export interface Turn {
  turn: number;
  startMatch: number;
  endMatch: number;
}

export interface ShiftConfig {
  breakPoints: number[];
  turns: Turn[];
}

export interface MatchAssignment {
  position: string;
  scouter: string;
  teamNumber: number | null;
}

export interface MatchSchedule {
  matchNumber: number;
  leadScouter: string;
  camera: string;
  assignments: MatchAssignment[];
}

export interface GeneratedSchedule {
  event: EventConfig;
  personnel: Personnel;
  shifts: ShiftConfig;
  schedule: MatchSchedule[];
}

export interface ScouterTurnAssignment {
  turn: number;
  startMatch: number;
  endMatch: number;
  assignments: {
    matchNumber: number;
    position: string;
    teamNumber: number | null;
    leadScouter: string;
  }[];
}

export interface ScheduleConstraints {
  maxMatchesPerScouter: number | null; // null means no limit
}

export interface ScheduleValidationError {
  type: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface ScheduleGenerationResult {
  success: boolean;
  schedule: GeneratedSchedule | null;
  errors: ScheduleValidationError[];
  warnings: ScheduleValidationError[];
}
