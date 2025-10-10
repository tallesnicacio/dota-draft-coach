export type TimerType = 
  | 'power_rune' 
  | 'water_rune' 
  | 'wisdom_rune' 
  | 'roshan' 
  | 'aegis' 
  | 'neutral_items'
  | 'stack' 
  | 'pull'
  | 'tormentor'
  | 'day_night';

export interface GameTimer {
  id: string;
  type: TimerType;
  label: string;
  nextSpawn: number; // tempo em segundos
  interval?: number; // intervalo de respawn
  enabled: boolean;
  notifyBefore: number; // segundos antes de notificar
  category: 'runes' | 'objectives' | 'neutral' | 'farming' | 'cycle';
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  advanceWarning: number; // segundos de antecedência
}

export interface RoshanTimer {
  deathTime: number | null;
  minRespawn: number | null;
  maxRespawn: number | null;
  aegisExpiry: number | null;
}
