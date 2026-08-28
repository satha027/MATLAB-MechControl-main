import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import { Team } from '../types';

export const HostDashboard: React.FC = () => {
  const { gameState, sendHostCommand, switchStation } = useGameSocket();

  const [pin, setPin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newStationId, setNewStationId] = useState<string>('Station 4');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === (gameState.hostPin || '1234')) {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Host PIN. Default is 1234');
    }
  };

  const handleRegisterTeam = () => {
    if (!newTeamName.trim()) return;
    sendHostCommand(pin, 'REGISTER_TEAM', { teamName: newTeamName, stationId: newStationId });
    setNewTeamName('');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)] p-4">
        <form
          onSubmit={handleAuth}
          className="glass-panel p-8 rounded-lg border border-primary-container/40 bg-[#0e1015]/95 max-w-md w-full flex flex-col gap-5 shadow-[0_0_30px_rgba(0,242,255,0.2)]"
        >
          <div className="flex items-center gap-3 border-b border-outline-variant/40 pb-3">
            <span className="material-symbols-outlined text-primary-fixed text-2xl">admin_panel_settings</span>
            <div>
              <h2 className="text-lg font-headline-md text-primary-fixed uppercase tracking-wider font-bold">
                EVENT HOST CONTROL
              </h2>
              <p className="text-xs font-code-snippet text-on-surface-variant">
                Enter Host PIN to access administrative dashboard
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block mb-2">
              HOST SECURITY PIN
            </label>
            <input
              type="password"
              placeholder="Enter PIN (Default: 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant rounded p-3 text-sm font-code-snippet text-white focus:border-primary-fixed outline-none"
            />
            {pinError && <p className="text-xs text-red-400 mt-1 font-code-snippet">{pinError}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold py-3 rounded text-xs font-label-caps uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            AUTHENTICATE
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Host Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#101218]/90 p-4 rounded-lg border border-primary-container/30">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-tertiary-fixed shadow-[0_0_8px_rgba(121,255,91,0.8)]"></div>
            <h2 className="text-xl font-headline-md text-primary-fixed font-extrabold uppercase tracking-wider">
              ARES_PROTOCOL_V4 CONTROL CENTER
            </h2>
          </div>
          <p className="text-xs font-code-snippet text-on-surface-variant mt-1">
            Active Event Time: {gameState.eventTimeSeconds}s | Stations Online: {Object.keys(gameState.teams).length}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendHostCommand(pin, 'START_EVENT')}
            className="bg-tertiary-fixed text-on-tertiary hover:bg-tertiary-fixed-dim px-4 py-2 rounded font-label-caps text-xs font-extrabold uppercase shadow-[0_0_10px_rgba(121,255,91,0.3)]"
          >
            START EVENT
          </button>
          <button
            onClick={() => sendHostCommand(pin, gameState.isPaused ? 'RESUME' : 'PAUSE')}
            className="bg-amber-400 text-black hover:bg-amber-300 px-4 py-2 rounded font-label-caps text-xs font-extrabold uppercase"
          >
            {gameState.isPaused ? 'RESUME' : 'PAUSE ALL'}
          </button>
          <button
            onClick={() => sendHostCommand(pin, 'SET_PHASE_ALL', { phase: 'OFFICIAL_CONFIG' })}
            className="bg-primary-container text-on-primary-container hover:bg-primary-fixed px-4 py-2 rounded font-label-caps text-xs font-bold uppercase"
          >
            START OFFICIAL RUN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team Station Grid */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-label-caps text-primary-fixed uppercase tracking-wider">
            ACTIVE TEAM STATIONS ({Object.keys(gameState.teams).length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.values(gameState.teams) as Team[]).map((team) => (
              <div
                key={team.teamId}
                className={`glass-panel rounded-lg p-4 border transition-all ${
                  gameState.activeStationId === team.stationId
                    ? 'border-primary-fixed bg-primary-container/10 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                    : 'border-outline-variant/40 bg-[#0e1015]/80'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-label-caps text-on-surface-variant uppercase block">
                      {team.stationId}
                    </span>
                    <h4 className="text-sm font-headline-md text-white font-bold">{team.teamName}</h4>
                  </div>
                  <span className="text-[10px] font-code-snippet px-2 py-0.5 rounded bg-surface-container-highest border border-outline-variant text-primary-fixed">
                    {team.currentPhase}
                  </span>
                </div>

                <div className="space-y-1 my-3 text-xs font-code-snippet">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">HEALTH:</span>
                    <span className={team.robotHealth > 50 ? 'text-tertiary-fixed' : 'text-red-400 font-bold'}>{team.robotHealth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">REPAIR KITS:</span>
                    <span className="text-amber-400">{team.repairKits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">LOGIC TESTS:</span>
                    <span className="text-amber-400">{team.logicTests}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-outline-variant/20 mt-1">
                    <span className="text-on-surface-variant">SCORE:</span>
                    <span className="text-tertiary-fixed font-bold">{team.finalScore || 0} PTS</span>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-outline-variant/30 pt-3">
                  <button
                    onClick={() => switchStation(team.stationId)}
                    className="flex-1 bg-surface-container-highest hover:bg-primary-container/20 border border-outline-variant text-xs font-label-caps py-1.5 rounded uppercase text-on-surface"
                  >
                    FOCUS CAM
                  </button>
                  <button
                    onClick={() => sendHostCommand(pin, 'RESET_TEAM', { teamId: team.teamId })}
                    className="border border-red-500/50 hover:bg-red-500/20 text-red-400 text-xs font-label-caps px-3 py-1.5 rounded uppercase"
                  >
                    RESET
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Team Registration Box */}
          <div className="glass-panel p-4 rounded-lg border border-outline-variant/40 bg-[#0e1015]/80 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-label-caps text-on-surface-variant uppercase block mb-1">
                NEW TEAM NAME
              </label>
              <input
                type="text"
                placeholder="e.g. VANGUARD X"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-xs font-code-snippet text-white outline-none"
              />
            </div>
            <div className="w-32">
              <label className="text-[10px] font-label-caps text-on-surface-variant uppercase block mb-1">
                STATION ID
              </label>
              <select
                value={newStationId}
                onChange={(e) => setNewStationId(e.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-xs font-code-snippet text-white outline-none"
              >
                <option value="Station 4">Station 4</option>
                <option value="Station 5">Station 5</option>
                <option value="Station 6">Station 6</option>
              </select>
            </div>
            <button
              onClick={handleRegisterTeam}
              className="bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold px-4 py-2 rounded text-xs font-label-caps uppercase"
            >
              REGISTER TEAM
            </button>
          </div>
        </div>

        {/* Master Event Terminal Log */}
        <div className="lg:col-span-4 glass-panel rounded-lg p-4 border border-outline-variant/40 bg-[#0a0c10] flex flex-col h-[500px]">
          <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 mb-3">
            <span className="material-symbols-outlined text-xs text-primary-fixed">terminal</span>
            <span className="text-xs font-label-caps text-primary-fixed uppercase tracking-wider font-bold">
              MASTER EVENT TERMINAL LOG
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 font-code-snippet text-xs pr-1">
            {gameState.masterLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 border-b border-white/5 pb-1">
                <span className="text-outline-variant text-[10px]">{log.timestamp}</span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-red-400 font-bold'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-tertiary-fixed font-bold'
                      : 'text-on-surface-variant'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
