import React from 'react';

const Modal = ({ title, children, onClose }) => {
  return (
    <div className="modal" aria-hidden="true">
      <div className="modal__backdrop" onClick={onClose}></div>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <h2 id="modalTitle" className="modal__title">{title}</h2>
        <div className="modal__body">
          {children}
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
