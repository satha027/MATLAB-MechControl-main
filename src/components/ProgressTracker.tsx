import React from 'react';
import { GamePhase } from '../types';

interface ProgressTrackerProps {
  currentPhase: GamePhase;
}

const STAGES = [
  { id: 'STAGE_1', label: 'CALIBRATE', phases: ['STAGE_1_CALIBRATION'] },
  { id: 'STAGE_2', label: 'CONFIGURE', phases: ['STAGE_2_CONFIG'] },
  { id: 'STAGE_3', label: 'PROGRAM', phases: ['STAGE_3_LOGIC'] },
  { id: 'STAGE_4', label: 'NAVIGATE', phases: ['STAGE_4_NAV_RUNNING', 'STAGE_4_NAV_RESULTS'] },
  { id: 'STAGE_5', label: 'DIAGNOSE', phases: ['STAGE_5_DIAGNOSIS'] },
  { id: 'STAGE_6', label: 'ADVANCED', phases: ['STAGE_6_ADVANCED_RUNNING', 'STAGE_6_ADVANCED_RESULTS'] },
  { id: 'OFFICIAL', label: 'FINAL', phases: ['OFFICIAL_CONFIG', 'OFFICIAL_RUNNING', 'OFFICIAL_RESULTS'] },
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentPhase }) => {
  // If in lobby or mission brief, don't show or show all locked
  if (currentPhase === 'LOBBY' || currentPhase === 'MISSION_BRIEF') return null;

  // Find current stage index
  let currentIndex = STAGES.findIndex(s => s.phases.includes(currentPhase));
  if (currentIndex === -1) {
    if (currentPhase === 'FINAL_SCORE' || currentPhase === 'LEADERBOARD') {
      currentIndex = STAGES.length; // All completed
    } else {
      currentIndex = 0;
    }
  }

  return (
    <div className="flex flex-wrap justify-center sm:justify-between items-center bg-[#101218]/90 p-3 sm:px-6 rounded-lg border border-outline-variant/30 mb-6 gap-2">
      {STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isLocked = index > currentIndex;

        return (
          <div key={stage.id} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-label-caps uppercase transition-all ${
                isActive
                  ? 'bg-primary-container/20 border-primary-fixed text-primary-fixed shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                  : isCompleted
                  ? 'bg-tertiary-fixed/10 border-tertiary-fixed/30 text-tertiary-fixed'
                  : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant/50'
              }`}
            >
              <span className="font-bold hidden sm:inline">
                {index + 1}
              </span>
              <span className={isActive ? 'font-bold' : ''}>
                {stage.label}
              </span>
              <span className="material-symbols-outlined text-[12px] sm:text-[14px]">
                {isActive ? 'radio_button_checked' : isCompleted ? 'check' : 'lock'}
              </span>
            </div>
            {index < STAGES.length - 1 && (
              <div className={`w-2 sm:w-4 lg:w-8 h-[1px] ${isCompleted ? 'bg-tertiary-fixed/50' : 'bg-outline-variant/30'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
};
