import React, { useState } from 'react';
import { useGameSocket } from '../context/GameSocketContext';

interface LoginProps {
  onLogin: () => void;
  onHostLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onHostLogin }) => {
  const [teamName, setTeamName] = useState('');
  
  const { joinTeam } = useGameSocket();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    
    joinTeam(teamName, teamName);
    onLogin();
  };

  return (
    <div className="h-screen w-full bg-[#05070a] flex items-center justify-center relative overflow-hidden font-sans">
      {/* Simple robotics-themed background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,242,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-fixed/5 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary-fixed/5 rounded-full blur-[100px] animate-pulse-glow" />
      </div>

      <div className="z-10 w-full max-w-md p-8 bg-surface-glass border border-outline-variant rounded-xl shadow-2xl backdrop-blur-xl animate-fade-in relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary-fixed to-transparent opacity-50" />
        
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-5xl text-primary-fixed mb-2 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">
            precision_manufacturing
          </span>
          <h1 className="text-3xl font-headline-md font-bold text-white tracking-widest">
            MATLAB-<br /><span className="text-primary-fixed">MECHCONTROL</span>
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm uppercase tracking-wider font-telemetry-data">
            Secure Authentication Gateway
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Team Name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-[#101218] border border-outline-variant rounded px-4 py-3 text-white placeholder-on-surface-variant/50 focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all font-telemetry-data"
              placeholder="e.g. Mech Masters"
            />
          </div>



          <button
            type="submit"
            className="w-full bg-primary-container text-on-primary-container font-bold py-3 rounded-lg text-sm font-label-caps uppercase tracking-wider hover:bg-primary-fixed hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all mt-6"
          >
            INITIALIZE UPLINK
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onHostLogin}
            className="text-xs text-on-surface-variant hover:text-white transition-colors underline decoration-on-surface-variant/50 hover:decoration-white font-telemetry-data"
          >
            Host / Admin Login
          </button>
        </div>
      </div>
    </div>
  );
};
