/**
 * MATLAB-MechControl - Core Type Definitions
 */

export type PayloadType = 'light' | 'medium' | 'heavy';

export interface RobotConfig {
  speed: number;             // 0 - 100
  motorPower: number;        // 0 - 100
  sensorRange: number;       // 0 - 100
  steering: number;          // 0 - 100
  sensorSensitivity: number; // 0 - 100
  brakeStrength: number;     // 0 - 100
}

export type SensorType = 'front' | 'frontLeft' | 'frontRight' | 'left' | 'right' | 'battery' | 'speed' | 'target_is_left' | 'target_is_right' | 'target_is_front';
export type RuleOperator = '<' | '>' | '==' | '<=' | '>=';
export type RuleAction = 'BRAKE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'ACCELERATE' | 'REVERSE' | 'REDUCE_SPEED' | 'INCREASE_SPEED';

export interface ControlRule {
  id: string;
  condition: {
    sensor: SensorType;
    operator: RuleOperator;
    value: number;
  };
  action: RuleAction;
  priority: number;
}

export interface SensorReading {
  front: number;      // meters
  frontLeft: number;
  frontRight: number;
  left: number;
  right: number;
  target_is_left: number; // 0 or 1
  target_is_right: number; // 0 or 1
  target_is_front: number; // 0 or 1
  raw: { front: number; frontLeft: number; frontRight: number; left: number; right: number };
}

export interface CalibrationState {
  gainA: number;       // IR Array A gain (ideal: 1.8–2.2)
  gainB: number;       // IR Array B gain (ideal: 1.8–2.2)
  noiseFloor: number;  // Filter threshold (ideal: 20–30mV)
  freqAlign: number;   // Frequency offset Hz (ideal: -5 to +5)
  faultType?: 'OFFSET' | 'GAIN_DRIFT' | 'NOISE_SPIKE' | 'FREQ_SHIFT' | 'STEERING_LAG' | 'BATTERY_DRAIN' | 'MOTOR_LOSS';
  faultSeverity?: number; // 0.0 to 1.0
}

export interface Route {
  id: string;
  label: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  description?: string;
  batteryMultiplier?: number;
}



export type ObstacleType = 'static' | 'moving' | 'hidden' | 'narrow' | 'charging' | 'hazard';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;          // Arena grid position (0 to 100)
  y: number;          // Arena grid position (0 to 100)
  width: number;
  height: number;
  movingCycleSeconds?: number;
  blockedWindowSeconds?: number;
  isCurrentlyBlocking?: boolean;
  batteryChargeRate?: number; // for charging zones
  hazardDamage?: number;      // for hazard zones
}

export interface Scenario {
  scenarioId: string;
  name: string;
  description: string;
  difficultyCoefficient: number;
  payload: PayloadType;
  startingBattery: number; // e.g. 70 or 45
  sensorHealth: number;    // 1.0 = normal, 0.5 = damaged
  obstacles: Obstacle[];
  specialRules: string[];
  parTime: number;         // seconds for standard completion
  routes?: Route[];
}

export interface SimulationTick {
  tick: number;
  timeSeconds: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  battery: number;
  checkpointIndex: number; // 0: Start, 1: Navigation, 2: Pickup, 3: Delivery
  hasPayload: boolean;
  eventMsg?: string;
  isCollision?: boolean;
  sensorDistance: number;
  steeringAngle: number;
  collisions: number;
  sensors?: SensorReading;
  activeRuleId?: string;
}

export interface CollisionRecord {
  tick: number;
  timeSeconds: number;
  obstacleId: string;
  obstacleType: ObstacleType;
  x: number;
  y: number;
  detectionDistance: number;
  requiredStoppingDistance: number;
}

export interface FailureAnalysis {
  hasCollision: boolean;
  hasDepletedBattery: boolean;
  collisionDetails?: CollisionRecord;
  detectionDistance: number;
  requiredStoppingDistance: number;
  problemSummary: string;
  likelyCauses: string[];
  engineeringInsights: string[];
}

export interface ScoreBreakdown {
  navCheckpointPoints: number;      // Max 15
  pickupCheckpointPoints: number;   // Max 15
  deliveryCheckpointPoints: number; // Max 10
  timeScore: number;                // Max 20
  batteryScore: number;             // Max 15
  accuracyScore: number;            // Max 15
  configEfficiency: number;         // Max 10
  collisionPenalty: number;         // -5 per collision
  baseScore: number;                // Unclamped sum
  difficultyCoeff: number;
  normalizedScore: number;          // Final Score
}

export interface RunResult {
  runType: 'STAGE_4' | 'STAGE_6' | 'OFFICIAL';
  config: RobotConfig;
  scenarioId: string;
  completed: boolean;
  completionTimeSeconds: number;
  batteryRemaining: number;
  collisionCount: number;
  checkpointsReached: number; // 0 to N
  scoreBreakdown?: ScoreBreakdown;
  finalScore?: number;
  failureAnalysis?: FailureAnalysis;
  ticks: SimulationTick[];
  healthRemaining: number;
}

export type GamePhase =
  | 'LOBBY'
  | 'MISSION_BRIEF'
  | 'STAGE_1_CALIBRATION'
  | 'STAGE_2_CONFIG'
  | 'STAGE_3_LOGIC'
  | 'STAGE_4_NAV_RUNNING'
  | 'STAGE_4_NAV_RESULTS'
  | 'STAGE_5_DIAGNOSIS'
  | 'STAGE_6_ADVANCED_RUNNING'
  | 'STAGE_6_ADVANCED_RESULTS'
  | 'OFFICIAL_CONFIG'
  | 'OFFICIAL_RUNNING'
  | 'OFFICIAL_RESULTS'
  | 'FINAL_SCORE'
  | 'LEADERBOARD';

export interface Team {
  teamId: string;
  teamName: string;
  stationId: string; // 'Station 1' | 'Station 2' | etc.
  scenarioId: string;
  currentPhase: GamePhase;
  config: RobotConfig;
  controlRules: ControlRule[]; // New array for rules
  calibrationState?: CalibrationState;
  
  // Stages results
  stage4Result?: RunResult;
  stage6Result?: RunResult;
  officialResult?: RunResult;
  
  finalScore?: number;
  isConnected: boolean;
  robotHealth: number; // 100 max
  hardwarePoints: number; // Replaces repairKits for Stage 2
  repairKits: number; // Still used for diagnostics Stage 5
  logicTests: number;
  calibrationAttempts: number;

  // Calibration Phase 1
  calibrationProgress?: number; // 0-100% for Phase 1
  irLeftGain?: number;
  irRightGain?: number;
  noiseFilterOffset?: number;
  frequencyOffset?: number;
  calibrationQuality?: number; // 0.0 to 1.0 multiplier
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  stationId: string;
  score: number;
  completionTime: number;
  batteryRemaining: number;
  collisions: number;
  scenarioName: string;
  normalizedScore: number;
}

export interface ServerGameState {
  teams: Record<string, Team>;
  leaderboard: LeaderboardEntry[];
  activeStationId: string;
  eventTimeSeconds: number;
  isPaused: boolean;
  masterLogs: Array<{ timestamp: string; type: 'info' | 'warn' | 'error' | 'success'; message: string }>;
  hostPin?: string; // Optional/internal server side only, never emitted
}
