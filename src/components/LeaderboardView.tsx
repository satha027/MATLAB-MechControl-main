import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export const LeaderboardView: React.FC = () => {
  const { gameState } = useGameSocket();
  const entries = gameState.leaderboard || [];

  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const isPerfect = (e: typeof top1) =>
    e && e.collisions === 0 && e.completionTime > 0 && e.score > 0;

  const PodiumCard = ({
    entry,
    rank,
    size,
    borderColor,
    badgeColor,
    glowColor,
    label,
    order,
    offset,
  }: {
    entry: typeof top1;
    rank: number;
    size: 'lg' | 'md' | 'sm';
    borderColor: string;
    badgeColor: string;
    glowColor: string;
    label: string;
    order: string;
    offset: string;
  }) => {
    if (!entry) return null;
    const medals = ['', '🥇', '🥈', '🥉'];
    const isGold = rank === 1;
    const perfect = isPerfect(entry);

    return (
      <div
        className={`glass-panel p-5 rounded-xl border flex flex-col items-center text-center relative overflow-hidden ${order} ${offset}`}
        style={{ borderColor, boxShadow: `0 0 28px ${glowColor}` }}
      >
        {isGold && <div className="absolute top-0 inset-x-0 h-1" style={{ background: badgeColor }} />}

        {/* Rank Circle */}
        <div
          className={`${isGold ? 'w-14 h-14 text-2xl' : 'w-11 h-11 text-lg'} rounded-full flex items-center justify-center font-black mb-2 shadow-lg`}
          style={{ background: badgeColor, color: '#000', boxShadow: `0 0 14px ${glowColor}` }}
        >
          {rank}
        </div>

        <span className="text-[9px] font-label-caps uppercase tracking-widest mb-1" style={{ color: badgeColor }}>
          {medals[rank]} {label}
        </span>

        <h3 className={`font-headline-md text-white font-extrabold my-0.5 ${isGold ? 'text-lg' : 'text-base'}`}>
          {entry.teamName}
        </h3>
        <span className="text-[11px] font-code-snippet text-on-surface-variant">{entry.stationId}</span>
        <span className="text-[10px] font-code-snippet text-on-surface-variant/60 mt-0.5">{entry.scenarioName}</span>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {perfect && (
            <span className="text-[9px] font-label-caps bg-amber-400/20 text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded-full">
              ⭐ PERFECT RUN
            </span>
          )}
          {entry.collisions === 0 && (
            <span className="text-[9px] font-label-caps bg-tertiary-fixed/15 text-tertiary-fixed border border-tertiary-fixed/30 px-1.5 py-0.5 rounded-full">
              ✓ NO COLLISIONS
            </span>
          )}
        </div>

        {/* Score */}
        <div className="mt-3 pt-3 border-t w-full" style={{ borderColor: `${badgeColor}33` }}>
          <span className={`${isGold ? 'text-3xl' : 'text-2xl'} font-telemetry-data font-black`} style={{ color: badgeColor }}>
            {entry.score}
          </span>
          <span className="text-xs font-normal text-on-surface-variant ml-1">PTS</span>
        </div>

        {/* Sub-stats */}
        <div className="grid grid-cols-3 gap-1 mt-2 w-full text-[9px] font-code-snippet text-on-surface-variant">
          <div className="text-center">
            <div className="font-bold text-white">{entry.completionTime.toFixed(1)}s</div>
            <div>TIME</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-tertiary-fixed">{entry.batteryRemaining.toFixed(0)}%</div>
            <div>BATTERY</div>
          </div>
          <div className="text-center">
            <div className={`font-bold ${entry.collisions > 0 ? 'text-red-400' : 'text-tertiary-fixed'}`}>{entry.collisions}</div>
            <div>HITS</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-headline-md font-black text-primary-fixed uppercase tracking-widest flex items-center justify-center gap-3">
          <span className="material-symbols-outlined text-3xl sm:text-4xl text-amber-400">emoji_events</span>
          ROBOVERSE LEADERBOARD
        </h2>
        <p className="text-xs sm:text-sm font-body-sm text-on-surface-variant">
          Official ranking: normalized score → battery → collisions → time
        </p>
      </div>

      {/* Podium */}
      {entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 items-end">
          <PodiumCard entry={top2} rank={2} size="md"
            borderColor="rgba(203,213,225,0.5)" badgeColor="#cbd5e1" glowColor="rgba(203,213,225,0.2)"
            label="SILVER MEDAL" order="order-2 md:order-1" offset="mb-0 md:mb-4" />
          <PodiumCard entry={top1} rank={1} size="lg"
            borderColor="rgba(251,191,36,0.8)" badgeColor="#fbbf24" glowColor="rgba(251,191,36,0.3)"
            label="CHAMPION" order="order-1 md:order-2" offset="" />
          <PodiumCard entry={top3} rank={3} size="sm"
            borderColor="rgba(180,83,9,0.5)" badgeColor="#b45309" glowColor="rgba(180,83,9,0.2)"
            label="BRONZE MEDAL" order="order-3" offset="mb-0 md:mb-8" />
        </div>
      ) : (
        <div className="text-center py-12 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl block mb-3 text-outline-variant">leaderboard</span>
          <p className="font-label-caps uppercase tracking-wider">No runs submitted yet</p>
          <p className="text-sm mt-1">Complete a mission to appear on the leaderboard</p>
        </div>
      )}

      {/* Full Rankings Table */}
      {entries.length > 0 && (
        <div className="glass-panel rounded-xl p-5 border border-outline-variant/40 bg-[#0e1015]/90 overflow-x-auto">
          <h3 className="text-xs font-label-caps text-primary-fixed uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">format_list_numbered</span>
            FULL EVENT STANDINGS
          </h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-label-caps text-on-surface-variant border-b border-outline-variant/50">
                <th className="py-2.5 px-3 font-normal">RANK</th>
                <th className="py-2.5 px-3 font-normal">TEAM</th>
                <th className="py-2.5 px-3 font-normal hidden sm:table-cell">STATION</th>
                <th className="py-2.5 px-3 font-normal hidden md:table-cell">SCENARIO</th>
                <th className="py-2.5 px-3 font-normal text-right">TIME</th>
                <th className="py-2.5 px-3 font-normal text-right hidden sm:table-cell">BATTERY</th>
                <th className="py-2.5 px-3 font-normal text-right">HITS</th>
                <th className="py-2.5 px-3 font-normal text-right">SCORE</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {entries.map((entry, idx) => {
                const rankColors = ['', 'text-amber-400', 'text-slate-300', 'text-amber-700'];
                const rankColor = rankColors[idx + 1] || 'text-on-surface-variant';
                const perfect = isPerfect(entry);
                return (
                  <tr
                    key={entry.teamId}
                    className={`border-b border-outline-variant/15 hover:bg-white/5 transition-colors ${idx < 3 ? 'bg-white/[0.02]' : ''}`}
                  >
                    <td className={`py-3 px-3 font-bold text-base font-telemetry-data ${rankColor}`}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${entry.rank}`}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{entry.teamName}</div>
                      <div className="flex gap-1 mt-0.5">
                        {perfect && (
                          <span className="text-[8px] font-label-caps bg-amber-400/15 text-amber-400 border border-amber-400/30 px-1 rounded">⭐ PERFECT</span>
                        )}
                        {entry.collisions === 0 && !perfect && (
                          <span className="text-[8px] font-label-caps bg-tertiary-fixed/10 text-tertiary-fixed border border-tertiary-fixed/20 px-1 rounded">✓ CLEAN</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant hidden sm:table-cell">{entry.stationId}</td>
                    <td className="py-3 px-3 text-on-surface-variant hidden md:table-cell text-[11px]">{entry.scenarioName}</td>
                    <td className="py-3 px-3 text-right font-code-snippet text-primary-fixed">
                      {entry.completionTime > 0 ? `${entry.completionTime.toFixed(1)}s` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-code-snippet text-tertiary-fixed hidden sm:table-cell">
                      {entry.batteryRemaining > 0 ? `${entry.batteryRemaining.toFixed(0)}%` : '—'}
                    </td>
                    <td className={`py-3 px-3 text-right font-code-snippet ${entry.collisions > 0 ? 'text-red-400' : 'text-tertiary-fixed'}`}>
                      {entry.collisions}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-telemetry-data text-base" style={{ color: entry.score >= 80 ? '#79ff5b' : entry.score >= 50 ? '#f59e0b' : '#94a3b8' }}>
                      {entry.score > 0 ? entry.score : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
