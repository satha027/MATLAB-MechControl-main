import React, { useState } from 'react';
import { FailureAnalysis, RobotConfig } from '../types';

interface FailureAnalysisModalProps {
  failureAnalysis: FailureAnalysis;
  onApplyRecommendation: (suggestedConfig: Partial<RobotConfig>) => void;
  onClose: () => void;
}

export const FailureAnalysisModal: React.FC<FailureAnalysisModalProps> = ({
  failureAnalysis,
  onApplyRecommendation,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);

  const options = [
    {
      title: 'Increase Sensor Range (+25%) & Brake Strength (+20%)',
      desc: 'Shortens stopping distance and extends obstacle detection window prior to impact.',
      suggested: { sensorRange: 80, brakeStrength: 75, speed: 45 },
    },
    {
      title: 'Reduce Speed (-25%) & Increase Sensor Sensitivity (+30%)',
      desc: 'Slower velocity allows full braking reaction time for hidden/narrow obstacles.',
      suggested: { speed: 40, sensorSensitivity: 75, brakeStrength: 70 },
    },
    {
      title: 'Reduce Motor Power (-20%) to Conserve Battery',
      desc: 'Optimizes motor power draw to prevent total voltage drop before Checkpoint 3.',
      suggested: { motorPower: 50, speed: 45, sensorRange: 65 },
    },
  ];

  const handleApply = () => {
    onApplyRecommendation(options[selectedOption].suggested);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121018] border border-red-500/50 rounded-lg max-w-2xl w-full p-6 shadow-[0_0_30px_rgba(255,51,51,0.3)] relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-red-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div>
              <h2 className="text-lg font-headline-md text-red-400 font-bold uppercase tracking-wider">
                DIAGNOSTIC FAILURE ANALYSIS
              </h2>
              <p className="text-xs font-code-snippet text-on-surface-variant">
                DIAG-FAIL-CODE-08 // PHYSICS & SENSOR MISMATCH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-white p-1 rounded hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Diagnostic Data Comparison */}
        <div className="bg-surface-container-lowest/80 border border-outline-variant/40 rounded p-4 space-y-3">
          <div className="text-xs font-label-caps text-primary-fixed uppercase tracking-wider">
            PRIMARY INCIDENT REASON
          </div>
          <p className="text-sm font-code-snippet text-red-300 font-bold">
            {failureAnalysis.problemSummary}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/30 text-xs">
            <div className="bg-surface-container-highest/40 p-2.5 rounded border border-outline-variant/30">
              <span className="text-[10px] font-label-caps text-on-surface-variant uppercase block mb-1">
                DETECTION DISTANCE
              </span>
              <span className="text-sm font-telemetry-data text-amber-400 font-bold">
                {failureAnalysis.detectionDistance} m
              </span>
            </div>
            <div className="bg-surface-container-highest/40 p-2.5 rounded border border-outline-variant/30">
              <span className="text-[10px] font-label-caps text-on-surface-variant uppercase block mb-1">
                REQUIRED STOPPING DISTANCE
              </span>
              <span className="text-sm font-telemetry-data text-red-400 font-bold">
                {failureAnalysis.requiredStoppingDistance} m
              </span>
            </div>
          </div>

          {/* Likely Causes */}
          <div>
            <span className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider block mb-1">
              LIKELY CAUSES IDENTIFIED:
            </span>
            <ul className="list-disc list-inside text-xs font-code-snippet text-on-surface space-y-1">
              {failureAnalysis.likelyCauses.map((cause, i) => (
                <li key={i}>{cause}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Engineering Recommendations Options */}
        <div>
          <label className="text-xs font-label-caps text-primary-fixed uppercase tracking-wider block mb-2">
            SELECT ENGINEERING RECOMMENDATION FIX:
          </label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`p-3 rounded border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedOption === idx
                    ? 'border-primary-fixed bg-primary-container/20 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                    : 'border-outline-variant/40 bg-surface-container-highest/20 hover:bg-surface-container-highest/40'
                }`}
              >
                <input
                  type="radio"
                  name="fixOption"
                  checked={selectedOption === idx}
                  onChange={() => setSelectedOption(idx)}
                  className="mt-1 accent-primary-container"
                />
                <div>
                  <div className="text-xs font-label-caps font-bold text-on-surface uppercase">
                    {opt.title}
                  </div>
                  <div className="text-xs font-body-sm text-on-surface-variant mt-0.5">
                    {opt.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant rounded text-xs font-label-caps uppercase text-on-surface-variant hover:text-white"
          >
            DISMISS
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold rounded text-xs font-label-caps uppercase shadow-[0_0_15px_rgba(0,242,255,0.4)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
            APPLY FIX & AUTO-RETRY
          </button>
        </div>
      </div>
    </div>
  );
};
