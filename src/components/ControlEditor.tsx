import React, { useEffect, useRef, useState } from 'react';
import { RobotConfig, Scenario, ControlRule } from '../types';
import { GAME_CONSTANTS } from '../game/constants';
import { ControlLogicBuilder } from './ControlLogicBuilder';

type PresetKey = 'SCOUT' | 'BALANCED' | 'GUARDIAN' | 'PRECISION' | 'BERSERKER';

interface ControlEditorProps {
  config: RobotConfig;
  rules: ControlRule[];
  onChangeConfig: (newConfig: RobotConfig) => void;
  onChangeRules: (rules: ControlRule[]) => void;
  scenario: Scenario;
  onRun: () => void;
  isRunning?: boolean;
}

const PRESET_STYLES: Record<PresetKey, { border: string; text: string; glow: string; badge: string }> = {
  SCOUT:     { border: 'border-amber-400/70',   text: 'text-amber-400',   glow: 'shadow-amber-400/20',   badge: 'bg-amber-400/15 text-amber-400 border-amber-400/40' },
  BALANCED:  { border: 'border-primary-fixed/70', text: 'text-primary-fixed', glow: 'shadow-primary-fixed/20', badge: 'bg-primary-fixed/15 text-primary-fixed border-primary-fixed/40' },
  GUARDIAN:  { border: 'border-tertiary-fixed/70', text: 'text-tertiary-fixed', glow: 'shadow-tertiary-fixed/20', badge: 'bg-tertiary-fixed/15 text-tertiary-fixed border-tertiary-fixed/40' },
  PRECISION: { border: 'border-violet-400/70',  text: 'text-violet-400',  glow: 'shadow-violet-400/20',  badge: 'bg-violet-400/15 text-violet-400 border-violet-400/40' },
  BERSERKER: { border: 'border-red-400/70',     text: 'text-red-400',     glow: 'shadow-red-400/20',     badge: 'bg-red-400/15 text-red-400 border-red-400/40' },
};

