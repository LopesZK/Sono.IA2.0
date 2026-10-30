export type DriverState = 'awake' | 'drowsy' | 'asleep';

export type AlarmSoundType = 'shrill-buzzer' | 'emergency-siren' | 'two-tone' | 'pulsed-alarm';

export interface DriverMetrics {
  leftEyeOpen: number; // 0 (closed) to 1 (open)
  rightEyeOpen: number; // 0 (closed) to 1 (open)
  averageEyeOpen: number;
  isBlinking: boolean;
  eyesClosedDurationMs: number;
  yawnScore: number; // 0 to 1
  isYawning: boolean;
  headPitch: number; // degrees (negative = head down)
  headRoll: number; // degrees (tilt sideways)
  fatigueScore: number; // 0 (fresh) to 100 (exhausted)
  fps: number;
  faceDetected: boolean;
}

export interface DetectionSettings {
  sleepThresholdSeconds: number; // e.g. 1.2s of closed eyes = asleep
  drowsyThresholdSeconds: number; // e.g. 0.5s of closed eyes or repeated yawning = drowsy
  eyeSensitivity: number; // 0.15 to 0.45 (threshold under which eye is considered closed)
  yawnThreshold: number; // 0.45 to 0.8
  soundType: AlarmSoundType;
  voiceAlertsEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number; // 0.0 to 1.0
  facingMode: 'user' | 'environment';
  nightModeHUD: boolean;
}

export interface TripEvent {
  id: string;
  timestamp: number;
  type: 'drowsy' | 'asleep';
  durationMs: number;
  fatigueScore: number;
}

export interface TripSummary {
  startTime: number;
  endTime?: number;
  totalDrowsyCount: number;
  totalAsleepCount: number;
  events: TripEvent[];
}
