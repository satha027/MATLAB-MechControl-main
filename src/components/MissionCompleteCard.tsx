import React, { useEffect, useRef, useState } from 'react';
import { RunResult, Scenario } from '../types';

interface MissionCompleteCardProps {
  result: RunResult;
  scenario: Scenario;
  onViewLeaderboard: () => void;
  onNextPhase?: () => void;
}

function useCountUp(target: number, duration: number = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const interval = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(Math.round(start));
      if (start >= target) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return value;
}

export const MissionCompleteCard: React.FC<MissionCompleteCardProps> = ({
  result,
  scenario,
  onViewLeaderboard,
  onNextPhase,
}) => {
  const score = result.finalScore ?? 0;
  const displayScore = useCountUp(score);
  const breakdown = result.scoreBreakdown;
  const isPerfectRun = result.completed && result.collisionCount === 0;

  const BreakdownBar = ({
    label,
    earned,
    max,
    color,
  }: {
    label: string;
    earned: number;
    max: number;
    color: string;
  }) => {
    const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0;
    return (
      <div>
        <div className="flex justify-between text-xs font-label-caps text-on-surface mb-1">
          <span>{label}</span>
          <span style={{ color }} className="font-bold">
            {earned} / {max} PTS
          </span>
        </div>
        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-lg p-6 border border-tertiary-fixed/40 bg-[#0d1210]/95 shadow-[0_0_30px_rgba(121,255,91,0.2)] max-w-4xl mx-auto flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-tertiary-fixed/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-tertiary-fixed/20 border border-tertiary-fixed flex items-center justify-center text-tertiary-fixed">
            <span className="material-symbols-outlined text-3xl">
              {result.completed ? 'emoji_events' : 'warning'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-headline-md text-tertiary-fixed font-extrabold uppercase tracking-wider">
                {result.completed ? 'MISSION COMPLETE' : 'MISSION FAILED'}
              </h2>
              {isPerfectRun && (
                <span className="text-[10px] font-label-caps bg-amber-400/20 text-amber-400 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  ⭐ PERFECT RUN +5
                </span>
              )}
            </div>
            <p className="text-xs font-code-snippet text-on-surface-variant">
              {result.completed
                ? `Delivered in ${result.completionTimeSeconds.toFixed(1)}s | Par: ${scenario.parTime}s`
                : `Failed — ${result.failureAnalysis?.problemSummary?.slice(0, 60) ?? 'Mission incomplete'}...`}
            </p>
          </div>
        </div>

        {/* Animated Score Badge */}
        <div className="bg-surface-container-highest/80 border border-tertiary-fixed/50 rounded-lg p-3 px-6 text-center shadow-[0_0_15px_rgba(121,255,91,0.3)] min-w-[100px]">
          <div className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest">
            ENGINEER SCORE
          </div>
          <div className="text-3xl font-telemetry-data text-tertiary-fixed font-black tabular-nums">
            {displayScore}<span className="text-sm font-normal text-on-surface-variant">/100</span>
          </div>
          <div className="text-[9px] text-on-surface-variant">{score >= 80 ? '🏆 ELITE' : score >= 60 ? '✅ QUALIFIED' : '⚠️ RETRY'}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TIME', value: `${result.completionTimeSeconds.toFixed(1)}s`, sub: `PAR: ${scenario.parTime}s`, good: result.completionTimeSeconds <= scenario.parTime },
          { label: 'BATTERY LEFT', value: `${result.batteryRemaining.toFixed(0)}%`, sub: `STARTED: ${scenario.startingBattery}%`, good: result.batteryRemaining > 20 },
          { label: 'COLLISIONS', value: String(result.collisionCount), sub: result.collisionCount === 0 ? 'CLEAN RUN' : `${result.collisionCount} IMPACT(S)`, good: result.collisionCount === 0 },
        ].map(({ label, value, sub, good }) => (
          <div key={label} className={`rounded-lg p-3 border text-center ${good ? 'border-tertiary-fixed/30 bg-tertiary-fixed/5' : 'border-red-400/30 bg-red-950/20'}`}>
            <div className="text-[9px] font-label-caps text-on-surface-variant uppercase">{label}</div>
            <div className={`text-xl font-telemetry-data font-bold ${good ? 'text-tertiary-fixed' : 'text-red-400'}`}>{value}</div>
            <div className="text-[9px] text-on-surface-variant">{sub}</div>
          </div>
        ))}
      </div>

      {/* Score Breakdown Bars */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-label-caps text-primary-fixed uppercase tracking-widest">SCORE BREAKDOWN</h3>
        <BreakdownBar label="CHECKPOINT NAVIGATION" earned={breakdown?.navCheckpointPoints ?? 0} max={15} color="#00f2ff" />
        <BreakdownBar
          label="PAYLOAD PICKUP & DELIVERY"
          earned={(breakdown?.pickupCheckpointPoints ?? 0) + (breakdown?.deliveryCheckpointPoints ?? 0)}
          max={25}
          color="#a78bfa"
        />
        <BreakdownBar label="TIME EFFICIENCY" earned={breakdown?.timeScore ?? 0} max={20} color="#f59e0b" />
        <BreakdownBar label="BATTERY PRESERVATION" earned={breakdown?.batteryScore ?? 0} max={15} color="#79ff5b" />
        <BreakdownBar label="ACCURACY (COLLISIONS)" earned={breakdown?.accuracyScore ?? 0} max={15} color="#22d3ee" />
        <BreakdownBar label="CONFIG EFFICIENCY" earned={breakdown?.configEfficiency ?? 0} max={10} color="#818cf8" />

        {breakdown && breakdown.collisionPenalty > 0 && (
          <div className="text-xs font-code-snippet text-red-400 flex justify-between border-t border-outline-variant/20 pt-2">
            <span>COLLISION PENALTY</span>
            <span className="font-bold">-{breakdown.collisionPenalty} PTS</span>
          </div>
        )}
        {isPerfectRun && (
          <div className="text-xs font-code-snippet text-amber-400 flex justify-between">
            <span>⭐ PERFECT RUN BONUS</span>
            <span className="font-bold">+5 PTS</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-label-caps pt-2 border-t border-outline-variant/30">
          <span className="text-on-surface-variant">DIFFICULTY ×{breakdown?.difficultyCoeff.toFixed(2)}</span>
          <span className="text-tertiary-fixed font-bold">{score} / 100 FINAL</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-outline-variant/30">
        <div className="text-xs font-code-snippet text-on-surface-variant">
          Scenario: <span className="text-white font-bold">{scenario.name}</span> | Run:{' '}
          <span className="text-primary-fixed">{result.runType.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onViewLeaderboard}
            className="flex-1 sm:flex-none border border-tertiary-fixed/60 text-tertiary-fixed hover:bg-tertiary-fixed/10 px-5 py-2.5 rounded font-label-caps text-xs uppercase font-bold transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">leaderboard</span>
            VIEW LEADERBOARD
          </button>
          {onNextPhase && (
            <button
              onClick={onNextPhase}
              className="flex-1 sm:flex-none bg-tertiary-fixed text-on-tertiary hover:bg-tertiary-fixed-dim px-6 py-2.5 rounded font-label-caps text-xs uppercase font-extrabold shadow-[0_0_15px_rgba(121,255,91,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <span>NEXT PHASE</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