export const ControlEditor: React.FC<ControlEditorProps> = ({
  config,
  rules,
  onChangeConfig,
  onChangeRules,
  scenario,
  onRun,
  isRunning = false,
}) => {

  // Pre-Run Prediction Math
  const payloadWeight = scenario.payload === 'heavy' ? 0.35 : scenario.payload === 'medium' ? 0.15 : 0.0;
  const rawMaxSpeed = GAME_CONSTANTS.MAX_SPEED_MPS;
  const maxSpeedMps = (rawMaxSpeed * (Math.max(5, config.speed) / 100)) / (1 + payloadWeight * 0.4);

  // Stopping distance (v^2 / (2 * a_decel))
  const brakeDecel = 3.5 * (Math.max(5, config.brakeStrength) / 100);
  const stoppingDistanceMeters = (maxSpeedMps * maxSpeedMps) / (2 * Math.max(0.5, brakeDecel));

  // Detection distance
  const baseDetectionMeters = GAME_CONSTANTS.BASE_RANGE * (Math.max(10, config.sensorRange) / 100) * scenario.sensorHealth;

  // Estimated time based on path length ~ 120 grid units (48 meters)
  const estTimeSec = Number((48 / Math.max(0.5, maxSpeedMps) * 1.15).toFixed(1));

  // Estimated battery usage
  const drainRate =
    GAME_CONSTANTS.BASE_DRAIN +
    ((config.motorPower / 100) ** 1.3) * GAME_CONSTANTS.K_MOTOR +
    (maxSpeedMps / rawMaxSpeed) * GAME_CONSTANTS.K_MOVEMENT +
    (config.sensorRange / 100) * GAME_CONSTANTS.K_SENSOR;
  const estBatteryDrain = Math.min(100, Math.round(drainRate * estTimeSec * 1.2));

  // Collision risk assessment
  let collisionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (stoppingDistanceMeters > baseDetectionMeters * 0.9 || config.sensorSensitivity < 40) {
    collisionRisk = stoppingDistanceMeters > baseDetectionMeters * 1.3 ? 'CRITICAL' : 'HIGH';
  } else if (stoppingDistanceMeters > baseDetectionMeters * 0.7) {
    collisionRisk = 'MEDIUM';
  }

  // Mission confidence percentage
  let confidence = 100;
  if (collisionRisk === 'CRITICAL') confidence -= 40;
  else if (collisionRisk === 'HIGH') confidence -= 25;
  else if (collisionRisk === 'MEDIUM') confidence -= 10;
  if (estBatteryDrain > scenario.startingBattery) confidence -= 35;
  confidence = Math.max(15, Math.min(99, confidence));

  // Sliders removed, logic focused

  return (
    <div className="glass-panel rounded-lg flex flex-col h-full border border-outline-variant/50 bg-[#0e1015]/90 p-4 overflow-y-auto gap-5">
      {/* Header Bar */}
      <div className="border-b border-outline-variant/50 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed text-sm">tune</span>
          <span className="text-xs font-label-caps text-primary-fixed tracking-wider uppercase font-bold">
            PHASE 2: CONTROL LOGIC
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRun}
            disabled={isRunning}
            className="bg-tertiary-fixed text-on-tertiary px-4 py-1 rounded font-bold hover:bg-tertiary-fixed-dim transition-colors text-xs font-label-caps uppercase flex items-center gap-1 shadow-[0_0_12px_rgba(121,255,91,0.4)] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xs">play_arrow</span>
            {isRunning ? 'SIMULATING...' : 'EXECUTE RUN'}
          </button>
        </div>
      </div>

      {/* Presets and manual hardware config moved to Stage 2: Hardware Configurator */}

      {/* Pre-Run Prediction Engine Card */}
      <div className="bg-surface-container-lowest/90 border border-primary-container/30 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-label-caps text-primary-fixed font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">online_prediction</span>
            PREDICTED PERFORMANCE
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
              confidence >= 70
                ? 'bg-tertiary-fixed/20 text-tertiary-fixed border-tertiary-fixed/30'
                : confidence >= 50
                ? 'bg-amber-400/20 text-amber-400 border-amber-400/30'
                : 'bg-red-400/20 text-red-400 border-red-400/30'
            }`}
          >
            CONFIDENCE: {confidence}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-code-snippet">
          <div className="bg-surface-container-highest/40 p-2 rounded border border-outline-variant/20">
            <span className="text-[9px] font-label-caps text-on-surface-variant block uppercase">EST. TIME</span>
            <span className={`font-bold ${estTimeSec > scenario.parTime ? 'text-red-400' : 'text-white'}`}>{estTimeSec}s</span>
          </div>
          <div className="bg-surface-container-highest/40 p-2 rounded border border-outline-variant/20">
            <span className="text-[9px] font-label-caps text-on-surface-variant block uppercase">BATT. DRAIN</span>
            <span className={`font-bold ${estBatteryDrain > scenario.startingBattery ? 'text-red-400' : 'text-amber-400'}`}>
              -{estBatteryDrain}%
            </span>
          </div>
          <div className="bg-surface-container-highest/40 p-2 rounded border border-outline-variant/20">
            <span className="text-[9px] font-label-caps text-on-surface-variant block uppercase">COLLISION</span>
            <span
              className={`font-bold ${
                collisionRisk === 'CRITICAL' || collisionRisk === 'HIGH'
                  ? 'text-red-400'
                  : collisionRisk === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-tertiary-fixed'
              }`}
            >
              {collisionRisk}
            </span>
          </div>
        </div>

        {stoppingDistanceMeters > baseDetectionMeters && (
          <div className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/40 p-2 rounded flex items-center gap-1.5 font-code-snippet">
            <span className="material-symbols-outlined text-xs">warning</span>
            <span>COLLISION RISK: Stop dist ({stoppingDistanceMeters.toFixed(1)}m) &gt; detect range ({baseDetectionMeters.toFixed(1)}m)</span>
          </div>
        )}
        {estBatteryDrain > scenario.startingBattery && (
          <div className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/40 p-2 rounded flex items-center gap-1.5 font-code-snippet">
            <span className="material-symbols-outlined text-xs">battery_alert</span>
            <span>POWER WARNING: Drain exceeds starting battery ({scenario.startingBattery}%)</span>
          </div>
        )}
        {scenario.sensorHealth < 0.5 && (
          <div className="text-[10px] text-violet-400 bg-violet-950/40 border border-violet-500/40 p-2 rounded flex items-center gap-1.5 font-code-snippet">
            <span className="material-symbols-outlined text-xs">sensors_off</span>
            <span>SENSOR DEGRADED: {(scenario.sensorHealth * 100).toFixed(0)}% health — boost Sensitivity!</span>
          </div>
        )}
      </div>

      <div className="border-t border-outline-variant/30 pt-4 mt-2">
         <ControlLogicBuilder rules={rules} onChange={onChangeRules} />
      </div>

      {/* Sliders moved to Stage 2 */}
    </div>
  );
};
