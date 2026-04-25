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
    var onCopyLink = props.onCopyLink;
    var onEmailDesign = props.onEmailDesign;
    var linkCopied = props.linkCopied;
    var onGetQuote = props.onGetQuote;

    var menuState = useState(false);
    var menuOpen = menuState[0];
    var setMenuOpen = menuState[1];

    var saveMenuState = useState(false);
    var saveMenuOpen = saveMenuState[0];
    var setSaveMenuOpen = saveMenuState[1];

    var handleSceneChange = function(id) {
        onSceneChange(id);
        setMenuOpen(false);
    };

    var handleSaveOption = function(fn) {
        setSaveMenuOpen(false);
        fn();
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
                    <img src="assets/logo-white.png" alt="Grandview" />
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
                <div className="save-menu-wrap" style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        className="nav-btn nav-btn-desktop"
                        onClick={function() { setSaveMenuOpen(!saveMenuOpen); }}
                    >
                        Save {saveMenuOpen ? '▲' : '▼'}
                    </button>
                    {saveMenuOpen && (
                        <div className="save-menu-dropdown">
                            <button className="save-menu-item" onClick={function() { handleSaveOption(onSaveImage); }}>
                                Download PNG
                            </button>
                            <button className="save-menu-item" onClick={function() { handleSaveOption(onCopyLink); }}>
                                {linkCopied ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button className="save-menu-item" onClick={function() { handleSaveOption(onEmailDesign); }}>
                                Email to Myself
                            </button>
                        </div>
                    )}
                </div>
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
                        <button className="mobile-menu-btn" onClick={function() { onSaveImage(); setMenuOpen(false); }}>Download PNG</button>
                        <button className="mobile-menu-btn" onClick={function() { onCopyLink(); setMenuOpen(false); }}>{linkCopied ? 'Copied!' : 'Copy Link'}</button>
                        <button className="mobile-menu-btn" onClick={function() { onEmailDesign(); setMenuOpen(false); }}>Email to Myself</button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default TopNav;
