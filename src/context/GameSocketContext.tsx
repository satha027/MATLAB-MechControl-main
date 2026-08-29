import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GamePhase,
  RobotConfig,
  ServerGameState,
  Team,
  RunResult,
} from '../types';

interface GameSocketContextType {
  socket: Socket | null;
  gameState: ServerGameState;
  currentTeam: Team | null;
  activeTeam: Team | null;
  joinTeam: (teamName: string, stationId: string) => void;
  updateCalibration: (data: {
    progress?: number;
    irLeftGain?: number;
    irRightGain?: number;
    noiseOffset?: number;
    frequencyOffset?: number;
    quality?: number;
  }) => void;
  updateConfig: (config: RobotConfig) => void;
  updateRules: (rules: any[]) => void;
  selectPreset: (presetName: 'SCOUT' | 'BALANCED' | 'GUARDIAN' | 'PRECISION' | 'BERSERKER') => void;
  startPhase: (phase: GamePhase) => void;
  runSim: (runType: 'TRIAL_1' | 'TRIAL_2' | 'OFFICIAL') => void;
  sendHostCommand: (pin: string, action: string, data?: any) => void;
  switchStation: (stationId: string) => void;
  activeTeamId: string;
  setActiveTeamId: (teamId: string) => void;
  socketError: string | null;
  clearSocketError: () => void;
  forceSubmitTeam: () => void;
}

const defaultState: ServerGameState = {
  teams: {},
  leaderboard: [],
  activeStationId: 'Station 1',
  eventTimeSeconds: 765,
  isPaused: false,
  masterLogs: [],
};

const GameSocketContext = createContext<GameSocketContextType>({
  socket: null,
  gameState: defaultState,
  currentTeam: null,
  activeTeam: null,
  joinTeam: () => {},
  updateCalibration: () => {},
  updateConfig: () => {},
  updateRules: () => {},
  selectPreset: () => {},
  startPhase: () => {},
  runSim: () => {},
  sendHostCommand: () => {},
  switchStation: () => {},
  activeTeamId: 'team-mech-masters',
  setActiveTeamId: () => {},
  socketError: null,
  clearSocketError: () => {},
  forceSubmitTeam: () => {},
});

export const GameSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<ServerGameState>(defaultState);
  const [currentTeamId, setCurrentTeamId] = useState<string>('team-mech-masters');
  const [activeTeamId, setActiveTeamId] = useState<string>('team-mech-masters');
  const [socketError, setSocketError] = useState<string | null>(null);

  const currentTeamRef = React.useRef<{ teamName: string; stationId: string }>({
    teamName: 'MECH MASTERS',
    stationId: 'Station 1',
  });

  // Helper to post API fallback action
  const sendApiAction = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.gameState) setGameState(data.gameState);
        return data;
      }
    } catch (err) {
      // ignore network errors
    }
    return null;
  };

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      socketInstance.emit('team:join', currentTeamRef.current);
    });

    socketInstance.on('connect_error', () => {
      // Suppress console warning noise for socket transport changes
    });

    socketInstance.on('state:update', (newState: ServerGameState) => {
      setGameState(newState);
    });

    socketInstance.on('error', (err: { message: string }) => {
      setSocketError(err.message);
    });

    socketInstance.on('phase:error', (err: { message: string }) => {
      setSocketError(err.message);
    });

    setSocket(socketInstance);

    // Continuous polling fetch every 2 seconds for guaranteed synchronization
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          setGameState(data);
        }
      } catch (err) {
        // ignore
      }
    }, 2000);

    return () => {
      socketInstance.disconnect();
      clearInterval(interval);
    };
  }, []);

  const currentTeam = gameState.teams[currentTeamId] || null;

  // Active team based on activeStationId or manual selection
  const activeTeam =
    (Object.values(gameState.teams) as Team[]).find((t) => t.stationId === gameState.activeStationId) ||
    gameState.teams[activeTeamId] ||
    (Object.values(gameState.teams) as Team[])[0] ||
    null;

  const joinTeam = (teamName: string, stationId: string) => {
    const generatedId = `team-${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    currentTeamRef.current = { teamName, stationId };
    setCurrentTeamId(generatedId);
    if (socket && socket.connected) {
      socket.emit('team:join', { teamName, stationId });
    }
    sendApiAction('team:join', { teamName, stationId });
  };

  const updateCalibration = (calibData: {
    progress?: number;
    irLeftGain?: number;
    irRightGain?: number;
    noiseOffset?: number;
    frequencyOffset?: number;
    quality?: number;
  }) => {
    if (socket && socket.connected) {
      socket.emit('team:update_calibration', calibData);
    }
    sendApiAction('team:update_calibration', { teamId: currentTeamId, ...calibData });
  };

  const updateConfig = (config: RobotConfig) => {
    if (socket && socket.connected) {
      socket.emit('team:update_config', { config });
    }
    sendApiAction('team:update_config', { teamId: currentTeamId, config });
  };

  const updateRules = (rules: any[]) => {
    if (socket && socket.connected) {
      socket.emit('team:update_rules', { rules });
    }
    sendApiAction('team:update_rules', { teamId: currentTeamId, rules });
  };

  const selectPreset = (presetName: 'SCOUT' | 'BALANCED' | 'GUARDIAN' | 'PRECISION' | 'BERSERKER') => {
    if (socket && socket.connected) {
      socket.emit('team:select_preset', { presetName });
    }
    sendApiAction('team:select_preset', { teamId: currentTeamId, presetName });
  };

  const startPhase = (phase: GamePhase) => {
    if (socket && socket.connected) {
      socket.emit('team:start_phase', { targetPhase: phase });
    }
    sendApiAction('team:start_phase', { teamId: currentTeamId, targetPhase: phase });
  };

  const runSim = (runType: 'TRIAL_1' | 'TRIAL_2' | 'OFFICIAL') => {
    if (socket && socket.connected) {
      socket.emit('simulation:run', { runType });
    }
    sendApiAction('simulation:run', { teamId: currentTeamId, runType });
  };

  const sendHostCommand = (pin: string, action: string, data?: any) => {
    if (socket && socket.connected) {
      socket.emit('host:command', { pin, action, data });
    }
    sendApiAction('host:command', { pin, cmdAction: action, data });
  };

  const switchStation = (stationId: string) => {
    if (socket && socket.connected) {
      socket.emit('host:command', {
        pin: 'P@ttu',
        action: 'SWITCH_ACTIVE_STATION',
        data: { stationId },
      });
    }
    sendApiAction('host:command', {
      pin: 'P@ttu',
      cmdAction: 'SWITCH_ACTIVE_STATION',
      data: { stationId },
    });
  };

  const clearSocketError = () => setSocketError(null);

  const forceSubmitTeam = () => {
    if (socket && socket.connected) {
      socket.emit('team:force_submit', {});
    }
    sendApiAction('team:force_submit', {});
  };

  return (
    <GameSocketContext.Provider
      value={{
        socket,
        gameState,
        currentTeam,
        activeTeam,
        joinTeam,
        updateCalibration,
        updateConfig,
        updateRules,
        selectPreset,
        startPhase,
        runSim,
        sendHostCommand,
        switchStation,
        activeTeamId,
        setActiveTeamId,
        socketError,
        clearSocketError,
        forceSubmitTeam,
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
};

export const useGameSocket = () => useContext(GameSocketContext);
