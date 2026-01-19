import { useState, useEffect } from 'react';
import type { EventConfig, Personnel, ShiftConfig, GeneratedSchedule, ScheduleConstraints, ScheduleValidationError } from '../types';
import {
  calculateTurns,
  generateSchedule,
  exportToCSV,
  exportEventConfig,
  exportPersonnel,
  exportFullSchedule,
  getScouterStats,
  getPositions
} from '../utils/scheduleGenerator';
import './ScheduleConfigModal.css';

interface ScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleGenerated: (schedule: GeneratedSchedule) => void;
  selectedProgram: 'FTC' | 'FRC' | 'custom';
}

type ConfigTab = 'event' | 'personnel' | 'shifts' | 'timetable' | 'export';

const SCHEDULE_PASSWORD = 'OVT2026_schedule!';

const getDefaultEventConfig = (program: 'FTC' | 'FRC' | 'custom'): EventConfig => {
  if (program === 'FTC') {
    return {
      localLabel: 'FTC Event 2026',
      tbaLabel: 'FTCScout',
      amountOfTeams: 30,
      matchesPerTeam: 5,
      totalMatches: 45,
      teamsPerMatch: 4,
      allianceBlue: 'Blue',
      allianceRed: 'Red',
      isPractice: false
    };
  }
  // FRC or custom defaults
  return {
    localLabel: 'Regional MTY 2026',
    tbaLabel: '2025mxmo',
    amountOfTeams: 60,
    matchesPerTeam: 8,
    totalMatches: 72,
    teamsPerMatch: 6,
    allianceBlue: 'Blue',
    allianceRed: 'Red',
    isPractice: false
  };
};

const defaultPersonnel: Personnel = {
  leadScouters: ['Lead Scouter 1', 'Lead Scouter 2', 'Lead Scouter 3'],
  scouters: ['Scouter 1', 'Scouter 2', 'Scouter 3', 'Scouter 4', 'Scouter 5', 'Scouter 6'],
  cameras: ['Camera 1', 'Camera 2', 'Camera 3']
};

