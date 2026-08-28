import {
  RobotConfig,
  Scenario,
  SimulationTick,
  CollisionRecord,
  FailureAnalysis,
  RunResult,
  Obstacle,
  ControlRule,
  SensorReading,
  RuleAction
} from '../types';
import { GAME_CONSTANTS } from './constants';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function wrapAngle(rad: number): number {
  while (rad > Math.PI) rad -= 2 * Math.PI;
  while (rad < -Math.PI) rad += 2 * Math.PI;
  return rad;
}

// Ray vs AABB intersection
function rayIntersectsBox(
  rx: number, ry: number, dx: number, dy: number, maxDist: number,
  boxX: number, boxY: number, boxW: number, boxH: number
): number {
  let tMin = 0.0;
  let tMax = maxDist;

  const checkAxis = (p: number, d: number, bMin: number, bMax: number) => {
    if (Math.abs(d) < 0.0001) {
      if (p < bMin || p > bMax) return false;
    } else {
      let t1 = (bMin - p) / d;
      let t2 = (bMax - p) / d;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) return false;
    }
    return true;
  };

  if (!checkAxis(rx, dx, boxX, boxX + boxW)) return maxDist;
  if (!checkAxis(ry, dy, boxY, boxY + boxH)) return maxDist;

  if (tMin < 0) {
    if (tMax < 0) return maxDist;
    return 0; // Inside box
  }
  return tMin;
}

function castRay(x: number, y: number, angle: number, maxDist: number, obstacles: Obstacle[], timeSec: number, sensorSensitivity: number): number {
  let closest = maxDist;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  for (const obs of obstacles) {
    let obsX = obs.x;
    let obsY = obs.y;
    if (obs.type === 'moving') {
      const cycleSec = obs.movingCycleSeconds || 5;
      const phase = (timeSec % cycleSec) / cycleSec;
      const maxOscillation = Math.min(15, obs.x - 5, 95 - obs.x - obs.width);
      const oscillationOffset = Math.sin(phase * Math.PI * 2) * Math.max(0, maxOscillation);
      obsX = clamp(obs.x + oscillationOffset, 2, 98 - obs.width);
    }
    
    if (obs.type === 'hidden' && sensorSensitivity < 40) {
       continue;
    }

    const dist = rayIntersectsBox(x, y, dx, dy, closest, obsX, obsY, obs.width, obs.height);
    if (dist < closest) {
      closest = dist;
    }
  }
  return closest;
}

function applyControlLogic(sensors: SensorReading, battery: number, speed: number, rules: ControlRule[]): { action: RuleAction, ruleId?: string } {
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    let sensorVal = 0;
    if (rule.condition.sensor === 'front') sensorVal = sensors.front;
    else if (rule.condition.sensor === 'frontLeft') sensorVal = sensors.frontLeft;
    else if (rule.condition.sensor === 'frontRight') sensorVal = sensors.frontRight;
    else if (rule.condition.sensor === 'left') sensorVal = sensors.left;
    else if (rule.condition.sensor === 'right') sensorVal = sensors.right;
    else if (rule.condition.sensor === 'battery') sensorVal = battery;
    else if (rule.condition.sensor === 'speed') sensorVal = speed;
    else if (rule.condition.sensor === 'target_is_left') sensorVal = sensors.target_is_left;
    else if (rule.condition.sensor === 'target_is_right') sensorVal = sensors.target_is_right;
    else if (rule.condition.sensor === 'target_is_front') sensorVal = sensors.target_is_front;
    
    let matched = false;
    const v = rule.condition.value;
    switch (rule.condition.operator) {
      case '<': matched = sensorVal < v; break;
      case '<=': matched = sensorVal <= v; break;
      case '>': matched = sensorVal > v; break;
      case '>=': matched = sensorVal >= v; break;
      case '==': matched = sensorVal === v; break;
    }
    if (matched) return { action: rule.action, ruleId: rule.id };
  }
  return { action: 'ACCELERATE' }; // Default
}

