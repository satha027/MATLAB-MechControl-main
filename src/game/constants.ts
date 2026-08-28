/**
 * Centralized Balancing Parameters & Constants
 */

import { Preset } from '../types';

export const GAME_CONSTANTS = {
  // Battery drain constants
  BASE_DRAIN: 0.15,
  K_MOTOR: 0.02,
  K_SENSOR: 0.015,
  K_MOVEMENT: 0.10,
  COLLISION_DRAIN: 8.0,

  // Physics and Sensor constants
  BASE_RANGE: 12.0,      // Meters
  BRAKE_K: 0.45,
  MAX_SPEED_MPS: 3.5,    // Meters / sec

  // Penalties
  PAYLOAD_PENALTIES: {
    light: 0.0,
    medium: 0.10,
    heavy: 0.25,
  },

  // Timers (seconds)
  TIMERS: {
    TRIAL_CONFIG_TIME: 90,
    TRIAL_SIM_MAX_TIME: 90,
    OFFICIAL_CONFIG_TIME: 45,
    OFFICIAL_SIM_MAX_TIME: 90,
    FEEDBACK_TIME: 15,
  },

  // Scoring weights
  SCORING: {
    NAV_CHECKPOINT: 15,
    PICKUP_CHECKPOINT: 15,
    DELIVERY_CHECKPOINT: 10,
    TIME_SCORE_MAX: 20,
    BATTERY_SCORE_MAX: 15,
    ACCURACY_SCORE_MAX: 15,
    CONFIG_EFFICIENCY_MAX: 10,
    COLLISION_PENALTY_PER_HIT: 8,
  },
  
  // Trial 2 faults
  FAULTS: [
    { type: 'OFFSET', desc: 'IR sensor offset error', effect: { sensorMultiplier: 0.6 } },
    { type: 'STEERING_LAG', desc: 'Steering servo lag', effect: { steeringDelay: 3 } },
    { type: 'BATTERY_DRAIN', desc: 'Power cell degradation', effect: { drainMultiplier: 1.4 } },
    { type: 'MOTOR_LOSS', desc: 'Left motor power loss', effect: { motorMultiplier: 0.7 } },
  ],
};
