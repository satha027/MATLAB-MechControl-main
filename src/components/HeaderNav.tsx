import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

interface HeaderNavProps {
  currentView: 'player' | 'host' | 'spectator' | 'leaderboard';
  setCurrentView: (view: 'player' | 'host' | 'spectator' | 'leaderboard') => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ currentView, setCurrentView }) => {
  const { currentTeam, gameState, socket } = useGameSocket();

  const formattedTime = () => {
    const totalSecs = gameState.eventTimeSeconds || 765;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const score =
    currentTeam?.officialResult?.finalScore ??
    currentTeam?.trial2Result?.finalScore ??
    currentTeam?.trial1Result?.finalScore ??
    0;

  const isConnected = socket?.connected ?? false;
  const phase = currentTeam?.currentPhase ?? 'LOBBY';

  const phaseColors: Record<string, string> = {
    LOBBY: 'text-on-surface-variant',
    SENSOR_CALIBRATION: 'text-amber-400',
    TRIAL_1_CONFIG: 'text-primary-fixed',
    TRIAL_1_RUNNING: 'text-tertiary-fixed',
    TRIAL_1_RESULTS: 'text-tertiary-fixed',
    TRIAL_2_CONFIG: 'text-primary-fixed',
    TRIAL_2_RUNNING: 'text-tertiary-fixed',
    TRIAL_2_RESULTS: 'text-tertiary-fixed',
    OFFICIAL_CONFIG: 'text-amber-400',
    OFFICIAL_RUNNING: 'text-red-400',
    OFFICIAL_RESULTS: 'text-tertiary-fixed',
    LEADERBOARD: 'text-amber-400',
  };

  return (
    <header className="bg-surface-glass border-b border-outline-variant bg-[#0e0e13]/90 backdrop-blur-md shadow-[0_0_15px_rgba(0,242,255,0.2)] flex justify-between items-center w-full px-4 lg:px-6 h-16 z-50 fixed top-0 left-0 right-0">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-headline-md font-extrabold tracking-widest text-primary dark:text-primary-fixed flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed">smart_toy</span>
          MATLAB-MechControl
        </h1>
        <div className="h-6 w-px bg-outline-variant hidden lg:block"></div>
        <nav className="hidden md:flex gap-4">
          {(['player', 'host', 'spectator', 'leaderboard'] as const).map((view) => {
            const labels: Record<typeof view, string> = {
              player: 'LAB / PLAYER',
              host: 'HOST CONTROL',
              spectator: 'SPECTATOR HUD',
              leaderboard: 'LEADERBOARD',
            };
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`text-xs font-label-caps uppercase px-3 py-1.5 rounded transition-all ${
                  currentView === view
                    ? 'bg-primary-container/20 text-primary-container border-b-2 border-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-primary-fixed hover:bg-white/5'
                }`}
              >
                {labels[view]}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-4 text-xs font-telemetry-data text-on-surface-variant">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tertiary-fixed shadow-[0_0_6px_#79ff5b]' : 'bg-red-400 shadow-[0_0_6px_#f87171]'}`}
              style={{ animation: isConnected ? 'pulse 2s infinite' : 'none' }}
            />
            <span className={isConnected ? 'text-tertiary-fixed' : 'text-red-400'}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <span className="h-4 w-px bg-outline-variant"></span>

          {/* Team name */}
          <span className="text-primary-fixed font-bold">
            TEAM: <span className="text-white">{currentTeam?.teamName || 'MECH MASTERS'}</span>
          </span>
          <span className="h-4 w-px bg-outline-variant"></span>

          {/* Phase */}
          <span>
            PHASE: <span className={`font-bold ${phaseColors[phase] ?? 'text-on-surface-variant'}`}>{phase.replace(/_/g, ' ')}</span>
          </span>
          <span className="h-4 w-px bg-outline-variant"></span>

          {/* Event time */}
          <span>
            TIME: <span className="text-primary-fixed">{formattedTime()}</span>
          </span>
          <span className="h-4 w-px bg-outline-variant"></span>

          {/* Score */}
          <span>
            SCORE: <span className={`font-bold ${score > 0 ? 'text-tertiary-fixed' : 'text-on-surface-variant'}`}>{score > 0 ? score : '—'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-primary-fixed">
          <button
            title="Help & Mission Guide"
            onClick={() =>
              alert(
                'MATLAB-MECHCONTROL GUIDE:\n\n1. SENSOR CALIBRATION — Align your IR sensors before combat\n2. CONTROL LOGIC — Tune Speed, Motor, Sensor Range, Sensitivity, Brake & Steering\n3. TRIAL 1 & 2 — Test configurations and analyze failures\n4. OFFICIAL RUN — Lock your config for the final leaderboard score!\n\nPRESETS:\n• SCOUT — Fast & aggressive\n• BALANCED — Safe default\n• GUARDIAN — Sensor-heavy, defensive\n• PRECISION — Maximum detection accuracy\n• BERSERKER — Full throttle, high risk'
              )
            }
            className="hover:text-primary-fixed hover:bg-white/10 p-2 rounded transition-transform active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">help</span>
          </button>
          <button
            title="System Settings"
            onClick={() => setCurrentView('host')}
            className="hover:text-primary-fixed hover:bg-white/10 p-2 rounded transition-transform active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
