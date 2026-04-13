import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText='Confirm', cancelText='Cancel' }) => {
  if (!open) return null;
  return (
    <div className="cm-backdrop">
      <div className="cm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="cm-actions">
          <button className="cm-btn cm-cancel" onClick={onCancel}>{cancelText}</button>
          <button className="cm-btn cm-confirm" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
