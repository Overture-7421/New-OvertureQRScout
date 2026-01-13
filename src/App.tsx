import { useState, useEffect } from 'react';
import './App.css';
import type { Config, Phase, FormData, Schedule, ScheduleEntry } from './types';
import { TextField, NumberField, DropdownField, SwitchField, CounterField } from './components/FieldComponents';
import { QRModal } from './components/QRModal';
import { parseScheduleFile, getScouterMatches, getUniqueScouterIds } from './utils/scheduleParser';

type TabType = Phase;

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [activeTab, setActiveTab] = useState<TabType>('PREMATCH');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selectedScouterId, setSelectedScouterId] = useState<string>('');
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [scouterMatches, setScouterMatches] = useState<ScheduleEntry[]>([]);

  // Load config on startup
  useEffect(() => {
    loadConfig();
    loadDefaultSchedule();
  }, []);

  // Update scouter matches when schedule or scouter changes
  useEffect(() => {
    if (schedule && selectedScouterId) {
      const matches = getScouterMatches(schedule, selectedScouterId);
      setScouterMatches(matches);
      if (matches.length > 0) {
        setSelectedMatchIndex(0);
        autoFillFromSchedule(matches[0]);
      }
    }
  }, [schedule, selectedScouterId]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/config.json');
      const configData: Config = await response.json();
      setConfig(configData);
      initializeFormData(configData);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadDefaultSchedule = async () => {
    try {
      const response = await fetch('/sample_schedule.txt');
      const content = await response.text();
      const parsedSchedule = parseScheduleFile(content);
      if (parsedSchedule) {
        setSchedule(parsedSchedule);
      }
    } catch (error) {
      console.error('Error loading default schedule:', error);
    }
  };

  const initializeFormData = (cfg: Config) => {
    const initialData: FormData = {};
    
    Object.values(cfg).flat().forEach(field => {
      if (field.type === 'switch') {
        initialData[field.key] = false;
      } else if (field.type === 'counter' || field.type === 'number') {
        initialData[field.key] = 0;
      } else {
        initialData[field.key] = '';
      }
    });

    setFormData(initialData);
  };

  const autoFillFromSchedule = (match: ScheduleEntry) => {
    setFormData(prev => ({
      ...prev,
      scouter_name: selectedScouterId,
      match_number: match.matchNumber,
      robot_position: match.position,
      team_number: match.teamNumber
    }));
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleScheduleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsedSchedule = parseScheduleFile(content);
        if (parsedSchedule) {
          setSchedule(parsedSchedule);
          const scouterIds = getUniqueScouterIds(parsedSchedule);
          if (scouterIds.length > 0 && !selectedScouterId) {
            setSelectedScouterId(scouterIds[0]);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const newConfig: Config = JSON.parse(content);
          setConfig(newConfig);
          initializeFormData(newConfig);
        } catch (error) {
          console.error('Error loading custom config:', error);
          alert('Invalid config file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleMatchSelection = (index: number) => {
    setSelectedMatchIndex(index);
    if (scouterMatches[index]) {
      autoFillFromSchedule(scouterMatches[index]);
    }
  };

  const generateDataString = (): string => {
    if (!config) return '';
    
    const values: string[] = [];
    Object.values(config).flat().forEach(field => {
      const value = formData[field.key];
      if (typeof value === 'boolean') {
        values.push(value ? 'Yes' : 'No');
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
    setQrModalOpen(true);
  };

  const resetForm = () => {
    if (!config) return;
    
    const scouterName = formData['scouter_name'];
    const currentMatch = formData['match_number'] as number;
    
    initializeFormData(config);
    
    // Preserve scouter name and increment match
    setFormData(prev => ({
      ...prev,
      scouter_name: scouterName,
      match_number: (currentMatch || 0) + 1
    }));
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
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    if (!config) return <div>Loading...</div>;

    const fields = config[activeTab];
    
    return (
      <div className="tab-content">
        {activeTab === 'PREMATCH' && schedule && (
          <div className="schedule-card">
            <div className="schedule-header">
              <span className="event-icon">🏆</span>
              <div className="event-info">
                <div className="event-name">{schedule.eventName}</div>
                {selectedScouterId && (
                  <div className="scouter-id">Scouter: {selectedScouterId}</div>
                )}
              </div>
            </div>
            
            {scouterMatches.length > 0 && (
              <div className="match-selector">
                <label>Select Match:</label>
                <select
                  value={selectedMatchIndex}
                  onChange={(e) => handleMatchSelection(Number(e.target.value))}
                  className="match-dropdown"
                >
                  {scouterMatches.map((match, idx) => (
                    <option key={idx} value={idx}>
                      Match {match.matchNumber} - {match.position} - Team {match.teamNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              <button className="reset-button" onClick={resetForm}>
                🔄 RESET FORM
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!config) {
    return (
      <div className="loading-screen">
        <div className="loading-icon">📱</div>
        <h1>Overture RebuiltQR</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Overture RebuiltQR</h1>
        <div className="header-actions">
          <label className="icon-button" title="Upload Schedule">
            📅
            <input
              type="file"
              accept=".txt"
              onChange={handleScheduleUpload}
              style={{ display: 'none' }}
            />
          </label>
          
          {schedule && (
            <select
              className="scouter-selector"
              value={selectedScouterId}
              onChange={(e) => setSelectedScouterId(e.target.value)}
              title="Select Scouter"
            >
              <option value="">Select Scouter...</option>
              {getUniqueScouterIds(schedule).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          )}

          <label className="icon-button" title="Load Custom Config">
            📁
            <input
              type="file"
              accept=".json"
              onChange={handleConfigUpload}
              style={{ display: 'none' }}
            />
          </label>
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
    </div>
  );
}

export default App;
