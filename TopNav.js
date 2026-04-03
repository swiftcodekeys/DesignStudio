import React, { useState } from 'react';

var SCENES = [
    { id: 'fencing', label: 'Front Yard' },
    { id: 'backyard', label: 'Back Yard' },
    { id: 'gates', label: 'Driveway Gates' },
    { id: 'draw', label: 'Draw Your Yard', badge: 'NEW' },
];

var TopNav = function(props) {
    var activeScene = props.activeScene;
    var onSceneChange = props.onSceneChange;
    var onReset = props.onReset;
    var onSaveImage = props.onSaveImage;
    var onGetQuote = props.onGetQuote;

    var menuState = useState(false);
    var menuOpen = menuState[0];
    var setMenuOpen = menuState[1];

    var handleSceneChange = function(id) {
        onSceneChange(id);
        setMenuOpen(false);
    };

    return (
        <nav className="topnav">
            <div className="topnav-left">
                <button className="hamburger" onClick={function() { setMenuOpen(!menuOpen); }} aria-label="Menu">
                    <span className={'hamburger-icon' + (menuOpen ? ' open' : '')}>
                        <span></span><span></span><span></span>
                    </span>
                </button>
                <a className="topnav-logo" href="/" onClick={function(e) { e.preventDefault(); onSceneChange('fencing'); }}>
                    <img src="assets/logo.png" alt="Grandview" />
                </a>
                <div className="topnav-brand">
                    <span className="brand-name">Grandview <span className="brand-fence">Fence</span></span>
                    <span className="brand-sub">Design Studio</span>
                </div>
            </div>
            <div className="topnav-center">
                {SCENES.map(function(scene) {
                    return (
                        <button
                            key={scene.id}
                            className={'topnav-tab' + (activeScene === scene.id ? ' active' : '')}
                            onClick={function() { handleSceneChange(scene.id); }}
                        >
                            {scene.label}
                            {scene.badge && <span className="badge">{scene.badge}</span>}
                        </button>
                    );
                })}
            </div>
            <div className="topnav-right">
                <button className="nav-btn nav-btn-desktop" onClick={onReset}>Reset</button>
                <button className="nav-btn nav-btn-desktop" onClick={onSaveImage}>Save</button>
                <button className="btn-quote-nav" onClick={onGetQuote}>Get Instant Quote <span className="arrow">&rarr;</span></button>
            </div>
            {menuOpen && (
                <div className="mobile-menu">
                    {SCENES.map(function(scene) {
                        return (
                            <button
                                key={scene.id}
                                className={'mobile-menu-item' + (activeScene === scene.id ? ' active' : '')}
                                onClick={function() { handleSceneChange(scene.id); }}
                            >
                                {scene.label}
                                {scene.badge && <span className="badge">{scene.badge}</span>}
                            </button>
                        );
                    })}
                    <div className="mobile-menu-actions">
                        <button className="mobile-menu-btn" onClick={function() { onReset(); setMenuOpen(false); }}>Reset Design</button>
                        <button className="mobile-menu-btn" onClick={function() { onSaveImage(); setMenuOpen(false); }}>Save Image</button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default TopNav;
