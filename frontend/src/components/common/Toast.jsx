import React from 'react';
import './Toast.css';

const Toast = ({ messages = [], onClose }) => {
  if (!messages.length) return null;
  return (
    <div className="toast-container">
      {messages.map((m, i) => (
        <div key={i} className={`toast ${m.type || 'info'}`}>
          <div className="toast-body">{m.text}</div>
          <button className="toast-close" onClick={() => onClose(i)}>×</button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
