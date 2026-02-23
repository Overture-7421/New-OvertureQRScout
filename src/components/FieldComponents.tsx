import React, { useState, useEffect, useRef } from 'react';
import type { FieldConfig } from '../types';
import './FieldComponents.css';

interface TextFieldProps {
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}

export const TextField: React.FC<TextFieldProps> = ({ config, value, onChange }) => {
  return (
    <div className="field-container">
      <label className="field-label">{config.label}</label>
      <input
        type="text"
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.label}
      />
    </div>
  );
};

interface NumberFieldProps {
  config: FieldConfig;
  value: number;
  onChange: (value: number) => void;
}

export const NumberField: React.FC<NumberFieldProps> = ({ config, value, onChange }) => {
  return (
    <div className="field-container">
      <label className="field-label">{config.label}</label>
      <input
        type="number"
        className="number-input"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={config.label}
      />
    </div>
  );
};

interface DropdownFieldProps {
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}

export const DropdownField: React.FC<DropdownFieldProps> = ({ config, value, onChange }) => {
  return (
    <div className="field-container">
      <label className="field-label">{config.label}</label>
      <select
        className="dropdown-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select...</option>
        {config.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

interface SwitchFieldProps {
  config: FieldConfig;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({ config, value, onChange }) => {
  return (
    <div className="field-container switch-container">
      <label className="field-label">{config.label}</label>
      <button
        className={`switch-button ${value ? 'switch-active' : ''}`}
        onClick={() => onChange(!value)}
      >
        {value ? 'YES' : 'NO'}
      </button>
    </div>
  );
};

interface CounterFieldProps {
  config: FieldConfig;
  value: number;
  onChange: (value: number) => void;
}

export const CounterField: React.FC<CounterFieldProps> = ({ config, value, onChange }) => {
  return (
    <div className="field-container">
      <label className="field-label">{config.label}</label>
      <div className="counter-controls">
        <button
          className="counter-button counter-decrement"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          −
        </button>
        <span className="counter-value">{value || 0}</span>
        <button
          className="counter-button counter-increment"
          onClick={() => onChange((value || 0) + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
};

interface ChronoFieldProps {
  config: FieldConfig;
  value: number; // elapsed seconds (e.g. 12.3)
  onChange: (value: number) => void;
}

export const ChronoField: React.FC<ChronoFieldProps> = ({ config, value, onChange }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [displayMs, setDisplayMs] = useState(Math.round(value * 1000));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(Math.round(value * 1000));
  const isRunningRef = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref fresh to avoid stale closure in cleanup
  onChangeRef.current = onChange;

  // When parent resets value to 0, stop and clear the chrono
  useEffect(() => {
    if (value === 0 && (isRunningRef.current || baseElapsedRef.current > 0)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      isRunningRef.current = false;
      setIsRunning(false);
      baseElapsedRef.current = 0;
      setDisplayMs(0);
    }
  }, [value]);

  // On unmount: stop interval and commit elapsed to parent if timer was running
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (isRunningRef.current) {
        const finalMs = baseElapsedRef.current + (Date.now() - startTimeRef.current);
        onChangeRef.current(Math.round(finalMs / 100) / 10);
      }
    };
  }, []);

  const formatTime = (ms: number): string => {
    const totalTenths = Math.floor(ms / 100);
    const tenths = totalTenths % 10;
    const totalSecs = Math.floor(totalTenths / 10);
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60);
    if (mins > 0) {
      return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
    }
    return `${String(secs).padStart(2, '0')}.${tenths}s`;
  };

  const handleStartStop = () => {
    if (isRunningRef.current) {
      // STOP
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      const finalMs = baseElapsedRef.current + (Date.now() - startTimeRef.current);
      baseElapsedRef.current = finalMs;
      isRunningRef.current = false;
      setIsRunning(false);
      setDisplayMs(finalMs);
      onChange(Math.round(finalMs / 100) / 10);
    } else {
      // START / RESUME
      startTimeRef.current = Date.now();
      isRunningRef.current = true;
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setDisplayMs(baseElapsedRef.current + (Date.now() - startTimeRef.current));
      }, 100);
    }
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    isRunningRef.current = false;
    setIsRunning(false);
    baseElapsedRef.current = 0;
    setDisplayMs(0);
    onChange(0);
  };

  return (
    <div className="field-container">
      <label className="field-label">{config.label}</label>
      <div className={`chrono-display${isRunning ? ' chrono-display-running' : ''}`}>
        {formatTime(displayMs)}
      </div>
      <div className="chrono-controls">
        <button
          className={`chrono-startstop${isRunning ? ' chrono-running' : displayMs > 0 ? ' chrono-paused' : ''}`}
          onClick={handleStartStop}
        >
          {isRunning ? '⏹ STOP' : displayMs > 0 ? '▶ RESUME' : '▶ START'}
        </button>
        <button
          className="chrono-reset"
          onClick={handleReset}
          disabled={displayMs === 0 && !isRunning}
          title="Reset timer"
        >
          ↺
        </button>
      </div>
    </div>
  );
};
