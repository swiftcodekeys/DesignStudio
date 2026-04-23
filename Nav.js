import React from 'react';

const TABS = [
    { id: 'gates', label: 'Driveway Gates' },
    { id: 'fencing', label: 'Yard Fencing' },
    { id: 'layout', label: 'Yard Layout' },
];

const Nav = ({ activeTab, onTabChange }) => {
    return (
        <nav style={styles.nav}>
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        ...styles.tab,
                        ...(activeTab === tab.id ? styles.tabActive : {}),
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
};

const styles = {
    nav: {
        display: 'flex',
        backgroundColor: '#0d1b2a',
        borderBottom: '1px solid #1b2d45',
        padding: '0 20px',
        height: 48,
        alignItems: 'stretch',
    },
    tab: {
        padding: '0 24px',
        background: 'none',
        border: 'none',
        borderBottom: '2px solid transparent',
        color: '#667788',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    tabActive: {
        color: '#ffffff',
        borderBottomColor: '#e94560',
    },
};

export default Nav;
