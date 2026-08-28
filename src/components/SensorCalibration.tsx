import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';

interface SensorCalibrationProps {
  onCompleteCalibration: () => void;
}

export const SensorCalibration: React.FC<SensorCalibrationProps> = ({ onCompleteCalibration }) => {
  const { currentTeam, updateCalibration } = useGameSocket();

  const [gain, setGain] = useState<number>(currentTeam?.irLeftGain || 0);
  const [offset, setOffset] = useState<number>(currentTeam?.noiseFilterOffset || 0);
  const [frequency, setFrequency] = useState<number>(currentTeam?.frequencyOffset || 0);
  const [isFaultFixed, setIsFaultFixed] = useState<boolean>((currentTeam?.calibrationProgress || 0) >= 100);

  const [targetGain] = useState<number>(() => {
    let hash = 0; const str = currentTeam?.teamId || "default";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return 1.5 + (Math.abs(hash) % 10) / 10; // 1.5 to 2.4
  });
  const [targetOffset] = useState<number>(() => {
    let hash = 0; const str = currentTeam?.teamId || "default";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 4) - hash);
    return 15 + (Math.abs(hash) % 20); // 15 to 34
  });
  const [targetFreq] = useState<number>(() => {
    let hash = 0; const str = currentTeam?.teamId || "default";
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 3) - hash);
    return -10 + (Math.abs(hash) % 20); // -10 to +9
  });

  // Compute calibration quality metrics based on tuning accuracy against randomized targets
  const gainScore = Math.max(0, 100 - Math.abs(gain - targetGain) * 50);
  const offsetScore = Math.max(0, 100 - Math.abs(offset - targetOffset) * 4);
  const freqScore = Math.max(0, 100 - Math.abs(frequency - targetFreq) * 10);

  const calculatedQuality = Math.round((gainScore + offsetScore + freqScore) / 3);
  const isOptimal = calculatedQuality >= 80;

  const handleApplyFix = () => {
    setIsFaultFixed(true);
    const qualityMultiplier = Number((calculatedQuality / 100).toFixed(2));
    updateCalibration({
      progress: 100,
      irLeftGain: gain,
      irRightGain: gain * 0.95,
      noiseOffset: offset,
      frequencyOffset: frequency,
      quality: qualityMultiplier,
    });
  };

  const handleReset = () => {
    setGain(0);
    setOffset(0);
    setFrequency(0);
    setIsFaultFixed(false);
    updateCalibration({
      progress: 0,
      irLeftGain: 0,
      irRightGain: 0,
      noiseOffset: 0,
      frequencyOffset: 0,
      quality: 0,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Phase Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-outline-variant/50 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-headline-md text-primary-fixed mb-1 uppercase tracking-wider">
            PHASE 1: SENSOR CALIBRATION CHALLENGE
          </h2>
          <p className="text-xs sm:text-sm font-body-sm text-on-surface-variant">
            Calibrate hardware signal channels, gain, and noise filters to maximize sensor detection range.
          </p>
        </div>

        <div className="glass-panel px-5 py-3 rounded flex items-center gap-6 border border-primary-container/20 bg-[#101018]/80">
          <div>
            <div className="text-[10px] font-label-caps text-on-surface-variant mb-1 uppercase tracking-widest">
              CALIBRATION ACCURACY
            </div>
            <div className="w-40 sm:w-48 h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  calculatedQuality >= 80 ? 'bg-tertiary-fixed shadow-[0_0_10px_rgba(121,255,91,0.8)]' : 'bg-primary-container'
                }`}
                style={{ width: `${calculatedQuality}%` }}
              ></div>
            </div>
          </div>
          <div className="text-lg font-telemetry-data text-primary-fixed font-bold">
            {calculatedQuality}%
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Sensor Telemetry Table */}
        <div className="lg:col-span-7 glass-panel rounded-lg p-5 border border-outline-variant/30 bg-[#101018]/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-fixed">sensors</span>
                <h3 className="text-xs font-label-caps text-primary-fixed tracking-widest uppercase">
                  ACTIVE SENSOR CHANNELS
                </h3>
              </div>
              <span className="px-2 py-1 bg-surface-container-highest rounded text-code-snippet text-on-surface-variant text-[10px] border border-outline-variant/50">
                100 Hz DSP FEED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-label-caps text-on-surface-variant border-b border-outline-variant/50">
                    <th className="py-3 px-3 font-normal">CHANNEL</th>
                    <th className="py-3 px-3 font-normal text-right">RAW READOUT</th>
                    <th className="py-3 px-3 font-normal text-right">OPTIMAL</th>
                    <th className="py-3 px-3 font-normal text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="text-code-snippet text-xs">
                  {/* Ultrasonic */}
                  <tr className="border-b border-outline-variant/20 hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-tertiary-fixed shadow-[0_0_5px_rgba(121,255,91,0.5)]"></div>
                      <span className="text-on-surface">ULTRASONIC ECHO</span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-tertiary-fixed font-medium">12.4 m</td>
                    <td className="py-3.5 px-3 text-right text-on-surface-variant">12.0 m</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-tertiary-fixed/30 bg-tertiary-fixed/10 text-tertiary-fixed text-[10px] uppercase font-bold">
                        NOMINAL
                      </span>
                    </td>
                  </tr>

                  {/* IR Left (Array A) */}
                  <tr className={`border-b border-outline-variant/20 transition-all ${!isFaultFixed ? 'bg-amber-950/20' : 'hover:bg-white/5'}`}>
                    <td className="py-3.5 px-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${!isOptimal ? 'bg-amber-400' : 'bg-tertiary-fixed'}`}></div>
                      <span className="text-on-surface">IR ARRAY A (LEFT)</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium text-primary-fixed">
                      {(8.2 * gain).toFixed(1)} cm
                    </td>
                    <td className="py-3.5 px-3 text-right text-on-surface-variant">???</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                        isOptimal
                          ? 'border-tertiary-fixed/30 bg-tertiary-fixed/10 text-tertiary-fixed'
                          : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                      }`}>
                        {isOptimal ? 'CALIBRATED' : 'TUNING REQUIRED'}
                      </span>
                    </td>
                  </tr>

                  {/* IR Right */}
                  <tr className="border-b border-outline-variant/20 hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-tertiary-fixed"></div>
                      <span className="text-on-surface">IR ARRAY B (RIGHT)</span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-tertiary-fixed font-medium">16.1 cm</td>
                    <td className="py-3.5 px-3 text-right text-on-surface-variant">???</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-tertiary-fixed/30 bg-tertiary-fixed/10 text-tertiary-fixed text-[10px] uppercase font-bold">
                        NOMINAL
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-3 bg-surface-container-highest/40 rounded border border-outline-variant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-fixed">insights</span>
              <div className="text-xs font-code-snippet">
                <span className="text-primary-fixed font-bold block mb-0.5">PERFORMANCE IMPACT</span>
                <span className="text-on-surface-variant">
                  High calibration accuracy (+80%) increases maximum sensor range and filters out hidden obstacle signal noise.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-between items-center">
            <span className="text-xs font-code-snippet text-on-surface-variant">
              {isFaultFixed ? '✓ Calibration lock confirmed.' : 'Adjust controls and lock calibration.'}
            </span>
            <button
              onClick={onCompleteCalibration}
              disabled={!isFaultFixed}
              className={`px-6 py-2.5 rounded font-label-caps text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                isFaultFixed
                  ? 'bg-primary-container text-on-primary-container hover:bg-primary-fixed shadow-[0_0_15px_rgba(0,242,255,0.4)] cursor-pointer'
                  : 'bg-surface-container-highest text-on-surface-variant/40 border border-outline-variant cursor-not-allowed'
              }`}
            >
              <span>PROCEED TO CONTROL LOGIC</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Column: Calibration Controls */}
        <div className="lg:col-span-5 glass-panel rounded-lg p-5 border border-primary-container/30 bg-[#101018]/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant/30">
              <span className="text-xs font-label-caps text-primary-fixed font-bold uppercase tracking-wider">
                DSP SIGNAL CALIBRATOR
              </span>
              <span className="text-[10px] font-code-snippet text-tertiary-fixed font-bold">
                SCORE: {calculatedQuality}%
              </span>
            </div>

            {/* Signal Noise Visualizer */}
            <div className="h-24 bg-surface-container-highest/50 rounded border border-outline-variant/30 relative flex items-center justify-center overflow-hidden mb-6">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 50">
                <path
                  d={`M0,25 Q20,${25 - (100 - gainScore) / 4} 40,25 T80,${25 + (100 - offsetScore) / 4} T120,25 T160,${25 - (100 - freqScore) / 4} T200,25`}
                  fill="none"
                  stroke={isOptimal ? '#79ff5b' : '#00f2ff'}
                  strokeWidth="2"
                />
              </svg>
              <span className="text-code-snippet text-[10px] font-bold px-2 py-1 rounded backdrop-blur z-10 border border-outline-variant/40 bg-black/60 text-white">
                SIGNAL WAVEFORM: {isOptimal ? 'STABLE' : 'UNASSIGNED NOISE'}
              </span>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <label className="font-label-caps text-on-surface-variant uppercase">SIGNAL GAIN</label>
                  <span className="font-code-snippet text-primary-fixed">{gain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={gain}
                  onChange={(e) => setGain(parseFloat(e.target.value))}
                  className="w-full h-1 bg-surface-container-highest rounded appearance-none cursor-pointer accent-primary-container"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <label className="font-label-caps text-on-surface-variant uppercase">NOISE FILTER OFFSET</label>
                  <span className="font-code-snippet text-amber-400">{offset}mV</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={offset}
                  onChange={(e) => setOffset(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-surface-container-highest rounded appearance-none cursor-pointer accent-primary-container"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <label className="font-label-caps text-on-surface-variant uppercase">FREQUENCY ALIGNMENT</label>
                  <span className="font-code-snippet text-tertiary-fixed">{frequency}Hz</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={frequency}
                  onChange={(e) => setFrequency(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-surface-container-highest rounded appearance-none cursor-pointer accent-primary-container"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleReset}
              className="flex-1 border border-outline-variant hover:border-primary-container text-on-surface-variant hover:text-primary-container rounded py-2 text-xs font-label-caps uppercase transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              RESET
            </button>
            <button
              onClick={handleApplyFix}
              className="flex-1 bg-primary-container text-on-primary-container hover:bg-primary-fixed rounded py-2 text-xs font-label-caps font-bold uppercase transition-all shadow-[0_0_10px_rgba(0,242,255,0.4)] flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              LOCK CALIBRATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
