import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRModal.css';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: string;
  headers: string;
  title?: string;
  copyDataLabel?: string;
  copyHeadersLabel?: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, data, headers, title = 'Data QR Code', copyDataLabel = '📋 Copy Info', copyHeadersLabel = '📊 Copy Columns' }) => {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="qr-container">
          <QRCodeSVG
            value={data}
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
            onClick={() => copyToClipboard(data)}
          >
            {copyDataLabel}
          </button>
          <button
            className="modal-button secondary"
            onClick={() => copyToClipboard(headers)}
          >
            {copyHeadersLabel}
          </button>
        </div>

        <div className="data-preview">
          <p><strong>Data Preview:</strong></p>
          <code>{data}</code>
        </div>
      </div>
    </div>
  );
};

export const QRModalSchedule: React.FC<QRModalProps> = (props) => {
  return <QRModal {...props} title={props.title ?? 'Schedule QR Code'} copyDataLabel={props.copyDataLabel ?? '📋 Copy Schedule'} copyHeadersLabel={props.copyHeadersLabel ?? '📅 Copy Fields'} />;
};
