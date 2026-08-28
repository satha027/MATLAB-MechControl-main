import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

interface SideNavProps {
  activeTab: 'status' | 'mission' | 'objectives' | 'legend';
  setActiveTab: (tab: 'status' | 'mission' | 'objectives' | 'legend') => void;
}

export const SideNav: React.FC<SideNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentTeam } = useGameSocket();

  const batteryVal = currentTeam?.officialResult?.batteryRemaining ?? currentTeam?.trial1Result?.batteryRemaining ?? 84;

  return (
    <aside className="bg-[#131318]/90 backdrop-blur-xl border-r border-outline-variant w-64 shrink-0 flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Unit Header */}
      <div className="p-4 border-b border-outline-variant/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-surface-container-high border border-primary-container/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary-fixed">precision_manufacturing</span>
          </div>
          <div>
            <div className="text-xs font-label-caps text-primary uppercase font-bold tracking-wider">
              TELEMETRY UNIT
            </div>
            <div className="text-xs font-code-snippet text-on-surface-variant opacity-70">
              MOD-001-SENSORS
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        <button
          onClick={() => setActiveTab('status')}
          className={`w-full p-3 px-5 text-xs font-label-caps tracking-widest uppercase flex items-center gap-3 transition-all ${
            activeTab === 'status'
              ? 'bg-primary-container/10 border-r-4 border-primary-container text-primary-container font-bold'
              : 'text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-surface-container-highest/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
          ROBOT STATUS
        </button>

        <button
          onClick={() => setActiveTab('mission')}
          className={`w-full p-3 px-5 text-xs font-label-caps tracking-widest uppercase flex items-center gap-3 transition-all ${
            activeTab === 'mission'
              ? 'bg-primary-container/10 border-r-4 border-primary-container text-primary-container font-bold'
              : 'text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-surface-container-highest/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">assignment</span>
          MISSION
        </button>

        <button
          onClick={() => setActiveTab('objectives')}
          className={`w-full p-3 px-5 text-xs font-label-caps tracking-widest uppercase flex items-center gap-3 transition-all ${
            activeTab === 'objectives'
              ? 'bg-primary-container/10 border-r-4 border-primary-container text-primary-container font-bold'
              : 'text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-surface-container-highest/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">task_alt</span>
          OBJECTIVES
        </button>

        <button
          onClick={() => setActiveTab('legend')}
          className={`w-full p-3 px-5 text-xs font-label-caps tracking-widest uppercase flex items-center gap-3 transition-all ${
            activeTab === 'legend'
              ? 'bg-primary-container/10 border-r-4 border-primary-container text-primary-container font-bold'
              : 'text-on-surface-variant opacity-70 hover:opacity-100 hover:bg-surface-container-highest/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">list_alt</span>
          LEGEND
        </button>
      </nav>

      {/* System Vitals Widget */}
      <div className="p-4 border-t border-outline-variant/50 mt-auto bg-surface-container-lowest/50">
        <div className="text-xs font-label-caps text-on-surface-variant mb-2 tracking-wider uppercase">
          SYSTEM VITALS
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-surface-container-highest/30 p-2 rounded border border-outline-variant/30">
            <span className="text-xs font-code-snippet text-on-surface">BATTERY</span>
            <span className="text-sm font-telemetry-data text-tertiary-fixed font-bold">
              {batteryVal.toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between items-center bg-surface-container-highest/30 p-2 rounded border border-outline-variant/30">
            <span className="text-xs font-code-snippet text-on-surface">CORE TEMP</span>
            <span className="text-sm font-telemetry-data text-primary-fixed font-bold">42°C</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
