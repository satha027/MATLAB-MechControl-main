import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import {
  GamePhase,
  LeaderboardEntry,
  RobotConfig,
  RunResult,
  ServerGameState,
  Team,
} from './src/types.js';
import { GAME_CONSTANTS } from './src/game/constants.js';
import { getRoundRobinScenario, OFFICIAL_SCENARIOS } from './src/game/scenarios.js';
import { runSimulation } from './src/game/simulationEngine.js';
import { calculateScore, compareLeaderboardEntries } from './src/game/scoringEngine.js';
import { syncGameStateToFirebase } from './serverFirebase.js';


const portArg = process.argv.find(arg => arg.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1], 10) : (process.env.PORT || 3000);
const HOST_PIN = process.env.HOST_PIN || 'P@ttu';

// Phase State Machine Validation
const ALLOWED_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  LOBBY: ['MISSION_BRIEF', 'STAGE_1_CALIBRATION'],
  MISSION_BRIEF: ['STAGE_1_CALIBRATION'],
  STAGE_1_CALIBRATION: ['STAGE_2_CONFIG'],
  STAGE_2_CONFIG: ['STAGE_3_LOGIC'],
  STAGE_3_LOGIC: ['STAGE_4_NAV_RUNNING', 'STAGE_4_NAV_RESULTS'],
  STAGE_4_NAV_RUNNING: ['STAGE_4_NAV_RESULTS'],
  STAGE_4_NAV_RESULTS: ['STAGE_5_DIAGNOSIS'],
  STAGE_5_DIAGNOSIS: ['STAGE_6_ADVANCED_RUNNING', 'STAGE_6_ADVANCED_RESULTS', 'OFFICIAL_CONFIG'],
  STAGE_6_ADVANCED_RUNNING: ['STAGE_6_ADVANCED_RESULTS'],
  STAGE_6_ADVANCED_RESULTS: ['OFFICIAL_CONFIG'],
  OFFICIAL_CONFIG: ['OFFICIAL_RUNNING', 'OFFICIAL_RESULTS'],
  OFFICIAL_RUNNING: ['OFFICIAL_RESULTS'],
  OFFICIAL_RESULTS: ['FINAL_SCORE', 'LEADERBOARD'],
  FINAL_SCORE: ['LEADERBOARD', 'LOBBY'],
  LEADERBOARD: ['LOBBY'],
};

function isValidPhaseTransition(currentPhase: GamePhase, targetPhase: GamePhase): boolean {
  if (currentPhase === targetPhase) return true;
  const allowed = ALLOWED_PHASE_TRANSITIONS[currentPhase];
  return allowed ? allowed.includes(targetPhase) : false;
}