export const ScheduleConfigModal: React.FC<ScheduleConfigModalProps> = ({
  isOpen,
  onClose,
  onScheduleGenerated,
  selectedProgram
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<ConfigTab>('event');

  // Configuration state
  const [eventConfig, setEventConfig] = useState<EventConfig>(getDefaultEventConfig(selectedProgram));
  const [personnel, setPersonnel] = useState<Personnel>(defaultPersonnel);
  const [breakPoints, setBreakPoints] = useState<number[]>(selectedProgram === 'FTC' ? [15, 30] : [20, 40]);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);

  // Constraints state
  const [maxMatchesPerScouter, setMaxMatchesPerScouter] = useState<number | null>(null);
  const [useMaxMatchesLimit, setUseMaxMatchesLimit] = useState(false);

  // Error/warning state
  const [generationErrors, setGenerationErrors] = useState<ScheduleValidationError[]>([]);
  const [generationWarnings, setGenerationWarnings] = useState<ScheduleValidationError[]>([]);

  // Reset authentication when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAuthenticated(false);
      setPasswordInput('');
      setPasswordError('');
    }
  }, [isOpen]);

  // Update defaults when program changes
  useEffect(() => {
    const newDefaults = getDefaultEventConfig(selectedProgram);
    setEventConfig(newDefaults);
    setBreakPoints(selectedProgram === 'FTC' ? [15, 30] : [20, 40]);
  }, [selectedProgram]);

  const handlePasswordSubmit = () => {
    if (passwordInput === SCHEDULE_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  const handleEventChange = (key: keyof EventConfig, value: string | number | boolean) => {
    setEventConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleAddPerson = (category: keyof Personnel) => {
    setPersonnel(prev => ({
      ...prev,
      [category]: [...prev[category], `New ${category.slice(0, -1)} ${prev[category].length + 1}`]
    }));
  };

  const handleRemovePerson = (category: keyof Personnel, index: number) => {
    setPersonnel(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handlePersonNameChange = (category: keyof Personnel, index: number, name: string) => {
    setPersonnel(prev => ({
      ...prev,
      [category]: prev[category].map((p, i) => (i === index ? name : p))
    }));
  };

  const handleAddBreakPoint = () => {
    const lastBreak = breakPoints[breakPoints.length - 1] || 0;
    const newBreak = Math.min(lastBreak + 20, eventConfig.totalMatches - 1);
    if (newBreak > lastBreak) {
      setBreakPoints([...breakPoints, newBreak]);
    }
  };

  const handleRemoveBreakPoint = (index: number) => {
    setBreakPoints(breakPoints.filter((_, i) => i !== index));
  };

  const handleBreakPointChange = (index: number, value: number) => {
    const newBreakPoints = [...breakPoints];
    newBreakPoints[index] = Math.max(1, Math.min(value, eventConfig.totalMatches - 1));
    setBreakPoints(newBreakPoints);
  };

  const handleGenerateSchedule = () => {
    // Clear previous errors/warnings
    setGenerationErrors([]);
    setGenerationWarnings([]);

    const shiftConfig: ShiftConfig = {
      breakPoints,
      turns: calculateTurns(eventConfig.totalMatches, breakPoints)
    };

    const constraints: ScheduleConstraints = {
      maxMatchesPerScouter: useMaxMatchesLimit ? maxMatchesPerScouter : null
    };

    const result = generateSchedule(eventConfig, personnel, shiftConfig, constraints);

    if (!result.success) {
      setGenerationErrors(result.errors);
      setGenerationWarnings(result.warnings);
      return;
    }

    setGenerationWarnings(result.warnings);
    setGeneratedSchedule(result.schedule);
    onScheduleGenerated(result.schedule!);
    setActiveTab('timetable');
  };

  const handleDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const turns = calculateTurns(eventConfig.totalMatches, breakPoints);

  // Get positions based on current event config
  const positions = getPositions(eventConfig);
  const positionsPerMatch = positions.length;

  // Calculate suggested max matches
  const totalAssignments = eventConfig.totalMatches * positionsPerMatch;
  const suggestedMaxMatches = Math.ceil(totalAssignments / personnel.scouters.length);

  if (!isOpen) return null;

  // Password gate
  if (!isAuthenticated) {
    return (
      <div className="schedule-modal-overlay">
        <div className="schedule-modal password-modal">
          <div className="password-container">
            <h2>Schedule Configuration</h2>
            <p>Enter password to access schedule configuration</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Enter password..."
              className="password-input"
              autoFocus
            />
            {passwordError && <div className="password-error">{passwordError}</div>}
            <div className="password-actions">
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button className="submit-btn" onClick={handlePasswordSubmit}>Enter</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-modal-overlay">
      <div className="schedule-modal">
        <div className="modal-header">
          <h2>Schedule Configuration</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-tabs">
          {(['event', 'personnel', 'shifts', 'timetable', 'export'] as ConfigTab[]).map(tab => (
            <button
              key={tab}
              className={`modal-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'event' && 'Event'}
              {tab === 'personnel' && 'Personnel'}
              {tab === 'shifts' && 'Shifts'}
              {tab === 'timetable' && 'Timetable'}
              {tab === 'export' && 'Export'}
            </button>
          ))}
        </div>

        <div className="modal-content">
          {/* Event Configuration Tab */}
          {activeTab === 'event' && (
            <div className="config-section">
              <div className="config-inner">
                <h3>Event Configuration</h3>

                <div className="config-grid">
                  <div className="config-field">
                    <label>Event Name</label>
                    <input
                      type="text"
                      value={eventConfig.localLabel}
                      onChange={(e) => handleEventChange('localLabel', e.target.value)}
                    />
                  </div>

                  <div className="config-field">
                    <label>TBA Label</label>
                    <input
                      type="text"
                      value={eventConfig.tbaLabel}
                      onChange={(e) => handleEventChange('tbaLabel', e.target.value)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Amount of Teams</label>
                    <input
                      type="number"
                      value={eventConfig.amountOfTeams}
                      onChange={(e) => handleEventChange('amountOfTeams', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Matches Per Team</label>
                    <input
                      type="number"
                      value={eventConfig.matchesPerTeam}
                      onChange={(e) => handleEventChange('matchesPerTeam', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Total Matches</label>
                    <input
                      type="number"
                      value={eventConfig.totalMatches}
                      onChange={(e) => handleEventChange('totalMatches', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Teams Per Match</label>
                    <input
                      type="number"
                      value={eventConfig.teamsPerMatch}
                      onChange={(e) => handleEventChange('teamsPerMatch', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Blue Alliance Name</label>
                    <input
                      type="text"
                      value={eventConfig.allianceBlue}
                      onChange={(e) => handleEventChange('allianceBlue', e.target.value)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Red Alliance Name</label>
                    <input
                      type="text"
                      value={eventConfig.allianceRed}
                      onChange={(e) => handleEventChange('allianceRed', e.target.value)}
                    />
                  </div>
                </div>

                <div className="practice-toggle-section">
                  <label className="practice-toggle-label">
                    <input
                      type="checkbox"
                      checked={eventConfig.isPractice || false}
                      onChange={(e) => handleEventChange('isPractice', e.target.checked)}
                    />
                    <span className="practice-toggle-text">Practice Mode</span>
                  </label>
                  <p className="practice-toggle-description">
                    Enable this for practice matches. A "PRACTICE" flag will be displayed on the main page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personnel Tab */}
          {activeTab === 'personnel' && (
            <div className="config-section">
              <div className="config-inner">
                <h3>Lead Scouters</h3>
                <div className="personnel-list">
                  {personnel.leadScouters.map((name, index) => (
                    <div key={index} className="personnel-item">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handlePersonNameChange('leadScouters', index, e.target.value)}
                        placeholder={`Lead Scouter ${index + 1}`}
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemovePerson('leadScouters', index)}
                        disabled={personnel.leadScouters.length <= 1}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={() => handleAddPerson('leadScouters')}>
                    + Add Lead Scouter
                  </button>
                </div>

                <h3>Scouters</h3>
                <p className="section-description">
                  Minimum {positionsPerMatch} scouters required (one per robot position).
                  Currently: {personnel.scouters.length} scouters
                </p>
                <div className="personnel-list">
                  {personnel.scouters.map((name, index) => (
                    <div key={index} className="personnel-item">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handlePersonNameChange('scouters', index, e.target.value)}
                        placeholder={`Scouter ${index + 1}`}
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemovePerson('scouters', index)}
                        disabled={personnel.scouters.length <= positionsPerMatch}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={() => handleAddPerson('scouters')}>
                    + Add Scouter
                  </button>
                </div>

                <h3>Camera Operators</h3>
                <div className="personnel-list">
                  {personnel.cameras.map((name, index) => (
                    <div key={index} className="personnel-item">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handlePersonNameChange('cameras', index, e.target.value)}
                        placeholder={`Camera ${index + 1}`}
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemovePerson('cameras', index)}
                        disabled={personnel.cameras.length <= 1}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={() => handleAddPerson('cameras')}>
                    + Add Camera Operator
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shifts Tab */}
          {activeTab === 'shifts' && (
            <div className="config-section">
              <div className="config-inner">
                <h3>Break Points</h3>
                <p className="section-description">
                  Define break points to divide matches into turns. Each break creates a new shift.
                </p>
                <div className="breakpoints-list">
                  {breakPoints.map((bp, index) => (
                    <div key={index} className="breakpoint-item">
                      <label>After Match:</label>
                      <input
                        type="number"
                        value={bp}
                        onChange={(e) => handleBreakPointChange(index, parseInt(e.target.value) || 0)}
                        min={1}
                        max={eventConfig.totalMatches - 1}
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveBreakPoint(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={handleAddBreakPoint}>
                    + Add Break Point
                  </button>
                </div>

                <h3>Turn Preview</h3>
                <div className="turns-preview">
                  {turns.map(turn => (
                    <div key={turn.turn} className="turn-preview-item">
                      <strong>Turn {turn.turn}:</strong> Matches {turn.startMatch} - {turn.endMatch}
                      <span className="turn-count">({turn.endMatch - turn.startMatch + 1} matches)</span>
                    </div>
                  ))}
                </div>

                <h3>Constraints</h3>
                <div className="constraints-section">
                  <div className="constraint-toggle">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={useMaxMatchesLimit}
                        onChange={(e) => setUseMaxMatchesLimit(e.target.checked)}
                      />
                      <span>Limit max matches per scouter</span>
                    </label>
                  </div>

                  {useMaxMatchesLimit && (
                    <div className="constraint-input">
                      <label>Max matches per scouter:</label>
                      <input
                        type="number"
                        value={maxMatchesPerScouter || suggestedMaxMatches}
                        onChange={(e) => setMaxMatchesPerScouter(parseInt(e.target.value) || null)}
                        min={1}
                      />
                      <span className="constraint-hint">
                        Suggested minimum: {suggestedMaxMatches} (based on {totalAssignments} total assignments / {personnel.scouters.length} scouters)
                      </span>
                    </div>
                  )}
                </div>

                {/* Error display */}
                {generationErrors.length > 0 && (
                  <div className="generation-errors">
                    <h4>Errors</h4>
                    {generationErrors.map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>{error.message}</strong>
                        {error.details && <p>{error.details}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning display */}
                {generationWarnings.length > 0 && generationErrors.length === 0 && (
                  <div className="generation-warnings">
                    <h4>Warnings</h4>
                    {generationWarnings.map((warning, index) => (
                      <div key={index} className="warning-item">
                        <strong>{warning.message}</strong>
                        {warning.details && <p>{warning.details}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <button className="generate-btn" onClick={handleGenerateSchedule}>
                  Generate Schedule
                </button>
              </div>
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <div className="config-section">
              <div className="config-inner">
                {!generatedSchedule ? (
                  <div className="no-schedule">
                    <p>No schedule generated yet. Go to the Shifts tab and click "Generate Schedule".</p>
                  </div>
                ) : (
                  <div>
                    <h3>Generated Timetable</h3>
                    {/* Warnings in timetable view */}
                    {generationWarnings.length > 0 && (
                      <div className="generation-warnings compact">
                        {generationWarnings.map((warning, index) => (
                          <div key={index} className="warning-item">
                            <strong>{warning.message}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="timetable-container">
                      <table className="timetable">
                        <thead>
                          <tr>
                            <th>Match #</th>
                            <th>Lead Scouter</th>
                            <th>Camera</th>
                            {getPositions(generatedSchedule.event).map((pos, i) => (
                              <th key={i}>{pos}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {generatedSchedule.schedule.map(match => (
                            <tr key={match.matchNumber}>
                              <td>{match.matchNumber}</td>
                              <td>{match.leadScouter}</td>
                              <td>{match.camera}</td>
                              {match.assignments.map((a, i) => (
                                <td key={i} className={!a.scouter ? 'unassigned' : ''}>
                                  {a.scouter || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <h3>Scouter Statistics</h3>
                    <div className="scouter-stats">
                      {Array.from(getScouterStats(generatedSchedule).entries()).map(([name, stats]) => (
                        <div key={name} className="stat-item">
                          <strong>{name}:</strong> {stats.totalMatches} matches
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="config-section">
              <div className="config-inner">
                <h3>Export Options</h3>
                {!generatedSchedule ? (
                  <div><p className="no-schedule">Generate a schedule first to enable exports.</p></div>
                ) : (
                  <div className="export-buttons">
                    <button
                      className="export-btn"
                      onClick={() => handleDownload(
                        exportEventConfig(generatedSchedule),
                        'event_config.json',
                        'application/json'
                      )}
                    >
                      Download Event Config (JSON)
                    </button>
                    <button
                      className="export-btn"
                      onClick={() => handleDownload(
                        exportPersonnel(generatedSchedule),
                        'personnel.json',
                        'application/json'
                      )}
                    >
                      Download Personnel (JSON)
                    </button>
                    <button
                      className="export-btn"
                      onClick={() => handleDownload(
                        exportToCSV(generatedSchedule),
                        'timetable.csv',
                        'text/csv'
                      )}
                    >
                      Download Timetable (CSV)
                    </button>
                    <button
                      className="export-btn primary"
                      onClick={() => handleDownload(
                        exportFullSchedule(generatedSchedule),
                        'full_schedule.json',
                        'application/json'
                      )}
                    >
                      Download Full Schedule (JSON)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
