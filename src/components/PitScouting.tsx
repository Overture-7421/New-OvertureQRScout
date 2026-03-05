import { useState, useEffect } from 'react';
import type { PitScoutingConfig, PitScoutingEntry, FormData, FieldConfig, RoboticsProgram } from '../types';
import { TextField, NumberField, DropdownField, SwitchField } from './FieldComponents';
import { QRCodeSVG } from 'qrcode.react';
import './PitScouting.css';

interface PitScoutingProps {
  onBack: () => void;
  selectedProgram: RoboticsProgram;
}

const QUESTIONNAIRE_ICONS: Record<string, string> = {
  Mech: '🔧',
  Programming: '💻',
  Electrical: '⚡',
  Competences: '🏆',
};

export const PitScouting: React.FC<PitScoutingProps> = ({ onBack, selectedProgram }) => {
  const [config, setConfig] = useState<PitScoutingConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [savedEntries, setSavedEntries] = useState<PitScoutingEntry[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [examinerName, setExaminerName] = useState<string>('');
  const [showConfigPrompt, setShowConfigPrompt] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pitScoutingEntries');
    if (saved) setSavedEntries(JSON.parse(saved));
    const savedExaminer = localStorage.getItem('pitScoutingExaminer');
    if (savedExaminer) setExaminerName(savedExaminer);
  }, []);

  useEffect(() => {
    if (savedEntries.length > 0) {
      localStorage.setItem('pitScoutingEntries', JSON.stringify(savedEntries));
    }
  }, [savedEntries]);

  useEffect(() => {
    if (examinerName) {
      localStorage.setItem('pitScoutingExaminer', examinerName);
    }
  }, [examinerName]);

  const initializeFormData = (cfg: PitScoutingConfig, currentExaminer: string) => {
    const initialData: FormData = {
      team_number: 0,
      examiner_name: currentExaminer,
      examiner_feeling: ''
    };
    Object.values(cfg.questionnaires).forEach(q => {
      q.fields.forEach(field => {
        if (field.type === 'switch') {
          initialData[field.key] = false;
        } else if (field.type === 'number') {
          initialData[field.key] = 0;
        } else {
          initialData[field.key] = '';
        }
      });
    });
    setFormData(initialData);
  };

  useEffect(() => {
    if (config) {
      initializeFormData(config, examinerName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    setConfigError(null);
    try {
      const cacheBuster = `?t=${Date.now()}`;
      const specificUrl = `${import.meta.env.BASE_URL}configPitScouting${selectedProgram}.json${cacheBuster}`;
      const genericUrl = `${import.meta.env.BASE_URL}configPitScouting.json${cacheBuster}`;
      let response = await fetch(specificUrl);
      if (!response.ok) response = await fetch(genericUrl);
      if (!response.ok) throw new Error('Failed to load pit scouting config');
      const data = await response.json();
      setConfig(data);
      setShowConfigPrompt(false);
    } catch (error) {
      console.error('Error loading pit scouting config:', error);
      setConfigError('Failed to load the default config. Please upload a config file.');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handlePitConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const configData = JSON.parse(content) as PitScoutingConfig;
          if (!configData.questionnaires) {
            setConfigError('Invalid config: missing "questionnaires" field.');
            return;
          }
          setConfig(configData);
          setShowConfigPrompt(false);
          setConfigError(null);
        } catch {
          setConfigError('Invalid JSON file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'examiner_name' && typeof value === 'string') {
      setExaminerName(value);
    }
  };

  const saveEntry = (teamNum: number): boolean => {
    if (!teamNum || teamNum === 0) {
      alert('Please enter a team number before saving.');
      return false;
    }
    const existing = savedEntries.findIndex(e => e.teamNumber === teamNum);
    const newEntry: PitScoutingEntry = {
      teamNumber: teamNum,
      questionnaire: 'all',
      answers: { ...formData },
      timestamp: Date.now()
    };
    if (existing !== -1) {
      if (!confirm(`Team ${teamNum} already has an entry. Overwrite?`)) return false;
      setSavedEntries(prev => {
        const updated = [...prev];
        updated[existing] = newEntry;
        return updated;
      });
    } else {
      setSavedEntries(prev => [...prev, newEntry]);
    }
    return true;
  };

  const handleCommit = () => {
    const teamNum = formData.team_number as number;
    if (!saveEntry(teamNum)) return;
    if (config) initializeFormData(config, examinerName);
    setCommitMessage(`✅ Team ${teamNum} committed!`);
    setTimeout(() => setCommitMessage(null), 2500);
  };

  const generateQRDataString = (): string => {
    if (!config) return '';
    const values: string[] = [
      String(formData.team_number || ''),
      String(formData.examiner_name || ''),
    ];
    Object.keys(config.questionnaires).forEach(key => {
      config.questionnaires[key].fields.forEach(field => {
        const value = formData[field.key];
        values.push(typeof value === 'boolean' ? (value ? 'Y' : 'N') : String(value || ''));
      });
    });
    values.push(String(formData.examiner_feeling || ''));
    return values.join('\t');
  };

  const handleGenerateQR = () => {
    const teamNum = formData.team_number as number;
    if (!teamNum || teamNum === 0) {
      alert('Please enter a team number before generating QR.');
      return;
    }
    setQrData(generateQRDataString());
    setShowQRModal(true);
  };

  const handleQRConfirm = () => {
    const teamNum = formData.team_number as number;
    if (!saveEntry(teamNum)) return;
    setShowQRModal(false);
    if (config) initializeFormData(config, examinerName);
    setCommitMessage(`✅ Team ${teamNum} saved via QR!`);
    setTimeout(() => setCommitMessage(null), 2500);
  };

  const generateCSV = (): string => {
    if (savedEntries.length === 0) return '';
    const allKeys = new Set<string>();
    savedEntries.forEach(entry => {
      Object.keys(entry.answers).forEach(key => {
        if (key !== 'questionnaire') allKeys.add(key);
      });
    });
    const headers = ['Team Number', 'Timestamp', ...Array.from(allKeys)];
    const rows = savedEntries.map(entry => {
      const row: string[] = [String(entry.teamNumber), new Date(entry.timestamp).toISOString()];
      allKeys.forEach(key => {
        const value = entry.answers[key];
        row.push(typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? ''));
      });
      return row.join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pit_scouting_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCSVToClipboard = () => {
    navigator.clipboard.writeText(generateCSV()).then(() => alert('CSV copied to clipboard!'));
  };

  const clearAllEntries = () => {
    if (confirm('Are you sure you want to clear all saved entries? This cannot be undone.')) {
      setSavedEntries([]);
      localStorage.removeItem('pitScoutingEntries');
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key];
    switch (field.type) {
      case 'text':
        return <TextField key={field.key} config={field} value={value as string} onChange={(val) => handleFieldChange(field.key, val)} />;
      case 'number':
        return <NumberField key={field.key} config={field} value={value as number} onChange={(val) => handleFieldChange(field.key, val)} />;
      case 'dropdown':
        return <DropdownField key={field.key} config={field} value={value as string} onChange={(val) => handleFieldChange(field.key, val)} />;
      case 'switch':
        return <SwitchField key={field.key} config={field} value={value as boolean} onChange={(val) => handleFieldChange(field.key, val)} />;
      case 'textarea':
        return (
          <div key={field.key} className="field-container textarea-container">
            <label className="field-label">{field.label}</label>
            <textarea
              className="textarea-input"
              value={value as string}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.label}
              rows={4}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Config prompt screen
  if (showConfigPrompt) {
    return (
      <div className="pit-scouting">
        <header className="pit-scouting-header">
          <div className="header-left">
            <button className="back-button" onClick={onBack}>← Back</button>
            <h1 className="pit-scouting-title">Pit Scouting</h1>
            <span className={`pit-program-badge pit-program-badge-${selectedProgram.toLowerCase()}`}>
              {selectedProgram}
            </span>
          </div>
        </header>
        <main className="pit-scouting-content">
          <div className="pit-config-prompt-container">
            <div className="pit-config-prompt-icon">🔧</div>
            <h2>Pit Scouting Config</h2>
            <p className="pit-config-prompt-subtitle">Upload a config file or use the default</p>
            <div className="pit-config-prompt-actions">
              <label className="pit-config-upload-button">
                📤 Upload Config
                <input type="file" accept=".json" onChange={handlePitConfigUpload} style={{ display: 'none' }} />
              </label>
              <div className="pit-config-prompt-divider"><span>or</span></div>
              <button className="pit-config-default-button" onClick={loadConfig} disabled={isLoadingConfig}>
                {isLoadingConfig ? 'Loading...' : 'Use Default'}
              </button>
              {configError && <div className="pit-config-error">{configError}</div>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="pit-scouting-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  const questionnaireKeys = Object.keys(config.questionnaires);
  const teamsDone = savedEntries.map(e => e.teamNumber);

  return (
    <div className="pit-scouting">
      <header className="pit-scouting-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>← Back</button>
          <h1 className="pit-scouting-title">Pit Scouting</h1>
          <span className={`pit-program-badge pit-program-badge-${selectedProgram.toLowerCase()}`}>
            {selectedProgram}
          </span>
        </div>
        <div className="header-right">
          <span className="entries-count">{savedEntries.length} saved</span>
        </div>
      </header>

      <main className="pit-scouting-content">
        <div className="pit-form-container">

          {/* Common fields */}
          <div className="common-fields">
            <div className="fields-grid">
              <NumberField
                config={{ label: 'Team Number', key: 'team_number', type: 'number' }}
                value={formData.team_number as number}
                onChange={(val) => handleFieldChange('team_number', val)}
              />
              <TextField
                config={{ label: 'Examiner Name', key: 'examiner_name', type: 'text' }}
                value={formData.examiner_name as string}
                onChange={(val) => handleFieldChange('examiner_name', val)}
              />
            </div>
          </div>

          {/* All questionnaire sections in order */}
          {questionnaireKeys.map(key => (
            <div key={key} className="pit-section">
              <div className="pit-section-header">
                <span className="pit-section-icon">{QUESTIONNAIRE_ICONS[key] ?? '📋'}</span>
                <h3 className="pit-section-title">{config.questionnaires[key].label}</h3>
              </div>
              <div className="fields-grid">
                {config.questionnaires[key].fields.map(field => renderField(field))}
              </div>
            </div>
          ))}

          {/* Final Thoughts — once at the bottom */}
          <div className="open-ended-section">
            <h3>Final Thoughts</h3>
            {renderField({
              label: 'As examiner, how did you feel evaluating this team?',
              key: 'examiner_feeling',
              type: 'textarea'
            })}
          </div>

          {/* Action buttons */}
          <div className="pit-scouting-actions">
            <button className="commit-button" onClick={handleCommit}>
              ✅ COMMIT TO CSV
            </button>
            <button className="qr-failover-button" onClick={handleGenerateQR}>
              📱 QR Failover
            </button>
          </div>

          {commitMessage && (
            <div className="commit-toast">{commitMessage}</div>
          )}

          {/* CSV export + Teams Done */}
          <div className="bottom-section">
            <div className="csv-actions-row">
              <button
                className="generate-csv-button"
                onClick={() => { if (savedEntries.length === 0) { alert('No saved entries to export.'); return; } setShowCSVModal(true); }}
                disabled={savedEntries.length === 0}
              >
                📊 EXPORT CSV ({savedEntries.length})
              </button>
              <button
                className="clear-entries-button"
                onClick={clearAllEntries}
                disabled={savedEntries.length === 0}
              >
                🗑️ Clear
              </button>
            </div>

            {teamsDone.length > 0 && (
              <div className="teams-done">
                <span className="teams-done-label">Teams done:</span>
                <div className="teams-done-chips">
                  {teamsDone.map(team => (
                    <span key={team} className="team-chip">{team}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* QR Modal */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>QR Failover — Team {formData.team_number}</h2>
              <button className="close-button" onClick={() => setShowQRModal(false)}>✕</button>
            </div>
            <div className="qr-container">
              <QRCodeSVG value={qrData} size={300} level="M" includeMargin={true} bgColor="#ffffff" fgColor="#000000" />
            </div>
            <div className="modal-actions">
              <button className="modal-button primary" onClick={handleQRConfirm}>
                ✅ Confirm & Save Entry
              </button>
              <button className="modal-button secondary" onClick={() => {
                navigator.clipboard.writeText(qrData).then(() => alert('Data copied!'));
              }}>
                📋 Copy Data
              </button>
            </div>
            <div className="data-preview">
              <p><strong>Data Preview:</strong></p>
              <code>{qrData}</code>
            </div>
          </div>
        </div>
      )}

      {/* CSV Modal */}
      {showCSVModal && (
        <div className="modal-overlay" onClick={() => setShowCSVModal(false)}>
          <div className="modal-content csv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export CSV</h2>
              <button className="close-button" onClick={() => setShowCSVModal(false)}>✕</button>
            </div>
            <div className="csv-preview">
              <p><strong>Preview ({savedEntries.length} entries):</strong></p>
              <pre>{generateCSV().slice(0, 1000)}{generateCSV().length > 1000 ? '...' : ''}</pre>
            </div>
            <div className="modal-actions">
              <button className="modal-button primary" onClick={downloadCSV}>💾 Download CSV</button>
              <button className="modal-button secondary" onClick={copyCSVToClipboard}>📋 Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
