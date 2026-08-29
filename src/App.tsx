import React, { useState } from 'react';
import { GameSocketProvider, useGameSocket } from './context/GameSocketContext';
import { HeaderNav } from './components/HeaderNav';
import { SideNav } from './components/SideNav';
import { LobbyBriefing } from './components/LobbyBriefing';
import { SensorCalibration } from './components/SensorCalibration';
import { ControlEditor } from './components/ControlEditor';
import { ArenaCanvas } from './components/ArenaCanvas';
import { FailureAnalysisModal } from './components/FailureAnalysisModal';
import { MissionCompleteCard } from './components/MissionCompleteCard';
import { HostDashboard } from './components/HostDashboard';
import { SpectatorHUD } from './components/SpectatorHUD';
import { HardwareConfigurator } from './components/HardwareConfigurator';
import { DiagnosticConsole } from './components/DiagnosticConsole';
import { LeaderboardView } from './components/LeaderboardView';
import { ProgressTracker } from './components/ProgressTracker';
import { Login } from './components/Login';
import { useEffect } from 'react';

import { OFFICIAL_SCENARIOS } from './game/scenarios';
import { RobotConfig, PresetName } from './types';

function MainAppContent() {
  const [currentView, setCurrentView] = useState<'login' | 'player' | 'host' | 'spectator' | 'leaderboard'>('login');
  const [activeSideTab, setActiveSideTab] = useState<'status' | 'mission' | 'objectives' | 'legend'>('status');

  const {
    currentTeam,
    updateConfig,
    updateRules,
    selectPreset,
    runSim,
    startPhase,
    forceSubmitTeam,
  } = useGameSocket();

  const [warningCount, setWarningCount] = useState<number>(0);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showFailureModal, setShowFailureModal] = useState<boolean>(false);

  const scenario = OFFICIAL_SCENARIOS[currentTeam?.scenarioId || 'SCENARIO_1'];
  const currentPhase = currentTeam?.currentPhase || 'LOBBY';

  // Handle running simulation
  const handleRunSimulation = (runType: 'STAGE_4' | 'STAGE_6' | 'OFFICIAL') => {
    setIsSimulating(true);
    runSim(runType);
  };

  // Anti-Cheat: Tab Switching
  useEffect(() => {
    if (currentView !== 'player' || currentPhase === 'LOBBY' || currentPhase === 'FINAL_SCORE') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            alert("Maximum tab switches exceeded (3). Force submitting game!");
            forceSubmitTeam();
          } else {
            alert(`WARNING: You switched tabs! (${newCount}/3 warnings)`);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentView, currentPhase, forceSubmitTeam]);

  // Anti-Cheat: 15 Minute Timer
  useEffect(() => {
    if (currentView !== 'player') return;

    const timer = setTimeout(() => {
      alert("15 minutes have passed! Time is up!");
      forceSubmitTeam();
    }, 15 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [currentView, forceSubmitTeam]);

  useEffect(() => {
    if (currentPhase.endsWith('_RESULTS')) {
      setIsSimulating(false);
      const activeResult =
        currentPhase === 'OFFICIAL_RESULTS'
          ? currentTeam?.officialResult
          : currentPhase === 'STAGE_6_ADVANCED_RESULTS'
          ? currentTeam?.stage6Result
          : currentTeam?.stage4Result;

      if (activeResult?.failureAnalysis?.hasCollision) {
        setShowFailureModal(true);
      }
    }
  }, [currentPhase, currentTeam]);

  const handleApplyRecommendation = (suggested: Partial<RobotConfig>) => {
    if (currentTeam) {
      const updated = {
        ...currentTeam.config,
        ...suggested,
      };
      updateConfig(updated);
    }
  };

  if (currentView === 'login') {
    return <Login onLogin={() => setCurrentView('player')} onHostLogin={() => setCurrentView('host')} />;
  }

  return (
    <div className="h-screen bg-[#090b0e] text-on-surface flex flex-col font-sans antialiased overflow-hidden selection:bg-primary-container selection:text-black">
      {/* Top Header */}
      <HeaderNav currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Switcher — fills remainder below fixed 64px header */}
      <div className="flex-1 pt-16 overflow-hidden flex flex-col">
        {currentView === 'host' && <div className="flex-1 overflow-y-auto"><HostDashboard /></div>}
        {currentView === 'spectator' && <div className="flex-1 overflow-y-auto"><SpectatorHUD /></div>}
        {currentView === 'leaderboard' && <div className="flex-1 overflow-y-auto"><LeaderboardView /></div>}

        {currentView === 'player' && (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Sidebar — fills from below header to bottom */}
            <SideNav activeTab={activeSideTab} setActiveTab={setActiveSideTab} />

            {/* Main Player Lab Canvas Area — scrolls independently within flex row */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-5 min-w-0">
              <ProgressTracker currentPhase={currentPhase} />

              {/* Check if Lobby */}
              {(currentPhase === 'LOBBY' || currentPhase === 'MISSION_BRIEF') && (
                <LobbyBriefing onStartMission={() => startPhase('STAGE_1_CALIBRATION')} />
              )}

              {/* Check if Phase 1: Sensor Calibration */}
              {currentPhase === 'STAGE_1_CALIBRATION' && (
                <SensorCalibration onCompleteCalibration={() => startPhase('STAGE_2_CONFIG')} />
              )}

              {/* Check if Stage 2: Hardware Configurator */}
              {currentPhase === 'STAGE_2_CONFIG' && (
                <HardwareConfigurator />
              )}

              {/* Check if Stage 5: Diagnostics */}
              {currentPhase === 'STAGE_5_DIAGNOSIS' && (
                <DiagnosticConsole />
              )}

              {/* Check if Stage 3, 4, 6 or Official Configuration/Running */}
              {(currentPhase === 'STAGE_3_LOGIC' ||
                currentPhase === 'STAGE_4_NAV_RUNNING' ||
                currentPhase === 'STAGE_6_ADVANCED_RUNNING' ||
                currentPhase === 'OFFICIAL_CONFIG' ||
                currentPhase === 'OFFICIAL_RUNNING') && (
                <div className="flex flex-col gap-6">
                  {/* Phase Sub-Header */}
                  <div className="flex justify-between items-center bg-[#101218]/80 p-3 px-5 rounded-lg border border-outline-variant/40">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed">tune</span>
                      <h2 className="text-sm font-headline-md text-primary-fixed font-bold uppercase tracking-wider">
                        {currentPhase.replace(/_/g, ' ')} — {scenario.name}
                      </h2>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleRunSimulation(
                            currentPhase.startsWith('OFFICIAL')
                              ? 'OFFICIAL'
                              : currentPhase.startsWith('STAGE_6')
                              ? 'STAGE_6'
                              : 'STAGE_4'
                          )
                        }
                        disabled={isSimulating}
                        className="bg-tertiary-fixed text-on-tertiary font-bold px-5 py-1.5 rounded text-xs font-label-caps uppercase hover:bg-tertiary-fixed-dim shadow-[0_0_12px_rgba(121,255,91,0.4)]"
                      >
                        {isSimulating ? 'SIMULATING RUN...' : 'EXECUTE RUN'}
                      </button>
                      <button
                        onClick={() => startPhase('OFFICIAL_CONFIG')}
                        className="bg-primary-container text-on-primary-container font-bold px-4 py-1.5 rounded text-xs font-label-caps uppercase hover:bg-primary-fixed"
                      >
                        LOCK IN OFFICIAL RUN
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Split: Control Editor & Arena Canvas */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[440px]">
                    <div className="xl:col-span-5 min-h-[440px]">
                      <ControlEditor
                        config={currentTeam?.config || { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 }}
                        rules={currentTeam?.controlRules || []}
                        onChangeConfig={(cfg) => updateConfig(cfg)}
                        onChangeRules={(rules) => updateRules(rules)}
                        scenario={scenario}
                        onRun={() =>
                          handleRunSimulation(
                            currentPhase.startsWith('OFFICIAL')
                              ? 'OFFICIAL'
                              : currentPhase.startsWith('STAGE_6')
                              ? 'STAGE_6'
                              : 'STAGE_4'
                          )
                        }
                        isRunning={isSimulating}
                      />
                    </div>

                    <div className="xl:col-span-7 min-h-[440px]">
                      <ArenaCanvas
                        scenario={scenario}
                        config={currentTeam?.config || { speed: 50, motorPower: 50, sensorRange: 50, steering: 50, sensorSensitivity: 50, brakeStrength: 50 }}
                        ticks={
                          currentTeam?.officialResult?.ticks ||
                          currentTeam?.stage6Result?.ticks ||
                          currentTeam?.stage4Result?.ticks ||
                          []
                        }
                        isRunning={isSimulating}
                        onRunSimulation={() =>
                          handleRunSimulation(
                            currentPhase.startsWith('OFFICIAL')
                              ? 'OFFICIAL'
                              : currentPhase.startsWith('STAGE_6')
                              ? 'STAGE_6'
                              : 'STAGE_4'
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Check if Phase 3 Results */}
              {(currentPhase === 'STAGE_4_NAV_RESULTS' ||
                currentPhase === 'STAGE_6_ADVANCED_RESULTS' ||
                currentPhase === 'OFFICIAL_RESULTS') && (
                <MissionCompleteCard
                  result={
                    currentTeam?.officialResult ||
                    currentTeam?.stage6Result ||
                    currentTeam?.stage4Result!
                  }
                  scenario={scenario}
                  onViewLeaderboard={() => setCurrentView('leaderboard')}
                  onNextPhase={() =>
                    startPhase(
                      currentPhase === 'STAGE_4_NAV_RESULTS'
                        ? 'STAGE_5_DIAGNOSIS'
                        : currentPhase === 'STAGE_6_ADVANCED_RESULTS'
                        ? 'OFFICIAL_CONFIG'
                        : 'LEADERBOARD'
                    )
                  }
                />
              )}

              {/* Check if Phase 4: Final Score / Leaderboard */}
              {(currentPhase === 'FINAL_SCORE' || currentPhase === 'LEADERBOARD') && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4 border border-outline-variant/30 bg-[#101218]/80 rounded-lg p-8">
                  <span className="material-symbols-outlined text-6xl text-primary-fixed">emoji_events</span>
                  <h2 className="text-2xl font-headline-md text-primary-fixed font-bold uppercase tracking-widest">
                    EVENT COMPLETE
                  </h2>
                  <p className="text-on-surface-variant font-body-md max-w-md">
                    Your official run has concluded. Check the global leaderboard to see your final ranking.
                  </p>
                  <button 
                    onClick={() => setCurrentView('leaderboard')}
                    className="mt-4 bg-primary-container text-on-primary-container font-bold px-6 py-2 rounded text-sm font-label-caps uppercase hover:bg-primary-fixed transition-colors"
                  >
                    VIEW LEADERBOARD
                  </button>
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {/* Failure Analysis Modal — show for the most recent run with collision */}
      {showFailureModal && (
        (() => {
          const failAnalysis =
            currentTeam?.officialResult?.failureAnalysis ??
            currentTeam?.stage6Result?.failureAnalysis ??
            currentTeam?.stage4Result?.failureAnalysis;
          if (!failAnalysis) return null;
          return (
            <FailureAnalysisModal
              failureAnalysis={failAnalysis}
              onApplyRecommendation={handleApplyRecommendation}
              onClose={() => setShowFailureModal(false)}
            />
          );
        })()
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameSocketProvider>
      <MainAppContent />
    </GameSocketProvider>
  );
}
