import React from 'react';

const Header = ({ onAbout, onReset, onDownload }) => {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand__logo" src="assets/logo.png" alt="Grandview Fence" />
        <div className="brand__text">
          <div className="brand__sub">Design Studio</div>
        </div>
      </div>
      <div className="topbar__actions">
        <button className="btn btn--ghost" type="button" onClick={onAbout}>About</button>
        <button className="btn btn--ghost" type="button" onClick={onReset}>Reset</button>
        <button className="btn" type="button" onClick={onDownload}>Save Image</button>
      </div>
    </header>
  );
};

export default Header;
