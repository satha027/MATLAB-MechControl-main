import React, { useState } from 'react';
import { ControlRule, SensorType, RuleOperator, RuleAction } from '../types';

interface ControlLogicBuilderProps {
  rules: ControlRule[];
  onChange: (rules: ControlRule[]) => void;
}

export const ControlLogicBuilder: React.FC<ControlLogicBuilderProps> = ({ rules, onChange }) => {
  const addRule = () => {
    if (rules.length >= 6) return;
    const newRule: ControlRule = {
      id: Math.random().toString(36).substr(2, 9),
      condition: {
        sensor: 'front',
        operator: '<',
        value: 3.0,
      },
      action: 'BRAKE',
      priority: rules.length + 1,
    };
    onChange([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id).map((r, i) => ({ ...r, priority: i + 1 })));
  };

  const updateRule = (id: string, updates: Partial<ControlRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= rules.length) return;
    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[index + direction];
    newRules[index + direction] = temp;
    
    // Re-assign priorities
    onChange(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-label-caps text-primary-fixed uppercase tracking-widest block font-bold">
          <span className="material-symbols-outlined text-xs align-middle mr-1">data_object</span>
          CONTROL LOGIC PROGRAMMER ({rules.length}/6)
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange([])}
            className="text-[10px] text-red-400 hover:text-red-300 font-label-caps uppercase"
            disabled={rules.length === 0}
          >
            CLEAR ALL
          </button>
          <button
            onClick={addRule}
            className="bg-primary-fixed text-on-primary px-3 py-1 rounded text-[10px] font-label-caps uppercase font-bold disabled:opacity-50 flex items-center gap-1"
            disabled={rules.length >= 6}
          >
            <span className="material-symbols-outlined text-xs">add</span> ADD RULE
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rules.map((rule, idx) => (
          <div key={rule.id} className="bg-surface-container-high/40 border border-outline-variant/30 rounded p-2 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-label-caps text-on-surface-variant mb-1">
              <div className="flex items-center gap-2">
                <span className="bg-surface-container text-white px-1.5 py-0.5 rounded border border-outline-variant/50">
                  RULE #{rule.priority}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveRule(idx, -1)} disabled={idx === 0} className="hover:text-primary-fixed disabled:opacity-30">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                </button>
                <button onClick={() => moveRule(idx, 1)} disabled={idx === rules.length - 1} className="hover:text-primary-fixed disabled:opacity-30">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                </button>
                <button onClick={() => removeRule(rule.id)} className="text-red-400 hover:text-red-300 ml-2">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-code-snippet text-tertiary-fixed font-bold">IF</span>
              
              <select 
                value={rule.condition.sensor}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, sensor: e.target.value as SensorType } })}
                className="bg-surface-container-highest border border-outline-variant text-[11px] rounded px-1.5 py-1 text-on-surface font-code-snippet outline-none"
              >
                <option className="bg-[#101218]" value="front">Front Sensor</option>
                <option className="bg-[#101218]" value="frontLeft">Front-Left Sensor</option>
                <option className="bg-[#101218]" value="frontRight">Front-Right Sensor</option>
                <option className="bg-[#101218]" value="left">Left Sensor</option>
                <option className="bg-[#101218]" value="right">Right Sensor</option>
                <option className="bg-[#101218]" value="battery">Battery %</option>
                <option className="bg-[#101218]" value="speed">Speed (m/s)</option>
                <option className="bg-[#101218]" value="target_is_left">Target is Left (0/1)</option>
                <option className="bg-[#101218]" value="target_is_right">Target is Right (0/1)</option>
                <option className="bg-[#101218]" value="target_is_front">Target is Front (0/1)</option>
              </select>

              <select 
                value={rule.condition.operator}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, operator: e.target.value as RuleOperator } })}
                className="bg-surface-container-highest border border-outline-variant text-[11px] rounded px-1.5 py-1 text-primary-fixed font-code-snippet outline-none"
              >
                <option className="bg-[#101218]" value="<">&lt;</option>
                <option className="bg-[#101218]" value="<=">&le;</option>
                <option className="bg-[#101218]" value="==">==</option>
                <option className="bg-[#101218]" value=">=">&ge;</option>
                <option className="bg-[#101218]" value=">">&gt;</option>
              </select>

              <input
                type="number"
                value={rule.condition.value}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, value: parseFloat(e.target.value) || 0 } })}
                className="bg-surface-container-highest border border-outline-variant text-[11px] rounded px-1.5 py-1 w-16 text-on-surface font-code-snippet outline-none"
                step="0.1"
              />

              <span className="text-[11px] font-code-snippet text-tertiary-fixed font-bold ml-1">THEN</span>

              <select 
                value={rule.action}
                onChange={(e) => updateRule(rule.id, { action: e.target.value as RuleAction })}
                className="bg-primary-container text-on-primary-container border border-primary-fixed/50 text-[11px] font-bold rounded px-2 py-1 font-code-snippet outline-none"
              >
                <option className="bg-[#101218]" value="BRAKE">BRAKE</option>
                <option className="bg-[#101218]" value="REDUCE_SPEED">REDUCE_SPEED</option>
                <option className="bg-[#101218]" value="TURN_LEFT">TURN_LEFT</option>
                <option className="bg-[#101218]" value="TURN_RIGHT">TURN_RIGHT</option>
                <option className="bg-[#101218]" value="ACCELERATE">ACCELERATE</option>
                <option className="bg-[#101218]" value="REVERSE">REVERSE</option>
              </select>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-[11px] text-on-surface-variant font-code-snippet p-4 text-center border border-dashed border-outline-variant/30 rounded bg-surface-container-lowest/50">
            No rules defined. Robot will default to straight-line ACCELERATE.
          </div>
        )}
        
        <div className="bg-surface-container-highest/50 border border-outline-variant/30 rounded p-2 flex items-center justify-between">
            <span className="text-[11px] font-code-snippet text-on-surface-variant">DEFAULT ACTION (IF NO RULES MATCH)</span>
            <span className="text-[11px] font-code-snippet text-primary-fixed font-bold bg-primary-container/20 px-2 py-1 rounded border border-primary-fixed/30">
              ACCELERATE
            </span>
        </div>
      </div>
    </div>
  );
};
