import React, { useEffect, useRef, useState } from 'react';
import { RobotConfig, Scenario, SimulationTick } from '../types';

interface ArenaCanvasProps {
  scenario: Scenario;
  config: RobotConfig;
  ticks?: SimulationTick[];
  isRunning?: boolean;
  onRunSimulation?: () => void;
  onResetSimulation?: () => void;
  runTitle?: string;
}

const WAYPOINTS = [
  { x: 10, y: 80, label: 'START',      color: '#00f2ff' },
  { x: 35, y: 45, label: 'NAV',        color: '#f59e0b' },
  { x: 65, y: 25, label: 'PICKUP',     color: '#a78bfa' },
  { x: 90, y: 80, label: 'TARGET',     color: '#79ff5b' },
];

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  scenario,
  config,
  ticks = [],
  isRunning = false,
  onRunSimulation,
  onResetSimulation,
  runTitle = 'SIMULATION ARENA',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentTickIndex, setCurrentTickIndex] = useState<number>(0);
  const scanLineRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Auto-advance playback ticks when simulation ticks exist
  useEffect(() => {
    if (!ticks || ticks.length === 0) {
      setCurrentTickIndex(0);
      return;
    }
    if (isRunning) {
      setCurrentTickIndex(0);
      const interval = setInterval(() => {
        setCurrentTickIndex((prev) => {
          if (prev >= ticks.length - 1) { clearInterval(interval); return ticks.length - 1; }
          return prev + 1;
        });
      }, 80); // slightly faster playback
      return () => clearInterval(interval);
    } else {
      setCurrentTickIndex(ticks.length - 1);
    }
  }, [ticks, isRunning]);

  const activeTick = ticks[currentTickIndex] || {
    x: 10, y: 80, angle: 0, speed: 0,
    battery: scenario.startingBattery, checkpointIndex: 0,
    hasPayload: false, isCollision: false, sensorDistance: 10,
    steeringAngle: 0, collisions: 0,
  };

  // Draw the 2D arena canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const scaleX = width / 100;
    const scaleY = height / 100;

    // 1. Background
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 10) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Subtle arena corner markers
    const corners = [[0,0],[width,0],[0,height],[width,height]];
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.lineWidth = 2;
    corners.forEach(([cx, cy]) => {
      const sx = cx === 0 ? 1 : -1;
      const sy = cy === 0 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(cx, cy + sy * 20); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 20, cy); ctx.stroke();
    });

    // 2. Draw Waypoint path line (dashed)
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    WAYPOINTS.forEach((wp, i) => {
      const wx = wp.x * scaleX; const wy = wp.y * scaleY;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw Obstacles
    scenario.obstacles.forEach((obs) => {
      // For moving obstacles, show their runtime position if ticks available
      let renderX = obs.x;
      if (obs.type === 'moving' && ticks.length > 0) {
        const t = activeTick.timeSeconds || 0;
        const cycleSec = obs.movingCycleSeconds || 5;
        const maxOsc = Math.min(15, obs.x - 5, 95 - obs.x - obs.width);
        const osc = Math.sin(((t % cycleSec) / cycleSec) * Math.PI * 2) * Math.max(0, maxOsc);
        renderX = Math.max(2, Math.min(98 - obs.width, obs.x + osc));
      }

      const ox = renderX * scaleX;
      const oy = obs.y * scaleY;
      const ow = obs.width * scaleX;
      const oh = obs.height * scaleY;
      const left = ox - ow / 2;
      const top  = oy - oh / 2;

      const styles: Record<string, { fill: string; stroke: string; dash?: number[] }> = {
        static:  { fill: 'rgba(100, 80, 50, 0.55)', stroke: '#ff9100' },
        moving:  { fill: 'rgba(255, 51, 51, 0.35)', stroke: '#ff3333', dash: [4,4] },
        hidden:  { fill: 'rgba(150, 50, 150, 0.25)', stroke: '#bf5af2', dash: [3,5] },
        narrow:  { fill: 'rgba(50, 60, 70, 0.75)', stroke: '#64748b' },
        charging: { fill: 'rgba(121, 255, 91, 0.15)', stroke: '#79ff5b', dash: [2,6] },
        hazard:  { fill: 'rgba(255, 100, 50, 0.25)', stroke: '#ff5a1f', dash: [5,5] },
      };
      const st = styles[obs.type] || styles.static;
      ctx.setLineDash(st.dash || []);
      ctx.fillStyle = st.fill;
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = obs.type === 'moving' ? 2 : 1.5;
      ctx.fillRect(left, top, ow, oh);
      ctx.strokeRect(left, top, ow, oh);
      ctx.setLineDash([]);

      // Obstacle type badge label
      ctx.fillStyle = st.stroke;
      ctx.font = 'bold 8px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(obs.type.toUpperCase(), ox, oy + 3);
      ctx.textAlign = 'left';
    });

    // 4. Draw Trajectory Trail with fade
    if (ticks.length > 0) {
      const subTicks = ticks.slice(0, currentTickIndex + 1);
      const step = Math.max(1, Math.floor(subTicks.length / 300)); // downsample for perf
      ctx.lineWidth = 1.5;
      for (let i = step; i < subTicks.length; i += step) {
        const t0 = subTicks[i - step];
        const t1 = subTicks[i];
        const alpha = 0.1 + (i / subTicks.length) * 0.7;
        const isHit = t1.isCollision;
        ctx.strokeStyle = isHit ? `rgba(255,60,60,${alpha})` : `rgba(121,255,91,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(t0.x * scaleX, t0.y * scaleY);
        ctx.lineTo(t1.x * scaleX, t1.y * scaleY);
        ctx.stroke();
      }
    }

    // 5. Draw Waypoint circles
    WAYPOINTS.forEach((wp, idx) => {
      const wx = wp.x * scaleX;
      const wy = wp.y * scaleY;
      const isReached = activeTick.checkpointIndex >= idx;
      const radius = idx === 0 || idx === 3 ? 9 : 7;

      // Glow ring
      if (isReached) {
        ctx.beginPath();
        ctx.arc(wx, wy, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${wp.color}22`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isReached ? `${wp.color}44` : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = isReached ? wp.color : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isReached ? 2 : 1;
      ctx.stroke();

      // Number
      ctx.fillStyle = isReached ? wp.color : 'rgba(255,255,255,0.5)';
      ctx.font = `bold 9px JetBrains Mono`;
      ctx.textAlign = 'center';
      ctx.fillText(String(idx), wx, wy + 3.5);

      // Label below
      ctx.fillStyle = isReached ? wp.color : 'rgba(255,255,255,0.3)';
      ctx.font = '7px JetBrains Mono';
      ctx.fillText(wp.label, wx, wy + radius + 10);
      ctx.textAlign = 'left';
    });

    // 6. Draw Robot
    const rx = activeTick.x * scaleX;
    const ry = activeTick.y * scaleY;
    const rad = (activeTick.angle * Math.PI) / 180;

    // 5-Ray Sensor cones
    const baseRange = (config.sensorRange / 100) * 12 * scaleX * 0.38;
    const sensorRays = [
      { id: 'left', offset: -Math.PI / 3, dist: activeTick.sensors?.left ?? baseRange },
      { id: 'frontLeft', offset: -Math.PI / 6, dist: activeTick.sensors?.frontLeft ?? baseRange },
      { id: 'front', offset: 0, dist: activeTick.sensors?.front ?? baseRange },
      { id: 'frontRight', offset: Math.PI / 6, dist: activeTick.sensors?.frontRight ?? baseRange },
      { id: 'right', offset: Math.PI / 3, dist: activeTick.sensors?.right ?? baseRange },
    ];

    sensorRays.forEach(ray => {
      // Draw as a narrow sector (ray)
      const rayLen = Math.min(baseRange, ray.dist * scaleX * 0.38); // max at baseRange
      const rayAngle = rad + ray.offset;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.arc(rx, ry, rayLen, rayAngle - 0.05, rayAngle + 0.05);
      ctx.closePath();
      ctx.fillStyle = activeTick.isCollision ? 'rgba(255,51,51,0.15)' : 'rgba(0, 242, 255, 0.15)';
      ctx.fill();
      ctx.strokeStyle = activeTick.isCollision ? 'rgba(255,51,51,0.5)' : 'rgba(0, 242, 255, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Robot body
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rad);

    const bodyColor = activeTick.isCollision ? '#ff3333' : '#00f2ff';
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = activeTick.isCollision ? 16 : 8;

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-9, -7, 18, 14);

    ctx.fillStyle = '#060810';
    ctx.fillRect(-6, -4.5, 12, 9);

    // Front light
    ctx.fillStyle = activeTick.hasPayload ? '#a78bfa' : '#79ff5b';
    ctx.shadowColor = activeTick.hasPayload ? '#a78bfa' : '#79ff5b';
    ctx.shadowBlur = 8;
    ctx.fillRect(7, -2, 4, 4);

    ctx.restore();
    ctx.shadowBlur = 0;

    // Scanlines overlay when running
    if (isRunning) {
      for (let sy = 0; sy < height; sy += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, sy, width, 1);
      }
    }

  }, [scenario, config, ticks, currentTickIndex, activeTick, isRunning]);

  const targetDistMeters = Math.max(
    0,
    Math.sqrt(Math.pow(90 - activeTick.x, 2) + Math.pow(80 - activeTick.y, 2)) / 2.5
  ).toFixed(1);

  const batteryPct = activeTick.battery;
  const batteryColor = batteryPct > 40 ? '#79ff5b' : batteryPct > 20 ? '#f59e0b' : '#f87171';

  const healthPct = Math.max(0, 100 - activeTick.collisions * 25);
  const healthColor = healthPct > 50 ? '#00f2ff' : healthPct > 0 ? '#f59e0b' : '#f87171';

  const progressPct = ticks.length > 0 ? Math.round((currentTickIndex / (ticks.length - 1)) * 100) : 0;

  return (
    <div className="glass-panel rounded-lg flex flex-col relative overflow-hidden border border-primary-container/30 shadow-[0_0_20px_rgba(0,242,255,0.1)] bg-[#0c0e12]/90 w-full h-full min-h-[380px]">
      {/* Header Bar */}
      <div className="p-3 px-4 border-b border-outline-variant/50 bg-[#0e1015] flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-red-400 animate-ping' : 'bg-tertiary-fixed animate-pulse'}`}></div>
          <span className="text-xs font-label-caps text-on-surface uppercase tracking-wider font-bold">
            {isRunning ? '⚡ SIMULATING...' : runTitle} — {scenario.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ticks.length > 0 && !isRunning && (
            <span className="text-[10px] font-code-snippet text-on-surface-variant">
              {currentTickIndex + 1}/{ticks.length} ticks
            </span>
          )}
          {onResetSimulation && (
            <button
              onClick={onResetSimulation}
              className="bg-surface-container-highest border border-amber-500 text-amber-400 hover:bg-amber-500/10 px-3 py-1 rounded text-xs font-label-caps uppercase transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>RESET
            </button>
          )}
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              disabled={isRunning}
              className="bg-tertiary-fixed-dim text-on-tertiary px-4 py-1.5 rounded font-bold hover:bg-tertiary-fixed transition-colors text-xs font-label-caps uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(42,229,0,0.3)] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              {isRunning ? 'SIMULATING...' : 'RUN'}
            </button>
          )}
        </div>
      </div>

      {/* Playback progress bar */}
      {ticks.length > 0 && (
        <div className="h-0.5 w-full bg-surface-container-highest">
          <div
            className="h-full bg-tertiary-fixed transition-all duration-75"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-2 bg-[#05070a]">
        <canvas ref={canvasRef} width={600} height={400} className="w-full h-full object-contain rounded border border-outline-variant/20" />

        {/* Running overlay */}
        {isRunning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="bg-black/50 backdrop-blur-sm border border-primary-fixed/30 rounded-lg px-6 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-fixed animate-spin">settings</span>
              <span className="text-primary-fixed font-label-caps text-sm font-bold tracking-widest">SIMULATION RUNNING</span>
            </div>
          </div>
        )}

        {/* Mini Map */}
        <div className="absolute top-3 right-3 bg-surface-glass backdrop-blur-md border border-outline-variant rounded p-2 w-36 pointer-events-auto hidden sm:block">
          <div className="text-[9px] font-label-caps text-on-surface-variant mb-1 uppercase tracking-wider">MINI MAP</div>
          <div className="aspect-square bg-[#050508] border border-outline-variant/50 rounded relative overflow-hidden">
            {/* Waypoint dots */}
            {WAYPOINTS.map((wp, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{ left: `${wp.x}%`, top: `${wp.y}%`, background: wp.color, transform: 'translate(-50%,-50%)' }}
              />
            ))}
            {/* Robot dot */}
            <div
              className="absolute w-2.5 h-2.5 rounded-full shadow-[0_0_6px_rgba(0,242,255,0.9)] transition-all duration-100"
              style={{
                left: `${activeTick.x}%`,
                top: `${activeTick.y}%`,
                background: activeTick.isCollision ? '#ff3333' : '#00f2ff',
                transform: 'translate(-50%,-50%)',
              }}
            />
          </div>
        </div>

        {/* Telemetry HUD */}
        <div className="absolute bottom-3 right-3 bg-surface-container-lowest/90 backdrop-blur border border-outline-variant p-3 rounded flex flex-col gap-2 w-48 text-xs">
          {/* Battery */}
          <div>
            <div className="flex justify-between font-code-snippet text-on-surface-variant text-[11px] mb-1">
              <span>BATTERY</span>
              <span style={{ color: batteryColor }} className="font-bold">{batteryPct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-bright rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${batteryPct}%`, background: batteryColor }} />
            </div>
          </div>

          {/* Health */}
          <div>
            <div className="flex justify-between font-code-snippet text-on-surface-variant text-[11px] mb-1">
              <span>HULL INTEGRITY</span>
              <span style={{ color: healthColor }} className="font-bold">{healthPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-bright rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${healthPct}%`, background: healthColor }} />
            </div>
          </div>

          <div className="flex justify-between border-t border-outline-variant/30 pt-1">
            <span className="font-label-caps text-on-surface-variant uppercase text-[9px]">DIST TO TGT</span>
            <span className="font-telemetry-data text-primary-fixed font-bold">{targetDistMeters}m</span>
          </div>

          <div>
            <div className="flex justify-between font-code-snippet text-on-surface-variant text-[11px] mb-1">
              <span>VELOCITY</span>
              <span className="text-white font-bold">{activeTick.speed.toFixed(1)} m/s</span>
            </div>
            <div className="h-1 w-full bg-surface-bright rounded overflow-hidden">
              <div
                className="h-full bg-primary-container transition-all"
                style={{ width: `${Math.min(100, (activeTick.speed / 3.5) * 100)}%` }}
              />
            </div>
          </div>

          {activeTick.collisions > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="font-label-caps text-on-surface-variant text-[9px]">COLLISIONS</span>
              <span className="text-red-400 font-bold">{activeTick.collisions}</span>
            </div>
          )}

          {activeTick.hasPayload && (
            <div className="text-[9px] font-label-caps text-violet-400 border border-violet-400/40 rounded px-1 py-0.5 text-center">
              📦 PAYLOAD SECURED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