export function runSimulation(
  config: RobotConfig,
  scenario: Scenario,
  runType: 'TRIAL_1' | 'TRIAL_2' | 'OFFICIAL',
  calibrationQuality: number = 1.0,
  controlRules: ControlRule[] = []
): RunResult {
  const ticks: SimulationTick[] = [];
  const collisionRecords: CollisionRecord[] = [];
  const events: string[] = [];

  const WAYPOINTS = [
    { x: 10, y: 80, name: 'START' },
    { x: 35, y: 45, name: 'CHECKPOINT 1 (NAVIGATION)' },
    { x: 65, y: 25, name: 'CHECKPOINT 2 (PICKUP)' },
    { x: 90, y: 80, name: 'CHECKPOINT 3 (DELIVERY)' },
  ];

  const payloadWeight = scenario.payload === 'heavy' ? 0.35 : scenario.payload === 'medium' ? 0.15 : 0.0;
  const rawMaxSpeed = GAME_CONSTANTS.MAX_SPEED_MPS;
  const maxSpeedMps = (rawMaxSpeed * (clamp(config.speed, 5, 100) / 100)) / (1 + payloadWeight * 0.4);
  const baseAccel = 2.5;
  const accelerationRate = (baseAccel * (clamp(config.motorPower, 5, 100) / 100)) / (1 + payloadWeight);
  const baseDecel = 3.5;
  const decelerationRate = baseDecel * (clamp(config.brakeStrength, 5, 100) / 100);
  const baseTurnRateRad = Math.PI * 1.2;
  const maxTurnRateRad = baseTurnRateRad * (clamp(config.steering, 10, 100) / 100) / (1 + payloadWeight * 0.2);
  const baseSensorRange = GAME_CONSTANTS.BASE_RANGE;
  
  // Sensor range max distance, convert to grid units (1m = 2.5 grid units approx)
  const maxSensorDistMeters = baseSensorRange * (clamp(config.sensorRange, 10, 100) / 100) * scenario.sensorHealth;
  const maxSensorDistGrid = maxSensorDistMeters * 2.5;

  const stoppingDistanceMeters = (maxSpeedMps * maxSpeedMps) / (2 * Math.max(0.5, decelerationRate));
  const ROBOT_RADIUS_GRID = 1.2;

  let currentX = WAYPOINTS[0].x;
  let currentY = WAYPOINTS[0].y;

  const initialDx = WAYPOINTS[1].x - currentX;
  const initialDy = WAYPOINTS[1].y - currentY;
  let currentAngleRad = Math.atan2(initialDy, initialDx);
  let currentVelocityMps = 0;

  let currentBattery = scenario.startingBattery;
  let currentHealth = 100;
  let currentCheckpointIndex = 0;
  let hasPayload = false;
  let collisionCount = 0;
  let completed = false;
  let failureReason: string | null = null;

  const DT = 0.1;
  const MAX_TICKS = GAME_CONSTANTS.TIMERS.OFFICIAL_SIM_MAX_TIME * 10;

  events.push(`[00:00.0s] Hardware Init. Scenario: ${scenario.name}`);
  events.push(`[00:00.0s] Control Rules loaded: ${controlRules.length}`);

  for (let tick = 0; tick <= MAX_TICKS; tick++) {
    const timeSec = tick * DT;

    if (currentBattery <= 0) {
      currentBattery = 0;
      failureReason = 'CRITICAL BATTERY DEPLETION: Power cell drained completely before delivery.';
      events.push(`[${formatTime(timeSec)}] CRITICAL: Battery drained`);
      break;
    }

    // Target Waypoint Check (Strict 1.2 grid radius, instead of 2.5)
    const targetIdx = Math.min(currentCheckpointIndex + 1, WAYPOINTS.length - 1);
    const target = WAYPOINTS[targetIdx];
    const dx = target.x - currentX;
    const dy = target.y - currentY;
    const distToTargetGrid = Math.sqrt(dx * dx + dy * dy);

    // Calculate sensor readings (5 rays)
    const rayAngles = [
      currentAngleRad, // front
      currentAngleRad - Math.PI / 4, // frontLeft
      currentAngleRad + Math.PI / 4, // frontRight
      currentAngleRad - Math.PI / 2, // left
      currentAngleRad + Math.PI / 2, // right
    ];

    const rawRays = rayAngles.map(angle => castRay(currentX, currentY, angle, maxSensorDistGrid, scenario.obstacles, timeSec, config.sensorSensitivity));
    
    // Apply calibration noise
    const noiseFactor = (1.0 - calibrationQuality) * 0.5; // up to 50% error if calib is 0
    const noisyRays = rawRays.map(r => {
      const error = 1 + (Math.random() * 2 - 1) * noiseFactor;
      return clamp(r * error, 0, maxSensorDistGrid);
    });

    // Convert grid distances back to meters for the logic
    const targetAngleRad = Math.atan2(dy, dx);
    const angleErrorRad = wrapAngle(targetAngleRad - currentAngleRad);
    const isTargetFront = Math.abs(angleErrorRad) < 0.2 ? 1 : 0;
    const isTargetLeft = angleErrorRad < -0.2 ? 1 : 0;
    const isTargetRight = angleErrorRad > 0.2 ? 1 : 0;

    const sensors: SensorReading = {
      front: Number((noisyRays[0] / 2.5).toFixed(1)),
      frontLeft: Number((noisyRays[1] / 2.5).toFixed(1)),
      frontRight: Number((noisyRays[2] / 2.5).toFixed(1)),
      left: Number((noisyRays[3] / 2.5).toFixed(1)),
      right: Number((noisyRays[4] / 2.5).toFixed(1)),
      target_is_left: isTargetLeft,
      target_is_right: isTargetRight,
      target_is_front: isTargetFront,
      raw: {
        front: Number((rawRays[0] / 2.5).toFixed(1)),
        frontLeft: Number((rawRays[1] / 2.5).toFixed(1)),
        frontRight: Number((rawRays[2] / 2.5).toFixed(1)),
        left: Number((rawRays[3] / 2.5).toFixed(1)),
        right: Number((rawRays[4] / 2.5).toFixed(1)),
      }
    };

    let minObstacleDistanceMeters = Math.min(sensors.front, sensors.frontLeft, sensors.frontRight);
    
    // Check actual physical collisions with AABB
    let collisionOccurred = false;
    for (const obstacle of scenario.obstacles) {
      let obsX = obstacle.x;
      let obsY = obstacle.y;
      if (obstacle.type === 'moving') {
        const cycleSec = obstacle.movingCycleSeconds || 5;
        const phase = (timeSec % cycleSec) / cycleSec;
        const maxOscillation = Math.min(15, obstacle.x - 5, 95 - obstacle.x - obstacle.width);
        const oscillationOffset = Math.sin(phase * Math.PI * 2) * Math.max(0, maxOscillation);
        obsX = clamp(obstacle.x + oscillationOffset, 2, 98 - obstacle.width);
      }

      const closestBoxX = clamp(currentX, obsX, obsX + obstacle.width);
      const closestBoxY = clamp(currentY, obsY, obsY + obstacle.height);
      const obsDistGrid = Math.sqrt((currentX - closestBoxX) ** 2 + (currentY - closestBoxY) ** 2);

      if (obsDistGrid <= ROBOT_RADIUS_GRID) {
        if (obstacle.type === 'charging') {
          currentBattery = Math.min(100, currentBattery + 15 * DT); // fast charge
          continue; // no bounce
        } else if (obstacle.type === 'hazard') {
          currentHealth = Math.max(0, currentHealth - 15 * DT); // rapid drain
          currentBattery = Math.max(0, currentBattery - 5 * DT);
          currentVelocityMps *= 0.8; // slow down
          continue; // no bounce
        }

        // Hard collision
        collisionOccurred = true;
        collisionCount++;
        currentHealth = Math.max(0, currentHealth - 25);
        currentBattery = Math.max(0, currentBattery - GAME_CONSTANTS.COLLISION_DRAIN);

        collisionRecords.push({
          tick,
          timeSeconds: timeSec,
          obstacleId: obstacle.id,
          obstacleType: obstacle.type,
          x: Number(currentX.toFixed(2)),
          y: Number(currentY.toFixed(2)),
          detectionDistance: sensors.front,
          requiredStoppingDistance: Number(stoppingDistanceMeters.toFixed(2)),
        });

        // Bounce
        const bounceDir = Math.atan2(currentY - closestBoxY, currentX - closestBoxX);
        currentX += Math.cos(bounceDir) * 1.5;
        currentY += Math.sin(bounceDir) * 1.5;
        currentVelocityMps = 0;
        break;
      }
    }

    let actualTurnStep = 0;
    let activeRuleId: string | undefined;

    if (!collisionOccurred) {
      // Evaluate Control Logic Interpreter instead of auto-nav
      const decision = applyControlLogic(sensors, currentBattery, currentVelocityMps, controlRules);
      activeRuleId = decision.ruleId;
      
      const maxTurnStep = maxTurnRateRad * DT;

      switch (decision.action) {
        case 'BRAKE':
          currentVelocityMps = Math.max(0, currentVelocityMps - decelerationRate * DT);
          break;
        case 'REDUCE_SPEED':
          currentVelocityMps = Math.max(0, currentVelocityMps - (decelerationRate * 0.5) * DT);
          break;
        case 'INCREASE_SPEED':
        case 'ACCELERATE':
          currentVelocityMps = Math.min(maxSpeedMps, currentVelocityMps + accelerationRate * DT);
          break;
        case 'REVERSE':
          currentVelocityMps = Math.max(-maxSpeedMps * 0.5, currentVelocityMps - accelerationRate * DT);
          break;
        case 'TURN_LEFT':
          actualTurnStep = -maxTurnStep;
          currentAngleRad = wrapAngle(currentAngleRad + actualTurnStep);
          currentVelocityMps = Math.min(maxSpeedMps * 0.8, currentVelocityMps); // cornering limit
          break;
        case 'TURN_RIGHT':
          actualTurnStep = maxTurnStep;
          currentAngleRad = wrapAngle(currentAngleRad + actualTurnStep);
          currentVelocityMps = Math.min(maxSpeedMps * 0.8, currentVelocityMps); // cornering limit
          break;
      }

      // Players must program their own turns using target_is_left / target_is_right sensors.

      const stepMeters = currentVelocityMps * DT;
      const stepGrid = stepMeters * 2.5;

      currentX += Math.cos(currentAngleRad) * stepGrid;
      currentY += Math.sin(currentAngleRad) * stepGrid;
      currentX = clamp(currentX, 1, 99);
      currentY = clamp(currentY, 1, 99);
    }

    // Tighter checkpoint check (radius 1.2 grid, speed < 2.5)
    if (distToTargetGrid < 1.5 && currentVelocityMps < 2.5) {
      if (currentCheckpointIndex < WAYPOINTS.length - 1) {
        currentCheckpointIndex++;
        if (currentCheckpointIndex === 2) hasPayload = true;
        if (currentCheckpointIndex === 3) completed = true;
      }
    }

    // Battery Drain
    const isTurning = Math.abs(actualTurnStep) > 0.02 ? 1 : 0;
    const motorDrain = ((config.motorPower / 100) ** 1.3) * GAME_CONSTANTS.K_MOTOR;
    const speedDrain = (Math.abs(currentVelocityMps) / rawMaxSpeed) * GAME_CONSTANTS.K_MOVEMENT;
    const sensorDrain = (config.sensorRange / 100) * GAME_CONSTANTS.K_SENSOR + (config.sensorSensitivity / 100) * 0.008;
    const steerDrain = isTurning * 0.005;
    const payloadDrain = payloadWeight * 0.015;

    const totalDrainPerTick = (GAME_CONSTANTS.BASE_DRAIN + motorDrain + speedDrain + sensorDrain + steerDrain + payloadDrain) * DT;
    currentBattery = Math.max(0, currentBattery - totalDrainPerTick);

    ticks.push({
      tick,
      timeSeconds: Number(timeSec.toFixed(1)),
      x: Number(currentX.toFixed(2)),
      y: Number(currentY.toFixed(2)),
      angle: Number((currentAngleRad * (180 / Math.PI)).toFixed(1)),
      speed: Number(currentVelocityMps.toFixed(2)),
      battery: Number(currentBattery.toFixed(1)),
      checkpointIndex: currentCheckpointIndex,
      hasPayload,
      isCollision: collisionOccurred,
      sensorDistance: Number(minObstacleDistanceMeters.toFixed(2)),
      steeringAngle: Number((actualTurnStep * (180 / Math.PI)).toFixed(1)),
      collisions: collisionCount,
      sensors,
      activeRuleId,
    });

    if (completed) break;
  }

  const completionTimeSeconds = ticks[ticks.length - 1]?.timeSeconds || MAX_TICKS * DT;

  let failureAnalysis: FailureAnalysis | undefined = undefined;
  if (collisionCount > 0 || currentBattery <= 0 || currentHealth <= 0 || !completed) {
    const lastCollision = collisionRecords[collisionRecords.length - 1];
    
    let probSummary = failureReason;
    if (!probSummary) {
      if (currentHealth <= 0) probSummary = 'Critical Hull Failure (Health 0%).';
      else if (currentBattery <= 0) probSummary = 'Total Power Depletion (Battery 0%).';
      else if (collisionCount > 0) probSummary = `Robot suffered ${collisionCount} impact collision(s).`;
      else probSummary = 'Mission timed out.';
    }

    failureAnalysis = {
      hasCollision: collisionCount > 0,
      hasDepletedBattery: currentBattery <= 0,
      collisionDetails: lastCollision,
      detectionDistance: lastCollision ? lastCollision.detectionDistance : Number((maxSensorDistMeters).toFixed(2)),
      requiredStoppingDistance: Number(stoppingDistanceMeters.toFixed(2)),
      problemSummary: probSummary!,
      likelyCauses: ['Control logic failure', 'Calibration error', 'Hazard zone damage'],
      engineeringInsights: ['Adjust control rules to brake earlier', 'Check sensor calibration', 'Optimize motor power for battery'],
    };
  }

  return {
    runType,
    config,
    scenarioId: scenario.scenarioId,
    completed,
    completionTimeSeconds,
    batteryRemaining: Number(currentBattery.toFixed(1)),
    collisionCount,
    checkpointsReached: currentCheckpointIndex,
    failureAnalysis,
    ticks,
    healthRemaining: Number(currentHealth.toFixed(1)),
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}s`;
}
