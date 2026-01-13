import React from 'react';
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
