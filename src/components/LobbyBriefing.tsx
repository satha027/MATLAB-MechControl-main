import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';
import { OFFICIAL_SCENARIOS } from '../game/scenarios';

interface LobbyBriefingProps {
  onStartMission: () => void;
}

export const LobbyBriefing: React.FC<LobbyBriefingProps> = ({ onStartMission }) => {
  const { currentTeam, joinTeam, startPhase } = useGameSocket();

  const [teamNameInput, setTeamNameInput] = useState<string>('MECH MASTERS');
  const [stationInput, setStationInput] = useState<string>('Station 1');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;
    joinTeam(teamNameInput, stationInput);
  };

  const handleBegin = () => {
    startPhase('SENSOR_CALIBRATION');
    onStartMission();
  };

  const activeScenario = OFFICIAL_SCENARIOS[currentTeam?.scenarioId || 'SCENARIO_1'];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 p-4 sm:p-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-lg border border-primary-container/40 bg-[#0e1015]/90 shadow-[0_0_25px_rgba(0,242,255,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-label-caps text-primary-fixed uppercase tracking-widest font-bold block mb-1">
            ROBOVERSE GRAND FINALE
          </span>
          <h2 className="text-2xl sm:text-3xl font-headline-md font-extrabold text-white uppercase tracking-wider">
            MISSION BRIEFING & STATION LOBBY
          </h2>
          <p className="text-xs font-body-sm text-on-surface-variant mt-1">
            Register your team station and review scenario directives before hardware initialization.
          </p>
        </div>

        {currentTeam && (
          <button
            onClick={handleBegin}
            className="bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold px-8 py-3 rounded text-xs font-label-caps uppercase shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>INITIALIZE SENSORS</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Registration Card */}
        <div className="md:col-span-5 glass-panel p-5 rounded-lg border border-outline-variant/40 bg-[#0e1015]/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 mb-4">
              <span className="material-symbols-outlined text-primary-fixed">badge</span>
              <h3 className="text-xs font-label-caps text-primary-fixed uppercase tracking-wider font-bold">
                TEAM REGISTRATION
              </h3>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider block mb-1">
                  TEAM CALLSIGN
                </label>
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant rounded p-2.5 text-xs font-code-snippet text-white outline-none focus:border-primary-fixed"
                  placeholder="e.g. MECH MASTERS"
                />
              </div>

              <div>
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider block mb-1">
                  HARDWARE STATION
                </label>
                <select
                  value={stationInput}
                  onChange={(e) => setStationInput(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant rounded p-2.5 text-xs font-code-snippet text-white outline-none focus:border-primary-fixed"
                >
                  <option value="Station 1" className="bg-[#101218] text-white">Station 1</option>
                  <option value="Station 2" className="bg-[#101218] text-white">Station 2</option>
                  <option value="Station 3" className="bg-[#101218] text-white">Station 3</option>
                  <option value="Station 4" className="bg-[#101218] text-white">Station 4</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full border border-primary-container text-primary-container hover:bg-primary-container/20 font-bold py-2.5 rounded text-xs font-label-caps uppercase transition-all"
              >
                CONNECT STATION
              </button>
            </form>
          </div>

          {currentTeam && (
            <div className="mt-6 pt-4 border-t border-outline-variant/30">
              <span className="text-[10px] font-label-caps text-tertiary-fixed uppercase font-bold block">
                ✓ STATION CONNECTED: {currentTeam.teamName} ({currentTeam.stationId})
              </span>
            </div>
          )}
        </div>

        {/* Assigned Scenario Directive */}
        <div className="md:col-span-7 glass-panel p-5 rounded-lg border border-outline-variant/40 bg-[#0e1015]/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 mb-4">
              <span className="material-symbols-outlined text-amber-400">assignment_late</span>
              <h3 className="text-xs font-label-caps text-amber-400 uppercase tracking-wider font-bold">
                ASSIGNED MISSION SCENARIO — {activeScenario.name}
              </h3>
            </div>

            <p className="text-xs font-body-sm text-on-surface mb-4">
              {activeScenario.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs font-code-snippet mb-4">
              <div className="bg-surface-container-highest/40 p-2.5 rounded border border-outline-variant/30">
                <span className="text-[10px] font-label-caps text-on-surface-variant block mb-0.5 uppercase">
                  DIFFICULTY COEFF
                </span>
                <span className="text-primary-fixed font-bold">{activeScenario.difficultyCoefficient}x</span>
              </div>
              <div className="bg-surface-container-highest/40 p-2.5 rounded border border-outline-variant/30">
                <span className="text-[10px] font-label-caps text-on-surface-variant block mb-0.5 uppercase">
                  STARTING BATTERY
                </span>
                <span className="text-tertiary-fixed font-bold">{activeScenario.startingBattery}%</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider block mb-2">
                SPECIAL OPERATIONAL DIRECTIVES:
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs font-code-snippet text-on-surface">
                {activeScenario.specialRules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-end">
            <button
              onClick={handleBegin}
              className="bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold px-6 py-2.5 rounded text-xs font-label-caps uppercase shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all flex items-center gap-2"
            >
              <span>ACCEPT DIRECTIVE & START</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
