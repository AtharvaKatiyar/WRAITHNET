/**
 * Ghost Engine Types
 * 
 * Type definitions for the ghost state machine and trigger system
 * Requirements: 5.1, 5.2, 5.3, 14.3
 */

export enum GhostMode {
  WHISPERER = 'whisperer',
  POLTERGEIST = 'poltergeist',
  TRICKSTER = 'trickster',
  DEMON = 'demon'
}

export interface GhostState {
  currentMode: GhostMode;
  intensity: number; // 0-100
  lastInterventionTime: number; // Unix timestamp
  triggerHistory: TriggerEvent[];
}

export interface TriggerEvent {
  type: TriggerType;
  timestamp: number;
  data: any;
  resultingMode?: GhostMode;
}

export enum TriggerType {
  KEYWORD = 'keyword',
  SILENCE = 'silence',
  SENTIMENT = 'sentiment',
  TIME = 'time',
  NARRATIVE = 'narrative'
}

export interface Trigger {
  type: TriggerType;
  condition: any;
  action: GhostAction;
  priority: number;
}

export interface GhostAction {
  type: 'mode_transition' | 'send_message' | 'visual_effect' | 'schedule_event';
  targetMode?: GhostMode;
  message?: string;
  effect?: string;
  delay?: number;
}

export interface GhostMessage {
  id: string;
  mode: GhostMode;
  content: string;
  intensity: number;
  timestamp: string;
  effects?: string[];
}
