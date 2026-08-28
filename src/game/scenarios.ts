import { Scenario, Route } from '../types';

const defaultRoutes: Route[] = [
  { id: 'A', label: 'DIRECT', riskLevel: 'HIGH', batteryMultiplier: 0.85, description: 'Fastest path, high obstacle density.' },
  { id: 'B', label: 'SAFE', riskLevel: 'LOW', batteryMultiplier: 1.15, description: 'Longer path, minimal obstacles.' },
  { id: 'C', label: 'SHORTCUT', riskLevel: 'VERY_HIGH', batteryMultiplier: 0.70, description: 'Requires calibration > 80% to detect hidden obstacles.' },
];

export const OFFICIAL_SCENARIOS: Record<string, Scenario> = {
  SCENARIO_1: {
    scenarioId: 'SCENARIO_1',
    name: 'HEAVY LOAD',
    description: 'Transport heavy cargo through standard obstacles. Requires high motor power and careful battery management.',
    difficultyCoefficient: 1.00,
    payload: 'heavy',
    startingBattery: 70,
    sensorHealth: 1.0,
    parTime: 45,
    specialRules: [
      'Heavy Payload (-25% velocity penalty)',
      'Multiple Hazard Zones (Drain Health/Battery)',
      'Charging Zones available (Restores Battery)',
      'High motor torque required on inclines',
    ],
    obstacles: [
      { id: 'obs-1', type: 'static', x: 20, y: 30, width: 15, height: 8 },
      { id: 'obs-2', type: 'hazard', x: 40, y: 60, width: 25, height: 15 },
      { id: 'obs-3', type: 'static', x: 70, y: 25, width: 10, height: 10 },
      { id: 'obs-4', type: 'narrow', x: 80, y: 70, width: 8, height: 16 },
      { id: 'obs-charge', type: 'charging', x: 50, y: 20, width: 12, height: 12 },
      { id: 'obs-haz-2', type: 'hazard', x: 15, y: 50, width: 10, height: 10 },
      { id: 'obs-move-1', type: 'moving', x: 60, y: 50, width: 12, height: 6, movingCycleSeconds: 4 },
    ],
    routes: defaultRoutes,
  },

  SCENARIO_2: {
    scenarioId: 'SCENARIO_2',
    name: 'SENSOR FAILURE',
    description: 'Primary IR sensor is degraded. Detection range is halved. Precision braking and high sensor range/sensitivity required.',
    difficultyCoefficient: 1.10,
    payload: 'medium',
    startingBattery: 70,
    sensorHealth: 0.5, // 50% sensor range
    parTime: 50,
    specialRules: [
      'Damaged IR Sensor Array (50% range penalty)',
      'Medium Payload (-10% velocity penalty)',
      'Requires increased Sensor Sensitivity to compensate',
    ],
    obstacles: [
      { id: 'obs-1', type: 'static', x: 20, y: 25, width: 10, height: 10 },
      { id: 'obs-2', type: 'hidden', x: 50, y: 40, width: 12, height: 12 },
      { id: 'obs-3', type: 'static', x: 65, y: 75, width: 15, height: 15 },
    ],
    routes: defaultRoutes,
  },

  SCENARIO_3: {
    scenarioId: 'SCENARIO_3',
    name: 'LOW BATTERY EMERGENCY',
    description: 'Power cells start at 45%. Energy efficiency is critical to complete all three checkpoints before total shutdown.',
    difficultyCoefficient: 1.05,
    payload: 'medium',
    startingBattery: 45,
    sensorHealth: 1.0,
    parTime: 40,
    specialRules: [
      'Critical Battery Level (Starts at 45%)',
      'High penalty for over-powered motor/sensors',
      'Must maintain optimal speed-to-drain ratio',
    ],
    obstacles: [
      { id: 'obs-1', type: 'static', x: 30, y: 35, width: 10, height: 10 },
      { id: 'obs-2', type: 'static', x: 60, y: 55, width: 12, height: 12 },
      { id: 'obs-3', type: 'narrow', x: 75, y: 30, width: 8, height: 14 },
    ],
    routes: defaultRoutes,
  },

  SCENARIO_4: {
    scenarioId: 'SCENARIO_4',
    name: 'DYNAMIC ARENA',
    description: 'Moving automated security barriers and narrow corridor passes require agile steering and high brake response.',
    difficultyCoefficient: 1.15,
    payload: 'light',
    startingBattery: 70,
    sensorHealth: 1.0,
    parTime: 42,
    specialRules: [
      'Active Moving Obstacles (5s cycle)',
      'Narrow Passageway Corridor',
      'High steering response required',
    ],
    obstacles: [
      { id: 'obs-1', type: 'moving', x: 35, y: 30, width: 10, height: 20, movingCycleSeconds: 5, blockedWindowSeconds: 2 },
      { id: 'obs-2', type: 'narrow', x: 55, y: 60, width: 6, height: 20 },
      { id: 'obs-3', type: 'hidden', x: 75, y: 40, width: 10, height: 10 },
    ],
    routes: defaultRoutes,
  },

  SCENARIO_5: {
    scenarioId: 'SCENARIO_5',
    name: 'MINEFIELD RUSH',
    description: 'The arena is seeded with hidden proximity mines and static barriers. Fast-moving robot with ultra-high sensor sensitivity is the only path to victory.',
    difficultyCoefficient: 1.25,
    payload: 'light',
    startingBattery: 70,
    sensorHealth: 0.75,
    parTime: 38,
    specialRules: [
      'High Hidden Mine Density — sensitivity above 70% mandatory',
      'Light Payload allows maximum agility',
      'Tight par time rewards speed',
      '1.25× score multiplier for difficulty',
    ],
    obstacles: [
      { id: 'obs-1', type: 'hidden', x: 22, y: 60, width: 8, height: 8 },
      { id: 'obs-2', type: 'hidden', x: 40, y: 35, width: 8, height: 8 },
      { id: 'obs-3', type: 'static', x: 30, y: 20, width: 10, height: 8 },
      { id: 'obs-4', type: 'hidden', x: 58, y: 55, width: 8, height: 8 },
      { id: 'obs-5', type: 'hidden', x: 72, y: 30, width: 8, height: 8 },
      { id: 'obs-6', type: 'static', x: 60, y: 72, width: 12, height: 8 },
    ],
    routes: defaultRoutes,
  },

  SCENARIO_6: {
    scenarioId: 'SCENARIO_6',
    name: 'NIGHT OPS',
    description: 'Blackout conditions have crippled optical sensors to 30% capacity. Heavy reliance on sensor sensitivity and ultra-precise brake timing. Darkness favors the prepared.',
    difficultyCoefficient: 1.20,
    payload: 'medium',
    startingBattery: 70,
    sensorHealth: 0.30, // Severely degraded — only 30% sensor health
    parTime: 55,
    specialRules: [
      'Sensor Health: 30% (near-blackout conditions)',
      'Sensor Sensitivity must exceed 75% to detect threats',
      'Moving obstacles navigate in unpredictable patterns',
      'Medium payload reduces agility — plan steering carefully',
    ],
    obstacles: [
      { id: 'obs-1', type: 'moving', x: 28, y: 35, width: 12, height: 10, movingCycleSeconds: 4, blockedWindowSeconds: 2 },
      { id: 'obs-2', type: 'hidden', x: 48, y: 50, width: 10, height: 10 },
      { id: 'obs-3', type: 'moving', x: 62, y: 30, width: 10, height: 14, movingCycleSeconds: 6, blockedWindowSeconds: 3 },
      { id: 'obs-4', type: 'narrow', x: 78, y: 60, width: 6, height: 18 },
      { id: 'obs-5', type: 'hidden', x: 55, y: 70, width: 8, height: 8 },
    ],
    routes: defaultRoutes,
  },
};

export function getRoundRobinScenario(teamIndex: number): Scenario {
  const scenarioKeys = Object.keys(OFFICIAL_SCENARIOS);
  const key = scenarioKeys[teamIndex % scenarioKeys.length];
  return OFFICIAL_SCENARIOS[key];
}
