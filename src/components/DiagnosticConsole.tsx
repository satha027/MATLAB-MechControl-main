import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export const DiagnosticConsole: React.FC = () => {
  const { currentTeam, startPhase, runSim } = useGameSocket();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  if (!currentTeam) return null;

  const handleRunDiagnostics = () => {
    if (currentTeam.logicTests <= 0) return;
    
    setAnalyzing(true);
    // In a real implementation, we would send a command to use a logic test
    // For now, simulate the delay
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisComplete(true);
      // Let's trigger a simulated diagnostic run on the server side
      // by running a special diagnostic run or just returning a result.
      // But we will just show local results based on the last run for now.
    }, 2000);
  };

  const failAnalysis = currentTeam.stage4Result?.failureAnalysis || currentTeam.stage6Result?.failureAnalysis;

  return (
    <div className="glass-panel p-6 rounded-lg border border-primary-container/40 bg-[#0e1015]/90 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-3xl">build_circle</span>
          <div>
            <h2 className="text-xl font-headline-md text-primary-fixed uppercase tracking-wider font-bold">
              STAGE 5: DIAGNOSTICS & REPAIR
            </h2>
            <p className="text-sm font-code-snippet text-on-surface-variant mt-1">
              Analyze telemetry to identify failure points before advanced operations.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 bg-surface-container-highest px-3 py-1.5 rounded border border-outline-variant/30">
            <span className="text-xs font-label-caps text-on-surface-variant uppercase">Logic Tests:</span>
            <span className="text-amber-400 font-bold">{currentTeam.logicTests}</span>
          </div>
          <div className="flex items-center justify-between gap-3 bg-surface-container-highest px-3 py-1.5 rounded border border-outline-variant/30">
            <span className="text-xs font-label-caps text-on-surface-variant uppercase">Robot Health:</span>
            <span className={currentTeam.robotHealth > 50 ? 'text-tertiary-fixed font-bold' : 'text-red-400 font-bold'}>{currentTeam.robotHealth}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[#0a0c10] border border-outline-variant/30 rounded p-4 font-code-snippet text-sm relative min-h-[250px]">
        {!analyzing && !analysisComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50">query_stats</span>
            <p className="text-on-surface-variant mb-4">Run diagnostic analysis to review the previous run's telemetry.</p>
            <button
              onClick={handleRunDiagnostics}
              disabled={currentTeam.logicTests <= 0}
              className="bg-primary-container/20 text-primary-fixed border border-primary-fixed/50 hover:bg-primary-container/40 px-6 py-2 rounded text-xs font-bold uppercase transition-all"
            >
              RUN DIAGNOSTIC (-1 TEST)
            </button>
          </div>
        )}

        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-fixed mb-4"></div>
            <p className="text-primary-fixed animate-pulse">ANALYZING TELEMETRY...</p>
          </div>
        )}

        {analysisComplete && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-tertiary-fixed font-bold border-b border-tertiary-fixed/30 pb-2">DIAGNOSTIC REPORT GENERATED</h3>
            
            {failAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-on-surface-variant uppercase mb-2">Primary Failure Reason</h4>
                  <p className="text-red-400 font-bold">{failAnalysis.problemSummary}</p>
                </div>
                <div>
                  <h4 className="text-xs text-on-surface-variant uppercase mb-2">Identified Causes</h4>
                  <ul className="list-disc list-inside text-amber-400/90 text-xs space-y-1">
                    {failAnalysis.likelyCauses.map((cause, i) => (
                      <li key={i}>{cause}</li>
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-2 mt-2 p-3 bg-tertiary-fixed/10 border border-tertiary-fixed/30 rounded">
                  <h4 className="text-xs text-tertiary-fixed uppercase mb-2">Engineering Insights</h4>
                  <ul className="list-disc list-inside text-white/90 text-xs space-y-1">
                    {failAnalysis.engineeringInsights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-tertiary-fixed">
                No critical failures detected in previous run telemetry. System operating within nominal parameters.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4 pt-4 border-t border-outline-variant/30">
        <button
          onClick={() => startPhase('STAGE_3_LOGIC')}
          className="bg-surface-container-highest hover:bg-surface-container text-on-surface px-6 py-2 rounded text-xs font-label-caps uppercase transition-colors border border-outline-variant/50"
        >
          REVISIT LOGIC
        </button>
        <button
          onClick={() => startPhase('STAGE_6_ADVANCED_RUNNING')}
          className="bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold px-8 py-2 rounded text-xs font-label-caps uppercase transition-colors shadow-[0_0_15px_rgba(0,242,255,0.2)]"
        >
          PROCEED TO ADVANCED STAGE
        </button>
      </div>
    </div>
  );
};
