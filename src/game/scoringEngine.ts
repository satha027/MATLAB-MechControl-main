import { RunResult, Scenario, ScoreBreakdown } from '../types';
import { GAME_CONSTANTS } from './constants';

export function calculateScore(result: RunResult, scenario: Scenario, calibrationQuality: number = 1.0): ScoreBreakdown {
  const { checkpointsReached, completionTimeSeconds, batteryRemaining, collisionCount, completed, ticks } = result;

  // 1. Checkpoint Points (30 pts max)
  const navCheckpointPoints = checkpointsReached >= 1 ? 10 : 0;
  const pickupCheckpointPoints = checkpointsReached >= 2 ? 10 : 0;
  const deliveryCheckpointPoints = checkpointsReached >= 3 ? 10 : 0;

  // 2. Time Score (Max 20)
  const parTime = scenario.parTime || 45;
  let timeScore = 0;
  if (completionTimeSeconds > 0) {
    const timeRatio = parTime / completionTimeSeconds;
    timeScore = Math.min(20, Math.max(0, Math.round(timeRatio * 20)));
  }

  // 3. Battery Score (Max 15)
  const startingBattery = scenario.startingBattery || 70;
  const batteryRatio = Math.min(1.0, Math.max(0.0, batteryRemaining / startingBattery));
  const batteryScore = Math.round(15 * batteryRatio);

  // 4. Accuracy Score (Max 15, reduces with collisions)
  const accuracyScore = Math.max(0, 15 - collisionCount * 5);

  // 5. Calibration Quality (Max 10)
  const calibrationScore = Math.round(calibrationQuality * 10);

  // 6. Control Logic (Max 10) - based on active rules used
  const uniqueRulesFired = new Set(ticks.filter(t => t.activeRuleId).map(t => t.activeRuleId)).size;
  const configEfficiency = Math.min(10, uniqueRulesFired * 5); // 5 pts per rule, max 10

  // 7. Collision Penalty (-8 per collision)
  const collisionPenalty = collisionCount * 8;

  const rawSum =
    navCheckpointPoints +
    pickupCheckpointPoints +
    deliveryCheckpointPoints +
    timeScore +
    batteryScore +
    accuracyScore +
    calibrationScore +
    configEfficiency -
    collisionPenalty;

  const baseScore = Math.max(0, rawSum);

  const difficultyCoeff = scenario.difficultyCoefficient || 1.0;
  const normalizedScore = Math.min(100, Math.round(baseScore * difficultyCoeff));

  return {
    navCheckpointPoints,
    pickupCheckpointPoints,
    deliveryCheckpointPoints,
    timeScore,
    batteryScore,
    accuracyScore,
    configEfficiency, // overloaded to mean logic score
    collisionPenalty,
    baseScore,
    difficultyCoeff,
    normalizedScore,
  };
}

export function compareLeaderboardEntries(
  a: { score: number; batteryRemaining: number; collisions: number; completionTime: number },
  b: { score: number; batteryRemaining: number; collisions: number; completionTime: number }
): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.batteryRemaining !== a.batteryRemaining) return b.batteryRemaining - a.batteryRemaining;
  if (a.collisions !== b.collisions) return a.collisions - b.collisions;
  return a.completionTime - b.completionTime;
}
