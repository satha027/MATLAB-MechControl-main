import React from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export const SpectatorHUD: React.FC = () => {
  const { activeTeam, gameState } = useGameSocket();

  const team = activeTeam || Object.values(gameState.teams)[0];
  const result = team?.officialResult || team?.trial2Result || team?.trial1Result;
  const score = result?.finalScore || 92;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-black text-white font-sans select-none">
      {/* Background Arena Image */}
      <img
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFww4axD6THrj_0lZrgDkmQ-5h1Pl7T9sMgQbj70EfMZUMrXQ2TQAzI2y04wxq-f4K5eM5sxirsPvmPXxH4QtbPuyiSE21hJ4XBvxorOXowUpFjVD2kIro8r4T_JBqjDoRWVf5AouOyex0f91a4DK41Lb0q0xBKk_GwfgYMLiI0CmdlkNHjM7F9KUXh6i89FNCMy03n0RHc-iF9g8AIhI1Sb9FoOCdfmDvz9lpJRhDjOVy0nfSXvs"
        alt="Spectator Backdrop"
        className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 filter contrast-125"
      />

      {/* Scanning Line Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none animate-pulse"></div>

      {/* Top Banner / Run Status */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div className="bg-black/80 backdrop-blur border border-primary-fixed/50 px-5 py-2.5 rounded-lg flex items-center gap-4 shadow-[0_0_20px_rgba(0,242,255,0.4)]">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
          <div>
            <div className="text-[10px] font-label-caps text-red-400 uppercase tracking-widest font-bold">
              LIVE BROADCAST
            </div>
            <div className="text-sm font-headline-md text-white font-black uppercase tracking-wider">
              OFFICIAL RUN IN PROGRESS
            </div>
          </div>
        </div>

        {/* Active Team Badge */}
        <div className="bg-black/80 backdrop-blur border border-primary-fixed/50 px-6 py-2.5 rounded-lg text-right">
          <div className="text-[10px] font-label-caps text-primary-fixed uppercase tracking-widest">
            STATION 1 // TEAM IDENTIFIER
          </div>
          <div className="text-xl font-headline-md text-white font-black">
            {team?.teamName || 'MECH MASTERS'}
          </div>
        </div>
      </div>

      {/* Center Tactical Reticle Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-96 h-96 border border-cyan-500/30 rounded-full relative flex items-center justify-center animate-spin-slow">
          <div className="w-72 h-72 border border-dashed border-cyan-500/50 rounded-full"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-cyan-400"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-6 bg-cyan-400"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-6 bg-cyan-400"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-px w-6 bg-cyan-400"></div>
        </div>
      </div>

      {/* Bottom Telemetry Gauges */}
      <div className="absolute bottom-6 left-6 right-6 grid grid-cols-1 md:grid-cols-4 gap-4 z-20">
        {/* Velocity */}
        <div className="bg-black/80 backdrop-blur border border-outline-variant/50 p-4 rounded-lg">
          <div className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest">
            VELOCITY VECTOR
          </div>
          <div className="text-2xl font-telemetry-data text-primary-fixed font-black mt-1">
            2.8 <span className="text-xs text-on-surface-variant font-normal">m/s</span>
          </div>
        </div>

        {/* Core Power Battery */}
        <div className="bg-black/80 backdrop-blur border border-outline-variant/50 p-4 rounded-lg">
          <div className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest">
            CORE POWER BATTERY
          </div>
          <div className="text-2xl font-telemetry-data text-tertiary-fixed font-black mt-1">
            {team?.trial1Result?.batteryRemaining || 78}%
          </div>
        </div>

        {/* Checkpoint Milestones */}
        <div className="bg-black/80 backdrop-blur border border-outline-variant/50 p-4 rounded-lg">
          <div className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-widest">
            CHECKPOINT MILESTONES
          </div>
          <div className="text-2xl font-telemetry-data text-amber-400 font-black mt-1">
            {result?.checkpointsReached || 2} / 3
          </div>
        </div>

        {/* Big Score Card */}
        <div className="bg-gradient-to-r from-primary-container/40 to-tertiary-fixed/30 backdrop-blur border border-tertiary-fixed p-4 rounded-lg text-center shadow-[0_0_20px_rgba(121,255,91,0.3)]">
          <div className="text-[10px] font-label-caps text-tertiary-fixed uppercase tracking-widest font-bold">
            LIVE SCORE REVEAL
          </div>
          <div className="text-3xl font-telemetry-data text-white font-black mt-0.5">
            {score} <span className="text-sm font-normal text-tertiary-fixed">PTS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
