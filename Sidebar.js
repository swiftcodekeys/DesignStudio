import React from 'react';
import {
    FENCE_STYLES, COLORS, HEIGHTS, POST_CAPS, FINIALS,
    ARCH_STYLES, ACCESSORIES, OPTION_LABELS, STYLE_FEATURE_GATE,
    getStyleRenderMode
} from './configData';

const ColorSwatch = ({ color, isActive, onClick }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div style={{ position: 'relative' }}>
            {hovered && (
                <div style={styles.colorTooltip}>{color.name}</div>
            )}
            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    ...styles.colorSwatch,
                    backgroundColor: color.hex,
                    ...(isActive ? styles.colorSwatchActive : {}),
                    ...(hovered ? styles.colorSwatchHover : {}),
                }}
            />
        </div>
    );
};

const Sidebar = ({ config, onConfigChange }) => {
    const selectedStyle = FENCE_STYLES.find(s => s.id === config.styleId) || FENCE_STYLES[0];
    const gate = STYLE_FEATURE_GATE[config.styleId] || {};
    const renderMode = getStyleRenderMode(config.styleId);
    const is3D = renderMode === '3d';

    const update = (key, value) => {
        onConfigChange({ ...config, [key]: value });
    };

    const toggleAccessory = (accId) => {
        const current = config.accessories || {};
        onConfigChange({
            ...config,
            accessories: { ...current, [accId]: !current[accId] }
        });
    };

    const handleStyleChange = (styleId) => {
        const style = FENCE_STYLES.find(s => s.id === styleId);
        onConfigChange({
            ...config,
            styleId: styleId,
            post: style.postDefault,
            leaf: style.leafDefault,
            finial: style.hasFinials ? 'fs' : null,
            accessories: {},
        });
    };

    return (
        <div style={styles.sidebar}>
            <div style={styles.logo}>
                <img
                    src="assets/logo.png"
                    alt="Grandview Design Studio"
                    style={styles.logoImg}
                />
            </div>

            {/* GATE STYLE — Dropdown */}
            <Section title="Gate Style">
                <select
                    value={config.styleId}
                    onChange={(e) => handleStyleChange(e.target.value)}
                    style={styles.select}
                >
                    {FENCE_STYLES.map(style => (
                        <option key={style.id} value={style.id}>
                            {style.name} — {style.subtitle}
                        </option>
                    ))}
                </select>
            </Section>

            {/* RENDER MODE BANNER */}
            {!is3D && (
                <div style={styles.modeBanner}>
                    <span style={styles.modeBannerIcon}>
                        {renderMode === 'overlay' ? '\u25A3' : '\u25A8'}
                    </span>
                    <span>
                        {renderMode === 'overlay'
                            ? 'Overlay mode. 3D controls disabled'
                            : 'Preview mode. 3D controls disabled'}
                    </span>
                </div>
            )}

            {is3D && (<>
            {/* HEIGHT */}
            <Section title="Height">
                <div style={styles.chipRow}>
                    {HEIGHTS.map(h => (
                        <button
                            key={h.id}
                            onClick={() => update('height', h.id)}
                            style={{
                                ...styles.chip,
                                ...(config.height === h.id ? styles.chipActive : {})
                            }}
                        >
                            {h.label}
                        </button>
                    ))}
                </div>
            </Section>

            {/* COLOR */}
            <Section title="Color">
                <div style={styles.colorRow}>
                    {COLORS.map(c => (
                        <ColorSwatch
                            key={c.id}
                            color={c}
                            isActive={config.color && config.color.id === c.id}
                            onClick={() => update('color', c)}
                        />
                    ))}
                </div>
                <p style={styles.colorLabel}>
                    {config.color ? config.color.name : 'Gloss Black'}
                </p>
            </Section>

            {/* POST TYPE — Removed: dropdown was non-functional.
                GateRenderer.js loads po40d/po14/po23 unconditionally
                regardless of config.post value. See split-03 spec. */}

            {/* POST CAP */}
            <Section title="Post Cap">
                <div style={styles.chipRow}>
                    <button
                        onClick={() => update('postCap', null)}
                        style={{
                            ...styles.chip,
                            ...(!config.postCap ? styles.chipActive : {})
                        }}
                    >
                        None
                    </button>
                    {POST_CAPS.filter(pc => selectedStyle.options.includes(pc.id) && (!gate.postCaps || gate.postCaps.includes(pc.id))).map(pc => (
                        <button
                            key={pc.id}
                            onClick={() => update('postCap', pc.id)}
                            style={{
                                ...styles.chip,
                                ...(config.postCap === pc.id ? styles.chipActive : {})
                            }}
                        >
                            {pc.name}
                        </button>
                    ))}
                </div>
            </Section>

            {/* ARCH STYLE — Dropdown */}
            <Section title="Arch Style">
                <select
                    value={config.arch || 'e'}
                    onChange={(e) => update('arch', e.target.value)}
                    style={styles.select}
                >
                    {ARCH_STYLES
                        .filter(a => !gate.archStyles || gate.archStyles.includes(a.id))
                        .map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                </select>
            </Section>

            {/* FINIALS */}
            {selectedStyle.hasFinials && (
                <Section title="Finial Style">
                    <select
                        value={config.finial || ''}
                        onChange={(e) => update('finial', e.target.value || null)}
                        style={styles.select}
                    >
                        <option value="">None</option>
                        {FINIALS.filter(f => selectedStyle.options.includes(f.id) && (!gate.finials || gate.finials.includes(f.id))).map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </Section>
            )}

            {/* OPTIONS */}
            <Section title="Options">
                {selectedStyle.options
                    .filter(o => !['pcf','pcb','fs','ft','fq','fp'].includes(o))
                    .filter(o => !gate.options || gate.options.includes(o))
                    .map(optId => (
                        <label key={optId} style={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={!!(config.accessories && config.accessories[optId])}
                                onChange={() => toggleAccessory(optId)}
                                style={styles.checkbox}
                            />
                            <span>{OPTION_LABELS[optId] || ACCESSORIES[optId]?.name || optId}</span>
                        </label>
                    ))}
            </Section>

            {/* ACCESSORIES */}
            <Section title="Accessories">
                {selectedStyle.accessories
                    .filter(a => a !== 'rem')
                    .filter(a => !gate.accessories || gate.accessories.includes(a))
                    .map(accId => (
                        <label key={accId} style={styles.checkRow}>
                            <input
                                type="checkbox"
                                checked={!!(config.accessories && config.accessories[accId])}
                                onChange={() => toggleAccessory(accId)}
                                style={styles.checkbox}
                            />
                            <span>{ACCESSORIES[accId]?.name || accId}</span>
                        </label>
                    ))}
            </Section>
            </>)}

            {/* GET QUOTE */}
            <div style={styles.quoteSection}>
                <button style={styles.quoteBtn}>
                    Get a Quote
                </button>
            </div>
        </div>
    );
};

const Section = ({ title, children }) => {
    const [open, setOpen] = React.useState(true);
    return (
        <div style={styles.section}>
            <button onClick={() => setOpen(!open)} style={styles.sectionHeader}>
                <span>{title}</span>
                <span style={styles.chevron}>{open ? '▾' : '▸'}</span>
            </button>
            {open && <div style={styles.sectionBody}>{children}</div>}
        </div>
    );
};

const styles = {
    sidebar: {
        width: 320,
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: '#16213e',
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #0f3460',
    },
    logo: {
        padding: '20px 30px 16px',
        borderBottom: '1px solid #0f3460',
        textAlign: 'center',
    },
    logoImg: {
        width: 220,
        height: 'auto',
    },
    section: {
        borderBottom: '1px solid #0f3460',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '12px 20px',
        background: 'none',
        border: 'none',
        color: '#8899aa',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        cursor: 'pointer',
    },
    chevron: {
        fontSize: 12,
    },
    sectionBody: {
        padding: '0 20px 16px',
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #2a2a4e',
        background: '#1a1a2e',
        color: '#ccc',
        fontSize: 13,
        cursor: 'pointer',
        appearance: 'auto',
    },
    chipRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        padding: '6px 14px',
        borderRadius: 20,
        border: '1px solid #2a2a4e',
        background: '#1a1a2e',
        color: '#ccc',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    chipActive: {
        background: '#e94560',
        borderColor: '#e94560',
        color: '#fff',
    },
    colorRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
    },
    colorSwatch: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '2px solid #2a2a4e',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
    },
    colorSwatchHover: {
        transform: 'scale(1.2) translateY(-5px)',
        boxShadow: '0 5px 15px rgba(0,0,0,0.4)',
    },
    colorSwatchActive: {
        borderColor: '#e94560',
        boxShadow: '0 0 0 2px #e94560',
    },
    colorTooltip: {
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 6,
        padding: '4px 10px',
        backgroundColor: '#0d1b2a',
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 4,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10,
    },
    colorLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#8899aa',
    },
    modeBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #0f3460',
        color: '#8899aa',
        fontSize: 12,
        fontStyle: 'italic',
    },
    modeBannerIcon: {
        fontSize: 18,
        opacity: 0.6,
    },
    checkRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 0',
        cursor: 'pointer',
        fontSize: 13,
    },
    checkbox: {
        accentColor: '#e94560',
    },
    quoteSection: {
        padding: '20px',
        marginTop: 'auto',
    },
    quoteBtn: {
        width: '100%',
        padding: '14px',
        borderRadius: 10,
        border: 'none',
        background: 'linear-gradient(135deg, #e94560, #c73450)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        letterSpacing: 1,
    },
};

export default Sidebar;
