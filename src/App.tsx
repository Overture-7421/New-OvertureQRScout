import { useState, useEffect } from 'react';
import './App.css';
import type { Config, Phase, FormData, GeneratedSchedule, ScouterTurnAssignment, RoboticsProgram } from './types';
import { TextField, NumberField, DropdownField, SwitchField, CounterField, ChronoField } from './components/FieldComponents';
import { QRModal } from './components/QRModal';
import { ScheduleConfigModal } from './components/ScheduleConfigModal';
import {
  parseScheduleJSON,
  getScouterAssignments,
  getAllScouterNames,
  getNextScouterForPosition,
  isLastMatchOfTurn
} from './utils/scheduleGenerator';

type TabType = Phase;

interface AppProps {
  onNavigateToPitScouting?: () => void;
  onProgramSelected?: (program: RoboticsProgram) => void;
}

function App({ onNavigateToPitScouting, onProgramSelected }: AppProps = {}) {
  const [config, setConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [activeTab, setActiveTab] = useState<TabType>('PREMATCH');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedScouterId, setSelectedScouterId] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<RoboticsProgram>('FTC');
  const [hasCommittedOnce, setHasCommittedOnce] = useState(false);
  const [configVersion, setConfigVersion] = useState<string>('');
  const [showConfigPrompt, setShowConfigPrompt] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Schedule configuration state
  const [scheduleConfigModalOpen, setScheduleConfigModalOpen] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [scouterTurnAssignments, setScouterTurnAssignments] = useState<ScouterTurnAssignment[]>([]);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState<number>(0);

  // Flatten all assignments for easy navigation
  const allAssignments = scouterTurnAssignments.flatMap(turn =>
    turn.assignments.map(a => ({ ...a, turn: turn.turn }))
  );

  // Update turn assignments when generated schedule or scouter changes
  useEffect(() => {
    if (generatedSchedule && selectedScouterId) {
      const assignments = getScouterAssignments(generatedSchedule, selectedScouterId);
      setScouterTurnAssignments(assignments);
      setCurrentAssignmentIndex(0);
      if (assignments.length > 0 && assignments[0].assignments.length > 0) {
        const firstAssignment = assignments[0].assignments[0];
        autoFillFromTurnAssignment(firstAssignment, selectedScouterId);
      }
    } else {
      setScouterTurnAssignments([]);
      setCurrentAssignmentIndex(0);
    }
  }, [generatedSchedule, selectedScouterId]);

  const loadConfigForProgram = async (program: RoboticsProgram) => {
    setIsLoadingConfig(true);
    try {
      const cacheBuster = `?t=${Date.now()}`;
      const url = program === 'FRC'
        ? `${import.meta.env.BASE_URL}configFRC.json${cacheBuster}`
        : `${import.meta.env.BASE_URL}configFTC.json${cacheBuster}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${program} config`);

      const configData = await response.json();
      if (configData.version) setConfigVersion(configData.version);
      setConfig(configData as Config);
      initializeFormData(configData as Config);
    } catch (error) {
      console.error(`Error loading ${program} config:`, error);
      alert(`Failed to load ${program} config. Please upload a config file instead.`);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const applyConfigData = (configData: Config, category: RoboticsProgram) => {
    if (configData.version) setConfigVersion(configData.version as string);
    setConfig(configData);
    initializeFormData(configData);
    setSelectedProgram(category);
    onProgramSelected?.(category);
  };

  const handleStartupConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const configData = JSON.parse(content);
          const category = configData.category as RoboticsProgram;
          if (category !== 'FTC' && category !== 'FRC') {
            alert('Invalid config file. The "category" field must be "FTC" or "FRC".');
            return;
          }
          applyConfigData(configData as Config, category);
          setShowConfigPrompt(false);
        } catch {
          alert('Invalid config file. Please upload a valid JSON config.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleUseDefault = async (program: RoboticsProgram) => {
    setSelectedProgram(program);
    await loadConfigForProgram(program);
    onProgramSelected?.(program);
    setShowConfigPrompt(false);
  };

  const handleConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const configData = JSON.parse(content);
          const category = configData.category as RoboticsProgram;
          if (category !== 'FTC' && category !== 'FRC') {
            alert('Invalid config file. The "category" field must be "FTC" or "FRC".');
            return;
          }
          applyConfigData(configData as Config, category);
        } catch {
          alert('Invalid config file. Please upload a valid JSON config.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const initializeFormData = (cfg: Config) => {
    const initialData: FormData = {};

    Object.values(cfg).flat().forEach(field => {
      if (field.type === 'switch') {
        initialData[field.key] = false;
      } else if (field.type === 'counter' || field.type === 'number' || field.type === 'chrono') {
        initialData[field.key] = 0;
      } else {
        initialData[field.key] = '';
      }
    });

    setFormData(initialData);
  };

  const autoFillFromTurnAssignment = (
    assignment: ScouterTurnAssignment['assignments'][0],
    scouterName: string
  ) => {
    setFormData(prev => ({
      ...prev,
      scouter_name: scouterName,
      match_number: assignment.matchNumber,
      robot_position: assignment.position,
      team_number: assignment.teamNumber || 0,
      lead_scouter: assignment.leadScouter
    }));
  };

  const handleGeneratedScheduleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsed = parseScheduleJSON(content);
        if (parsed) {
          setGeneratedSchedule(parsed);
          setSelectedScouterId('');
          setScouterTurnAssignments([]);
          setCurrentAssignmentIndex(0);
        } else {
          alert('Invalid schedule file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAssignmentSelection = (index: number) => {
    setCurrentAssignmentIndex(index);
    if (allAssignments[index]) {
      autoFillFromTurnAssignment(allAssignments[index], selectedScouterId);
    }
  };

  const handleScheduleGenerated = (newSchedule: GeneratedSchedule) => {
    setGeneratedSchedule(newSchedule);
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generateDataString = (): string => {
    if (!config) return '';

    const values: string[] = [];
    Object.values(config).flat().forEach(field => {
      const value = formData[field.key];
      if (typeof value === 'boolean') {
        values.push(value ? 'Yes' : 'No');
      } else if (typeof value === 'number') {
        values.push(String(value));
      } else {
        values.push(String(value || ''));
      }
    });

    return values.join('\t');
  };

  const generateHeaders = (): string => {
    if (!config) return '';

    const headers: string[] = [];
    Object.values(config).flat().forEach(field => {
      headers.push(field.label);
    });

    return headers.join(',');
  };

  const commitData = () => {
    setHasCommittedOnce(true);
    setQrModalOpen(true);
  };

  const handleNextMatch = () => {
    if (!config) return;

    initializeFormData(config);

    const nextIndex = currentAssignmentIndex + 1;
    if (nextIndex < allAssignments.length) {
      setCurrentAssignmentIndex(nextIndex);
      autoFillFromTurnAssignment(allAssignments[nextIndex], selectedScouterId);
    } else {
      setFormData(prev => ({
        ...prev,
        scouter_name: selectedScouterId
      }));
    }

    setActiveTab('PREMATCH');
  };

  const getCurrentMatchInfo = () => {
    if (!generatedSchedule || !selectedScouterId || allAssignments.length === 0) {
      return null;
    }

    const currentAssignment = allAssignments[currentAssignmentIndex];
    if (!currentAssignment) return null;

    const matchNumber = currentAssignment.matchNumber;
    const position = currentAssignment.position;

    const turnEndInfo = isLastMatchOfTurn(generatedSchedule, matchNumber, selectedScouterId);
    const nextScouter = getNextScouterForPosition(generatedSchedule, matchNumber, position);
    const hasMoreMatches = currentAssignmentIndex < allAssignments.length - 1;

    return {
      matchNumber,
      position,
      turn: currentAssignment.turn,
      isLastOfTurn: turnEndInfo.isLast,
      turnNumber: turnEndInfo.turnNumber,
      nextScouter,
      hasMoreMatches
    };
  };

  const renderField = (field: any) => {
    const value = formData[field.key];

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={field.key}
            config={field}
            value={value as string}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      case 'number':
        return (
          <NumberField
            key={field.key}
            config={field}
            value={value as number}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      case 'dropdown':
        return (
          <DropdownField
            key={field.key}
            config={field}
            value={value as string}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      case 'switch':
        return (
          <SwitchField
            key={field.key}
            config={field}
            value={value as boolean}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      case 'counter':
        return (
          <CounterField
            key={field.key}
            config={field}
            value={value as number}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      case 'chrono':
        return (
          <ChronoField
            key={field.key}
            config={field}
            value={value as number}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        );
      default:
        return null;
    }
  };

  const matchInfo = getCurrentMatchInfo();

  const renderTabContent = () => {
    if (!config) return <div>Loading...</div>;

    const fields = config[activeTab];

    return (
      <div className="tab-content">
        {activeTab === 'PREMATCH' && generatedSchedule && (
          <div className="schedule-card">
            <div className="schedule-header">
              <span className="event-icon">🏆</span>
              <div className="event-info">
                <div className="event-name">{generatedSchedule.event.localLabel}</div>
                {selectedScouterId && (
                  <div className="scouter-id">Scouter: {selectedScouterId}</div>
                )}
              </div>
            </div>

            {scouterTurnAssignments.length > 0 && (
              <div className="match-selector">
                <label>Select Assignment:</label>
                <select
                  value={currentAssignmentIndex}
                  onChange={(e) => handleAssignmentSelection(Number(e.target.value))}
                  className="match-dropdown"
                >
                  {allAssignments.map((assignment, idx) => (
                    <option key={idx} value={idx}>
                      Turn {assignment.turn} | Match {assignment.matchNumber} - {assignment.position}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {matchInfo?.isLastOfTurn && (
              <div className="turn-end-notification">
                <span className="notification-icon">⚠️</span>
                <span>Last match of Turn {matchInfo.turnNumber}! Your turn ends after this match.</span>
              </div>
            )}

            {matchInfo?.nextScouter && (
              <div className="next-scouter-info">
                <span className="info-label">Next for {matchInfo.position}:</span>
                <span className="next-scouter-name">{matchInfo.nextScouter}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'PREMATCH' && !generatedSchedule && (
          <div className="no-schedule-notice">
            <p>No schedule loaded. Click the ⚙️ button to configure a schedule or upload one.</p>
          </div>
        )}

        <div className="fields-grid">
          {fields.map(field => renderField(field))}
        </div>

        <div className="tab-actions">
          {activeTab !== 'ENDGAME' && (
            <button
              className="next-button"
              onClick={() => {
                const tabs: TabType[] = ['PREMATCH', 'AUTONOMOUS', 'TELEOP', 'ENDGAME'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1]);
                }
              }}
            >
              NEXT PERIOD →
            </button>
          )}

          {activeTab === 'ENDGAME' && (
            <>
              <button className="commit-button" onClick={commitData}>
                📊 COMMIT DATA
              </button>
              <button
                className="copy-columns-button"
                onClick={() => {
                  navigator.clipboard.writeText(generateHeaders()).then(() => {
                    alert('Column titles copied to clipboard!');
                  });
                }}
              >
                📋 COPY COLUMN TITLES
              </button>
              <button
                className="next-match-button"
                onClick={handleNextMatch}
                disabled={!hasCommittedOnce || !matchInfo?.hasMoreMatches}
              >
                ⏭️ NEXT MATCH
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Loading state while fetching config after selection
  if (isLoadingConfig) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">📱</div>
        <h1>Overture QRScout</h1>
        <p>Loading {selectedProgram} config...</p>
      </div>
    );
  }

  // Startup program / config selection screen
  if (showConfigPrompt) {
    return (
      <div className="config-prompt-screen">
        <div className="config-prompt-container">
          <div className="config-prompt-icon">📋</div>
          <h1>Overture QRScout</h1>
          <p className="config-prompt-subtitle">Upload a config or choose a default to get started</p>

          <div className="config-prompt-actions">
            <label className="config-upload-button">
              📤 Upload Config
              <input
                type="file"
                accept=".json"
                onChange={handleStartupConfigUpload}
                style={{ display: 'none' }}
              />
            </label>

            <div className="config-prompt-divider">
              <span>or use default</span>
            </div>

            <div className="config-defaults-row">
              <button
                className="config-default-button config-default-ftc"
                onClick={() => handleUseDefault('FTC')}
              >
                FTC
              </button>
              <button
                className="config-default-button config-default-frc"
                onClick={() => handleUseDefault('FRC')}
              >
                FRC
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">📱</div>
        <h1>Overture QRScout</h1>
        <p>Loading config...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Overture QRScout</h1>
          <div className="header-badges">
            <span className={`program-badge program-badge-${selectedProgram.toLowerCase()}`}>
              {selectedProgram}
            </span>
            {configVersion && (
              <span className="version-badge">v{configVersion}</span>
            )}
            {generatedSchedule?.event?.isPractice && (
              <span className="practice-flag">PRACTICE</span>
            )}
          </div>
        </div>
        <div className="header-actions">
          {onNavigateToPitScouting && (
            <button
              className="pit-scouting-nav-button"
              onClick={onNavigateToPitScouting}
              title="Pit Scouting"
            >
              🔧 Pit Scout
            </button>
          )}

          <label className="icon-button" title="Upload Config (JSON)">
            📤
            <input
              type="file"
              accept=".json"
              onChange={handleConfigUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            className="icon-button"
            onClick={() => setScheduleConfigModalOpen(true)}
            title="Schedule Configuration"
          >
            ⚙️
          </button>

          <label className="icon-button" title="Upload Schedule (JSON)">
            📋
            <input
              type="file"
              accept=".json"
              onChange={handleGeneratedScheduleUpload}
              style={{ display: 'none' }}
            />
          </label>

          {generatedSchedule && (
            <select
              className="scouter-selector"
              value={selectedScouterId}
              onChange={(e) => setSelectedScouterId(e.target.value)}
              title="Select Scouter"
            >
              <option value="">Select Scouter...</option>
              {getAllScouterNames(generatedSchedule).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <div className="tabs">
        {(['PREMATCH', 'AUTONOMOUS', 'TELEOP', 'ENDGAME'] as TabType[]).map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="main-content">
        {renderTabContent()}
      </main>

      <QRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        data={generateDataString()}
        headers={generateHeaders()}
      />

      <ScheduleConfigModal
        isOpen={scheduleConfigModalOpen}
        onClose={() => setScheduleConfigModalOpen(false)}
        onScheduleGenerated={handleScheduleGenerated}
        selectedProgram={selectedProgram}
      />
    </div>
  );
}

export default App;
