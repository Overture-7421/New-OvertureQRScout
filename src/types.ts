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

export interface ScheduleEntry {
  scouterId: string;
  matchNumber: number;
  position: string;
  teamNumber: number;
}

export interface Schedule {
  eventName: string;
  matches: ScheduleEntry[];
}
