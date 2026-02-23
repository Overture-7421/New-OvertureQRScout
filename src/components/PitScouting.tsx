import { useState, useEffect } from 'react';
import type { PitScoutingConfig, PitScoutingEntry, FormData, FieldConfig, RoboticsProgram } from '../types';
import { TextField, NumberField, DropdownField, SwitchField } from './FieldComponents';
import { QRCodeSVG } from 'qrcode.react';
import './PitScouting.css';

interface PitScoutingProps {
  onBack: () => void;
  selectedProgram: RoboticsProgram;
}

export const PitScouting: React.FC<PitScoutingProps> = ({ onBack, selectedProgram }) => {
  const [config, setConfig] = useState<PitScoutingConfig | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({});
  const [savedEntries, setSavedEntries] = useState<PitScoutingEntry[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<string>('');
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [examinerName, setExaminerName] = useState<string>('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
    // Load saved entries from localStorage
    const saved = localStorage.getItem('pitScoutingEntries');
    if (saved) {
      setSavedEntries(JSON.parse(saved));
    }
    // Load examiner name from localStorage
    const savedExaminer = localStorage.getItem('pitScoutingExaminer');
    if (savedExaminer) {
      setExaminerName(savedExaminer);
    }
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (savedEntries.length > 0) {
      localStorage.setItem('pitScoutingEntries', JSON.stringify(savedEntries));
    }
  }, [savedEntries]);

  // Save examiner name to localStorage
  useEffect(() => {
    if (examinerName) {
      localStorage.setItem('pitScoutingExaminer', examinerName);
    }
  }, [examinerName]);

  const loadConfig = async () => {
    try {
      const cacheBuster = `?t=${Date.now()}`;
      // Try program-specific config first (e.g. configPitScoutingFTC.json / configPitScoutingFRC.json)
      const specificUrl = `${import.meta.env.BASE_URL}configPitScouting${selectedProgram}.json${cacheBuster}`;
      const genericUrl = `${import.meta.env.BASE_URL}configPitScouting.json${cacheBuster}`;

      let response = await fetch(specificUrl);
      if (!response.ok) {
        response = await fetch(genericUrl);
      }
      if (!response.ok) throw new Error('Failed to load pit scouting config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading pit scouting config:', error);
      alert('Failed to load pit scouting configuration.');
    }
  };

  const initializeFormData = (questionnaire: string) => {
    if (!config) return;

    const initialData: FormData = {
      team_number: 0,
      examiner_name: examinerName,
      examiner_feeling: ''
    };

    // Initialize questionnaire-specific fields
    const qFields = config.questionnaires[questionnaire]?.fields || [];
    qFields.forEach(field => {
      if (field.type === 'switch') {
        initialData[field.key] = false;
      } else if (field.type === 'number') {
        initialData[field.key] = 0;
      } else {
        initialData[field.key] = '';
      }
    });

    setFormData(initialData);
  };

  const handleQuestionnaireSelect = (questionnaire: string) => {
    setSelectedQuestionnaire(questionnaire);
    initializeFormData(questionnaire);
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));

    // Persist examiner name
    if (key === 'examiner_name' && typeof value === 'string') {
      setExaminerName(value);
    }
  };

  // Save only if not already saved for this team/questionnaire in this session
  const handleSave = () => {
    if (!formData.team_number || formData.team_number === 0) {
      alert('Please enter a team number before saving.');
      return;
    }
    if (!selectedQuestionnaire) {
      alert('Please select a questionnaire.');
      return;
    }
    // Prevent duplicate save for same team/questionnaire (in this session)
    const alreadySaved = savedEntries.some(
      (entry) => entry.teamNumber === formData.team_number && entry.questionnaire === selectedQuestionnaire
    );
    if (alreadySaved) {
      // Optionally update the entry instead of skipping, but for now, skip
      return;
    }
    const entry: PitScoutingEntry = {
      teamNumber: formData.team_number as number,
      questionnaire: selectedQuestionnaire,
      answers: { ...formData },
      timestamp: Date.now()
    };
    setSavedEntries(prev => [...prev, entry]);
    // No alert, as this is now an implicit save
  };

  const handleNextRobot = () => {
    // Save current data first if team number is filled
    if (formData.team_number && formData.team_number !== 0) {
      handleSave();
    }
    // Reset form but keep examiner name and questionnaire selection
    initializeFormData(selectedQuestionnaire);
    setFormData(prev => ({
      ...prev,
      examiner_name: examinerName
    }));
  };

  const generateCSV = (): string => {
    if (savedEntries.length === 0) return '';

    // Get all unique keys across all entries
    const allKeys = new Set<string>();
    savedEntries.forEach(entry => {
      Object.keys(entry.answers).forEach(key => allKeys.add(key));
    });

    // Create headers
    const headers = ['Team Number', 'Questionnaire', 'Timestamp', ...Array.from(allKeys)];

    // Create rows
    const rows = savedEntries.map(entry => {
      const row: string[] = [
        String(entry.teamNumber),
        entry.questionnaire,
        new Date(entry.timestamp).toISOString()
      ];

      allKeys.forEach(key => {
        const value = entry.answers[key];
        if (typeof value === 'boolean') {
          row.push(value ? 'Yes' : 'No');
        } else {
          row.push(String(value ?? ''));
        }
      });

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const handleGenerateCSV = () => {
    if (savedEntries.length === 0) {
      alert('No saved entries to export.');
      return;
    }
    setShowCSVModal(true);
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
    const csv = generateCSV();
    navigator.clipboard.writeText(csv).then(() => {
      alert('CSV copied to clipboard!');
    });
  };

  const handleGenerateQR = () => {
    if (!formData.team_number || formData.team_number === 0) {
      alert('Please enter a team number before generating QR.');
      return;
    }

    // Generate a compact string for the QR code
    const dataString = generateQRDataString();
    setQrData(dataString);
    setShowQRModal(true);
  };

  const generateQRDataString = (): string => {
    const values: string[] = [
      String(formData.team_number || ''),
      selectedQuestionnaire
    ];

    if (config && selectedQuestionnaire) {
      const fields = config.questionnaires[selectedQuestionnaire]?.fields || [];
      fields.forEach(field => {
        const value = formData[field.key];
        if (typeof value === 'boolean') {
          values.push(value ? 'Y' : 'N');
        } else {
          values.push(String(value || ''));
        }
      });
    }

    // Add common fields
    values.push(String(formData.examiner_name || ''));
    values.push(String(formData.examiner_feeling || ''));

    return values.join('\t');
  };

  const clearAllEntries = () => {
    if (confirm('Are you sure you want to clear all saved entries? This cannot be undone.')) {
      setSavedEntries([]);
      localStorage.removeItem('pitScoutingEntries');
      alert('All entries cleared.');
    }
  };

  const renderField = (field: FieldConfig) => {
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

  if (!config) {
    return (
      <div className="pit-scouting-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  const questionnaireKeys = Object.keys(config.questionnaires);

  return (
    <div className="pit-scouting">
      <header className="pit-scouting-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
          <h1 className="pit-scouting-title">Pit Scouting</h1>
          <span className={`pit-program-badge pit-program-badge-${selectedProgram.toLowerCase()}`}>
            {selectedProgram}
          </span>
        </div>
        <div className="header-right">
          <span className="entries-count">
            {savedEntries.length} saved
          </span>
        </div>
      </header>

      <main className="pit-scouting-content">
        {!selectedQuestionnaire ? (
          <div className="questionnaire-selector">
            <h2>Select Questionnaire</h2>
            <p className="selector-description">Choose the area you want to evaluate:</p>
            <div className="questionnaire-grid">
              {questionnaireKeys.map(key => (
                <button
                  key={key}
                  className="questionnaire-card"
                  onClick={() => handleQuestionnaireSelect(key)}
                >
                  <span className="questionnaire-icon">
                    {key === 'Mech' && '🔧'}
                    {key === 'Programming' && '💻'}
                    {key === 'Electrical' && '⚡'}
                    {key === 'Competences' && '🏆'}
                  </span>
                  <span className="questionnaire-name">
                    {config.questionnaires[key].label}
                  </span>
                </button>
              ))}
            </div>

            {savedEntries.length > 0 && (
              <div className="saved-entries-actions">
                <button className="generate-csv-button" onClick={handleGenerateCSV}>
                  📊 GENERATE CSV ({savedEntries.length} entries)
                </button>
                <button className="clear-entries-button" onClick={clearAllEntries}>
                  🗑️ Clear All
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="questionnaire-form">
            <div className="questionnaire-header">
              <button
                className="change-questionnaire-button"
                onClick={() => setSelectedQuestionnaire('')}
              >
                ← Change Questionnaire
              </button>
              <h2>{config.questionnaires[selectedQuestionnaire].label}</h2>
            </div>

            {/* Common fields - Team Number and Examiner Name */}
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

            {/* Questionnaire-specific fields */}
            <div className="questionnaire-fields">
              <h3>Questions</h3>
              <div className="fields-grid">
                {config.questionnaires[selectedQuestionnaire].fields.map(field =>
                  renderField(field)
                )}
              </div>
            </div>

            {/* Open-ended question */}
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
              <button className="next-robot-button" onClick={handleNextRobot}>
                ⏭️ NEXT ROBOT
              </button>
              <button className="qr-failover-button" onClick={handleGenerateQR}>
                📱 QR Failover
              </button>
            </div>

            {savedEntries.length > 0 && (
              <div className="bottom-csv-actions">
                <button className="generate-csv-button" onClick={handleGenerateCSV}>
                  📊 GENERATE CSV ({savedEntries.length} entries)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Modal */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>QR Code - Team {formData.team_number}</h2>
              <button className="close-button" onClick={() => setShowQRModal(false)}>
                ✕
              </button>
            </div>
            <div className="qr-container">
              <QRCodeSVG
                value={qrData}
                size={300}
                level="M"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-button primary"
                onClick={() => {
                  navigator.clipboard.writeText(qrData).then(() => {
                    alert('Data copied to clipboard!');
                  });
                }}
              >
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
              <button className="close-button" onClick={() => setShowCSVModal(false)}>
                ✕
              </button>
            </div>
            <div className="csv-preview">
              <p><strong>Preview ({savedEntries.length} entries):</strong></p>
              <pre>{generateCSV().slice(0, 1000)}{generateCSV().length > 1000 ? '...' : ''}</pre>
            </div>
            <div className="modal-actions">
              <button className="modal-button primary" onClick={downloadCSV}>
                💾 Download CSV
              </button>
              <button className="modal-button secondary" onClick={copyCSVToClipboard}>
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
