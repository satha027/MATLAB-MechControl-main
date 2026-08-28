import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';

export const HardwareConfigurator: React.FC = () => {
  const { currentTeam, updateConfig, startPhase } = useGameSocket();
  const [localConfig, setLocalConfig] = useState(
    currentTeam?.config || { speed: 0, motorPower: 0, sensorRange: 0, steering: 0, sensorSensitivity: 0, brakeStrength: 0 }
  );
  
  // Calculate remaining points from a pool of 300
  const usedPoints = Object.values(localConfig).reduce((acc, val) => acc + val, 0);
  const remainingPoints = (currentTeam?.hardwarePoints || 300) - usedPoints;

  if (!currentTeam) return null;

  const handleApplyUpgrade = (stat: keyof typeof localConfig, amount: number) => {
    setLocalConfig(prev => {
      const currentVal = prev[stat];
      const maxAdd = Math.min(amount, 100 - currentVal);
      const actualAdd = Math.min(maxAdd, remainingPoints);
      
      if (actualAdd <= 0 && amount > 0) return prev;
      
      const newVal = Math.max(0, currentVal + (amount > 0 ? actualAdd : amount));
      
      return {
        ...prev,
        [stat]: newVal
      };
    });
  };

  const handleConfirm = () => {
    updateConfig(localConfig);
    startPhase('STAGE_3_LOGIC');
  };

  const StatBlock = ({ label, stat, desc }: { label: string, stat: keyof typeof localConfig, desc: string }) => (
    <div className="border border-outline-variant/30 rounded-lg p-4 bg-[#101218]">
      <h3 className="text-primary-fixed font-label-caps font-bold mb-2">{label}</h3>
      <p className="text-xs text-on-surface-variant mb-4 h-8">{desc}</p>
      <div className="flex justify-between items-center mb-4 text-xs font-code-snippet">
        <span>Level:</span>
        <span className="text-white">{localConfig[stat]}%</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleApplyUpgrade(stat, -10)}
          disabled={localConfig[stat] <= 0}
          className="flex-1 bg-surface-container-highest hover:bg-red-900/30 border border-outline-variant text-xs py-1.5 rounded uppercase text-on-surface disabled:opacity-50"
        >
          -10
        </button>
        <button
          onClick={() => handleApplyUpgrade(stat, 10)}
          disabled={remainingPoints < 10 || localConfig[stat] >= 100}
          className="flex-1 bg-surface-container-highest hover:bg-primary-container/20 border border-outline-variant text-xs py-1.5 rounded uppercase text-on-surface disabled:opacity-50"
        >
          +10
        </button>
      </div>
    </div>
  );

  return (
    <div className="glass-panel p-6 rounded-lg border border-primary-container/40 bg-[#0e1015]/90 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-xl font-headline-md text-primary-fixed uppercase tracking-wider font-bold">
            STAGE 2: HARDWARE CONFIGURATION
          </h2>
          <p className="text-sm font-code-snippet text-on-surface-variant mt-1">
            Allocate your Hardware Points to build the robot's physical capabilities from scratch.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-highest px-4 py-2 rounded-lg border border-outline-variant/30">
          <span className="text-xs font-label-caps text-on-surface-variant uppercase">Available Points:</span>
          <span className="text-amber-400 font-bold text-xl">{remainingPoints}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatBlock label="POWER CELL (SPEED)" stat="speed" desc="Enhances top speed capabilities on straightaways." />
        <StatBlock label="MOTOR TORQUE" stat="motorPower" desc="Increases acceleration and ability to carry heavy payloads." />
        <StatBlock label="LIDAR RANGE" stat="sensorRange" desc="Boosts maximum distance for obstacle detection." />
        <StatBlock label="STEERING SERVO" stat="steering" desc="Improves turn rate and cornering agility." />
        <StatBlock label="SENSOR SENSITIVITY" stat="sensorSensitivity" desc="Required to detect hidden mines and navigate blackout conditions." />
        <StatBlock label="BRAKE CALIPERS" stat="brakeStrength" desc="Increases deceleration rate to avoid collisions." />
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/30">
        <span className="text-xs text-on-surface-variant">Warning: Unallocated points are lost.</span>
        <button
          onClick={handleConfirm}
          className="bg-primary-container text-on-primary-container hover:bg-primary-fixed font-bold px-8 py-3 rounded text-sm font-label-caps uppercase transition-colors"
        >
          CONFIRM CONFIGURATION
        </button>
      </div>
    </div>
  );
};