function validateConfig(config: Partial<RobotConfig>): RobotConfig {
  const clamp = (val: number | undefined, def: number) =>
    typeof val === 'number' && !isNaN(val) ? Math.max(0, Math.min(100, Math.round(val))) : def;

  return {
    speed: clamp(config.speed, 0),
    motorPower: clamp(config.motorPower, 0),
    sensorRange: clamp(config.sensorRange, 0),
    steering: clamp(config.steering, 0),
    sensorSensitivity: clamp(config.sensorSensitivity, 0),
    brakeStrength: clamp(config.brakeStrength, 0),
  };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
  });

  app.use(express.json());

  // Initial Server Game State
  const gameState: ServerGameState = {
    teams: {
      'team-mech-masters': {
        teamId: 'team-mech-masters',
        teamName: 'MECH MASTERS',
        stationId: 'Station 1',
        scenarioId: 'SCENARIO_1',
        currentPhase: 'LOBBY',
        config: { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 },
        controlRules: [],
        isConnected: true,
        robotHealth: 100, hardwarePoints: 300, repairKits: 2, logicTests: 4, calibrationAttempts: 3,
        calibrationProgress: 0, irLeftGain: 0, irRightGain: 0, noiseFilterOffset: 0, frequencyOffset: 0, calibrationQuality: 0,
      },
      'team-robo-titans': {
        teamId: 'team-robo-titans',
        teamName: 'ROBO TITANS',
        stationId: 'Station 2',
        scenarioId: 'SCENARIO_2',
        currentPhase: 'LOBBY',
        config: { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 },
        controlRules: [],
        isConnected: false,
        robotHealth: 100, hardwarePoints: 300, repairKits: 2, logicTests: 4, calibrationAttempts: 3,
        calibrationProgress: 0, irLeftGain: 0, irRightGain: 0, noiseFilterOffset: 0, frequencyOffset: 0, calibrationQuality: 0,
      },
      'team-circuit-minds': {
        teamId: 'team-circuit-minds',
        teamName: 'CIRCUIT MINDS',
        stationId: 'Station 3',
        scenarioId: 'SCENARIO_3',
        currentPhase: 'LOBBY',
        config: { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 },
        controlRules: [],
        isConnected: true,
        robotHealth: 100, hardwarePoints: 300, repairKits: 2, logicTests: 4, calibrationAttempts: 3,
        calibrationProgress: 0, irLeftGain: 0, irRightGain: 0, noiseFilterOffset: 0, frequencyOffset: 0, calibrationQuality: 0,
      },
    },
    leaderboard: [],
    activeStationId: 'Station 1',
    eventTimeSeconds: 765, // 12:45
    isPaused: false,
    masterLogs: [
      { timestamp: '14:32:01', type: 'info', message: 'ROBOVERSE Grand Finale Server Online.' },
      { timestamp: '14:32:05', type: 'success', message: 'Station 1 (MECH MASTERS) connected.' },
    ],
  };

  // State Sanitizer (Never exposes hostPin or private server properties)
  function getSanitizedGameState(): ServerGameState {
    return {
      teams: gameState.teams,
      leaderboard: gameState.leaderboard,
      activeStationId: gameState.activeStationId,
      eventTimeSeconds: gameState.eventTimeSeconds,
      isPaused: gameState.isPaused,
      masterLogs: gameState.masterLogs,
    };
  }

  // Broadcast State Helper
  function broadcastState() {
    const state = getSanitizedGameState();
    io.emit('state:update', state);
    syncGameStateToFirebase(state);
  }

  // Helper log emitter
  function addLog(type: 'info' | 'warn' | 'error' | 'success', message: string) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    gameState.masterLogs.unshift({ timestamp, type, message });
    if (gameState.masterLogs.length > 50) gameState.masterLogs.pop();
    broadcastState();
  }

  // Helper function to register/join a team
  function registerTeam(teamName: string, stationId: string): Team {
    const cleanName = teamName.trim().toUpperCase();
    const teamId = `team-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const teamCount = Object.keys(gameState.teams).length;
    const assignedScenario = getRoundRobinScenario(teamCount);

    if (!gameState.teams[teamId]) {
      gameState.teams[teamId] = {
        teamId,
        teamName: cleanName,
        stationId: stationId || `Station ${teamCount + 1}`,
        scenarioId: assignedScenario.scenarioId,
        currentPhase: 'LOBBY',
        config: { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 },
        controlRules: [],
        isConnected: true,
        robotHealth: 100, hardwarePoints: 300, repairKits: 2, logicTests: 4, calibrationAttempts: 3,
        calibrationProgress: 0, irLeftGain: 0, irRightGain: 0, noiseFilterOffset: 0, frequencyOffset: 0, calibrationQuality: 0,
      };
      addLog('success', `Team registered: ${cleanName} assigned to ${assignedScenario.name}`);
    } else {
      gameState.teams[teamId].isConnected = true;
    }

    updateLeaderboard();
    broadcastState();
    return gameState.teams[teamId];
  }

  // Update Leaderboard
  function updateLeaderboard() {
    const entries: LeaderboardEntry[] = [];
    Object.values(gameState.teams).forEach((team) => {
      const bestScore = team.officialResult?.finalScore || team.stage6Result?.finalScore || team.stage4Result?.finalScore || 0;
      const scenario = OFFICIAL_SCENARIOS[team.scenarioId] || OFFICIAL_SCENARIOS.SCENARIO_1;
      const result = team.officialResult || team.stage6Result || team.stage4Result;

      entries.push({
        rank: 0,
        teamId: team.teamId,
        teamName: team.teamName,
        stationId: team.stationId,
        score: bestScore,
        completionTime: result ? result.completionTimeSeconds : 0,
        batteryRemaining: result ? result.batteryRemaining : 0,
        collisions: result ? result.collisionCount : 0,
        scenarioName: scenario.name,
        normalizedScore: result?.scoreBreakdown?.normalizedScore || bestScore,
      });
    });

    entries.sort(compareLeaderboardEntries);
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    gameState.leaderboard = entries;
  }

  // Initialize Leaderboard once
  updateLeaderboard();

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/state', (req, res) => {
    res.json(getSanitizedGameState());
  });

  // REST Fallback API Endpoints
  app.post('/api/action', (req, res) => {
    const { action, payload } = req.body || {};
    try {
      if (action === 'team:join') {
        const { teamName, stationId } = payload || {};
        if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
          res.status(400).json({ error: 'Invalid team name' });
          return;
        }
        const team = registerTeam(teamName, stationId);
        res.json({ success: true, team, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'team:update_calibration') {
        const { teamId, progress, irLeftGain, irRightGain, noiseOffset, frequencyOffset, quality } = payload || {};
        const team = gameState.teams[teamId];
        if (team) {
          if (typeof progress === 'number') team.calibrationProgress = Math.max(0, Math.min(100, progress));
          if (typeof irLeftGain === 'number') team.irLeftGain = irLeftGain;
          if (typeof irRightGain === 'number') team.irRightGain = irRightGain;
          if (typeof noiseOffset === 'number') team.noiseFilterOffset = noiseOffset;
          if (typeof frequencyOffset === 'number') team.frequencyOffset = frequencyOffset;
          if (typeof quality === 'number') team.calibrationQuality = Math.max(0.5, Math.min(1.2, quality));
          broadcastState();
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'team:update_config') {
        const { teamId, config } = payload || {};
        const team = gameState.teams[teamId];
        if (team && config) {
          team.config = validateConfig(config);
          broadcastState();
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'team:update_rules') {
        const { teamId, rules } = payload || {};
        const team = gameState.teams[teamId];
        if (team && rules) {
          team.controlRules = rules;
          broadcastState();
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'team:select_preset') {
        const { teamId, presetName } = payload || {};
        const team = gameState.teams[teamId];
        if (team && DEFAULT_PRESETS[presetName as keyof typeof DEFAULT_PRESETS]) {
          team.config = { ...DEFAULT_PRESETS[presetName as keyof typeof DEFAULT_PRESETS].config };
          addLog('info', `${team.teamName} selected preset ${presetName}`);
          broadcastState();
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'team:start_phase') {
        const { teamId, targetPhase } = payload || {};
        const team = gameState.teams[teamId];
        if (team && targetPhase) {
          if (isValidPhaseTransition(team.currentPhase, targetPhase)) {
            team.currentPhase = targetPhase;
            if (targetPhase === 'STAGE_5_DIAGNOSIS' && !team.calibrationState?.faultType) {
              const fault = GAME_CONSTANTS.FAULTS[Math.floor(Math.random() * GAME_CONSTANTS.FAULTS.length)];
              team.calibrationState = { ...team.calibrationState, faultType: fault.type as any };
              addLog('warn', `Fault injected for ${team.teamName}`);
            }
            addLog('info', `${team.teamName} transitioned to ${targetPhase}`);
            broadcastState();
          }
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      if (action === 'simulation:run') {
        const { teamId, runType } = payload || {};
        const team = gameState.teams[teamId];
        if (team && runType) {
          const scenario = OFFICIAL_SCENARIOS[team.scenarioId] || OFFICIAL_SCENARIOS.SCENARIO_1;
          const calibQuality = team.calibrationQuality || 1.0;
          const result = runSimulation(team.config, scenario, runType, calibQuality, team.controlRules || []);
          const scoreBreakdown = calculateScore(result, scenario, calibQuality);
          result.scoreBreakdown = scoreBreakdown;
          result.finalScore = scoreBreakdown.normalizedScore;

          if (runType === 'STAGE_4') {
            team.stage4Result = result;
            team.currentPhase = 'STAGE_4_NAV_RESULTS';
          } else if (runType === 'STAGE_6') {
            team.stage6Result = result;
            team.currentPhase = 'STAGE_6_ADVANCED_RESULTS';
          } else if (runType === 'OFFICIAL') {
            team.officialResult = result;
            team.finalScore = result.finalScore;
            team.currentPhase = 'OFFICIAL_RESULTS';
          }
          updateLeaderboard();
          broadcastState();
          res.json({ success: true, result, gameState: getSanitizedGameState() });
          return;
        }
      }

      if (action === 'host:command') {
        const { pin, cmdAction, data } = payload || {};
        if (pin === HOST_PIN) {
          if (cmdAction === 'START_EVENT') {
            Object.values(gameState.teams).forEach((t) => (t.currentPhase = 'MISSION_BRIEF'));
          } else if (cmdAction === 'PAUSE') {
            gameState.isPaused = true;
          } else if (cmdAction === 'RESUME') {
            gameState.isPaused = false;
          } else if (cmdAction === 'SET_PHASE_ALL') {
            if (data?.phase) {
              Object.values(gameState.teams).forEach((t) => (t.currentPhase = data.phase));
            }
          } else if (cmdAction === 'RESET_TEAM') {
            if (data?.teamId && gameState.teams[data.teamId]) {
              gameState.teams[data.teamId].currentPhase = 'LOBBY';
              delete gameState.teams[data.teamId].stage4Result;
              delete gameState.teams[data.teamId].stage6Result;
              delete gameState.teams[data.teamId].officialResult;
              gameState.teams[data.teamId].robotHealth = 100;
              gameState.teams[data.teamId].repairKits = 2;
              gameState.teams[data.teamId].logicTests = 4;
              gameState.teams[data.teamId].calibrationAttempts = 3;
            }
          } else if (cmdAction === 'SWITCH_ACTIVE_STATION') {
            if (data?.stationId) {
              gameState.activeStationId = data.stationId;
            }
          }
          updateLeaderboard();
          broadcastState();
        }
        res.json({ success: true, gameState: getSanitizedGameState() });
        return;
      }

      res.json({ success: true, gameState: getSanitizedGameState() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to execute action' });
    }
  });

  // Socket.io Connection & Handlers
  io.on('connection', (socket: Socket) => {
    // Send initial sanitized state to newly connected client
    socket.emit('state:update', getSanitizedGameState());

    // 1. Team Registration & Authoritative Socket Binding
    socket.on('team:join', ({ teamName, stationId }: { teamName: string; stationId: string }) => {
      if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
        socket.emit('error', { message: 'Invalid team name provided.' });
        return;
      }

      const cleanName = teamName.trim().toUpperCase();
      const teamId = `team-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const teamCount = Object.keys(gameState.teams).length;
      const assignedScenario = getRoundRobinScenario(teamCount);

      // Authoritative Socket Binding
      socket.data.teamId = teamId;
      socket.join(`team:${teamId}`);

      if (!gameState.teams[teamId]) {
        gameState.teams[teamId] = {
          teamId,
          teamName: cleanName,
          stationId: stationId || `Station ${teamCount + 1}`,
          scenarioId: assignedScenario.scenarioId,
          currentPhase: 'LOBBY',
          config: { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 },
          controlRules: [],
          isConnected: true,
          robotHealth: 100, hardwarePoints: 300, repairKits: 2, logicTests: 4, calibrationAttempts: 3,
          calibrationProgress: 0, irLeftGain: 0, irRightGain: 0, noiseFilterOffset: 0, frequencyOffset: 0, calibrationQuality: 0,
        };
        addLog('success', `Team registered: ${cleanName} assigned to ${assignedScenario.name}`);
      } else {
        gameState.teams[teamId].isConnected = true;
      }

      updateLeaderboard();
      broadcastState();
    });

    // Helper to verify socket team binding
    function getSocketTeam(): Team | null {
      const teamId = socket.data.teamId;
      if (!teamId || !gameState.teams[teamId]) {
        socket.emit('error', { message: 'You are not assigned to a team.' });
        return null;
      }
      return gameState.teams[teamId];
    }

    // 2. Interactive Sensor Calibration Handler
    socket.on('team:update_calibration', ({ progress, irLeftGain, irRightGain, noiseOffset, frequencyOffset, quality }: any) => {
      const team = getSocketTeam();
      if (!team) return;

      if (typeof progress === 'number') team.calibrationProgress = Math.max(0, Math.min(100, progress));
      if (typeof irLeftGain === 'number') team.irLeftGain = irLeftGain;
      if (typeof irRightGain === 'number') team.irRightGain = irRightGain;
      if (typeof noiseOffset === 'number') team.noiseFilterOffset = noiseOffset;
      if (typeof frequencyOffset === 'number') team.frequencyOffset = frequencyOffset;
      if (typeof quality === 'number') team.calibrationQuality = Math.max(0.5, Math.min(1.2, quality));

      broadcastState();
    });

    // 3. Robot Configuration Handler
    socket.on('team:update_config', ({ config }: { config: Partial<RobotConfig> }) => {
      const team = getSocketTeam();
      if (!team) return;

      team.config = validateConfig(config);
      broadcastState();
    });

    socket.on('team:update_rules', ({ rules }: { rules: any[] }) => {
      const team = getSocketTeam();
      if (!team) return;

      team.controlRules = rules;
      broadcastState();
    });

    // 4. Select Preset Handler
    socket.on('team:select_preset', ({ presetName }: { presetName: keyof typeof DEFAULT_PRESETS }) => {
      const team = getSocketTeam();
      if (!team) return;

      if (DEFAULT_PRESETS[presetName]) {
        team.config = { ...DEFAULT_PRESETS[presetName].config };
        addLog('info', `${team.teamName} selected preset ${presetName}`);
        broadcastState();
      }
    });

    // 5. Player Phase Transition Handler (Enforces State Machine)
    socket.on('team:start_phase', ({ targetPhase }: { targetPhase: GamePhase }) => {
      const team = getSocketTeam();
      if (!team) return;

      // Validate phase transition
      if (!isValidPhaseTransition(team.currentPhase, targetPhase)) {
        socket.emit('phase:error', {
          message: `Invalid phase transition from ${team.currentPhase} to ${targetPhase}.`,
        });
        return;
      }

      team.currentPhase = targetPhase;
      if (targetPhase === 'STAGE_5_DIAGNOSIS' && !team.calibrationState?.faultType) {
        const fault = GAME_CONSTANTS.FAULTS[Math.floor(Math.random() * GAME_CONSTANTS.FAULTS.length)];
        team.calibrationState = { ...team.calibrationState, faultType: fault.type as any } as any;
        addLog('warn', `Fault injected for ${team.teamName}`);
      }
      addLog('info', `${team.teamName} transitioned to ${targetPhase}`);
      broadcastState();
    });

    // 6. Simulation Engine Trigger (Event-Driven Completion)
    socket.on('simulation:run', ({ runType }: { runType: 'STAGE_4' | 'STAGE_6' | 'OFFICIAL' }) => {
      const team = getSocketTeam();
      if (!team) return;

      // Ensure team is in valid configuration phase
      const expectedPhasePrefix = runType.startsWith('STAGE_4')
        ? 'STAGE_4_NAV'
        : runType.startsWith('STAGE_6')
        ? 'STAGE_6_ADVANCED'
        : 'OFFICIAL';

      if (!team.currentPhase.startsWith(expectedPhasePrefix) && !team.currentPhase.startsWith('STAGE_3')) {
        socket.emit('phase:error', { message: `Cannot run ${runType} during phase ${team.currentPhase}` });
        return;
      }

      const scenario = OFFICIAL_SCENARIOS[team.scenarioId] || OFFICIAL_SCENARIOS.SCENARIO_1;
      const calibQuality = team.calibrationQuality || 1.0;

      addLog('info', `Running ${runType} simulation for ${team.teamName}...`);

      // Set temporary running phase
      const runningPhase = `${expectedPhasePrefix}_RUNNING` as GamePhase;
      team.currentPhase = runningPhase;
      broadcastState();

      // Execute simulation engine
      const result = runSimulation(team.config, scenario, runType, calibQuality, team.controlRules || []);
      const scoreBreakdown = calculateScore(result, scenario, calibQuality);

      result.scoreBreakdown = scoreBreakdown;
      result.finalScore = scoreBreakdown.normalizedScore;

      // Store result immediately so UI has ticks, but delay changing phase to let UI animate
      if (runType === 'STAGE_4') {
        team.stage4Result = result;
      } else if (runType === 'STAGE_6') {
        team.stage6Result = result;
      } else if (runType === 'OFFICIAL') {
        team.officialResult = result;
        team.finalScore = result.finalScore;
      }

      updateLeaderboard();
      broadcastState();
      
      const animDurationMs = result.ticks.length * 80 + 1000;
      setTimeout(() => {
        if (team.currentPhase === runningPhase) { // only if hasn't advanced
          if (runType === 'STAGE_4') team.currentPhase = 'STAGE_4_NAV_RESULTS';
          else if (runType === 'STAGE_6') team.currentPhase = 'STAGE_6_ADVANCED_RESULTS';
          else if (runType === 'OFFICIAL') team.currentPhase = 'OFFICIAL_RESULTS';
          
          addLog('success', `${team.teamName} completed ${runType} with score ${result.finalScore}`);
          io.to(`team:${team.teamId}`).emit('simulation:complete', { teamId: team.teamId, result });
          broadcastState();
        }
      }, animDurationMs);
    });

    // 7. Host Authentication
    socket.on('host:auth', ({ pin }: { pin: string }) => {
      if (pin === HOST_PIN) {
        socket.data.isHost = true;
        socket.emit('host:auth_success', { authenticated: true });
        addLog('info', 'Host dashboard authenticated.');
      } else {
        socket.emit('host:error', 'Invalid Host PIN');
      }
    });

    // 8. Authorized Host Commands
    socket.on('host:command', ({ pin, action, data }: { pin: string; action: string; data?: any }) => {
      // Validate Host Authentication
      if (!socket.data.isHost && pin !== HOST_PIN) {
        socket.emit('host:error', 'Unauthorized host command');
        return;
      }

      socket.data.isHost = true;

      if (action === 'START_EVENT') {
        Object.values(gameState.teams).forEach((t) => (t.currentPhase = 'MISSION_BRIEF'));
        addLog('info', 'Host started the event.');
      } else if (action === 'PAUSE') {
        gameState.isPaused = true;
        addLog('warn', 'Event paused by Host.');
      } else if (action === 'RESUME') {
        gameState.isPaused = false;
        addLog('info', 'Event resumed by Host.');
      } else if (action === 'SET_PHASE_ALL') {
        if (data?.phase) {
          Object.values(gameState.teams).forEach((t) => (t.currentPhase = data.phase));
          addLog('info', `Host moved all teams to phase ${data.phase}`);
        }
      } else if (action === 'FORCE_SUBMIT_ALL') {
        Object.values(gameState.teams).forEach((t) => (t.currentPhase = 'FINAL_SCORE'));
        addLog('warn', 'Host force submitted all teams.');
      } else if (action === 'RESET_DATA') {
        gameState.teams = {};
        gameState.leaderboard = [];
        addLog('warn', 'Host reset all game data.');
      } else if (action === 'RESET_TEAM') {
        if (data?.teamId && gameState.teams[data.teamId]) {
          gameState.teams[data.teamId].currentPhase = 'LOBBY';
          delete gameState.teams[data.teamId].stage4Result;
          delete gameState.teams[data.teamId].stage6Result;
          delete gameState.teams[data.teamId].officialResult;
          gameState.teams[data.teamId].robotHealth = 100;
          gameState.teams[data.teamId].repairKits = 2;
          gameState.teams[data.teamId].logicTests = 4;
          gameState.teams[data.teamId].calibrationAttempts = 3;
          addLog('warn', `Host reset team ${gameState.teams[data.teamId].teamName}`);
        }
      } else if (action === 'SWITCH_ACTIVE_STATION') {
        if (data?.stationId) {
          gameState.activeStationId = data.stationId;
          addLog('info', `Active camera station switched to ${data.stationId}`);
        }
      }

      updateLeaderboard();
      broadcastState();
    });

    socket.on('team:force_submit', () => {
      const team = getSocketTeam();
      if (!team) return;
      team.currentPhase = 'FINAL_SCORE';
      addLog('warn', `${team.teamName} was force submitted (Auto-Trigger).`);
      updateLeaderboard();
      broadcastState();
    });

    socket.on('disconnect', () => {
      if (socket.data.teamId && gameState.teams[socket.data.teamId]) {
        gameState.teams[socket.data.teamId].isConnected = false;
        broadcastState();
      }
    });
  });

  // Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--prod')) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MATLAB-MechControl Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
