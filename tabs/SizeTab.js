import React from 'react';
import { HEIGHTS } from '../configData';
import { STYLES, STYLE_ID_MAP } from '../retailPricing';

var GRADE_LABELS = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
};

var GRADE_TOOLTIPS = {
    residential: 'Standard aluminum fence for homes. 5/8" pickets — backyards, pools, property lines.',
    commercial: 'Heavier-duty with 3/4" pickets and thicker rails. Businesses, HOAs, high-traffic areas.',
    industrial: 'Maximum strength with 1" pickets and 8\' panels. Government, schools, critical infrastructure.',
};

var SizeTab = function(props) {
    var config = props.config;
    var onConfigChange = props.onConfigChange;
    var isFence = props.isFence;

    var update = function(key, value) {
        onConfigChange(function(prev) { return { ...prev, [key]: value }; });
    };

    // Gate mode — static heights, no grade
    if (!isFence) {
        return (
            <div className="sections-row">
                <div className="section-group">
                    <div className="section-title">Height</div>
                    <div className="controls-row">
                        {HEIGHTS.map(function(h) {
                            return (
                                <div
                                    key={h.id}
                                    className={'ctrl-btn' + (config.height === h.id ? ' active' : '')}
                                    onClick={function() { update('height', h.id); }}
                                >
                                    {h.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="section-group">
                    <div className="section-title">Gate Type</div>
                    <div className="controls-row">
                        <div
                            className={'ctrl-btn' + (config.leaf === '1' ? ' active' : '')}
                            onClick={function() { update('leaf', '1'); }}
                        >
                            Single
                        </div>
                        <div
                            className={'ctrl-btn' + (config.leaf === '2' ? ' active' : '')}
                            onClick={function() { update('leaf', '2'); }}
                        >
                            Double
                        </div>
                    </div>
                </div>
                <div className="section-group">
                    <div className="section-title">Mount</div>
                    <div className="controls-row">
                        <div
                            className={'ctrl-btn' + (config.mount === 'p' ? ' active' : '')}
                            onClick={function() { update('mount', 'p'); }}
                        >
                            Post
                        </div>
                        <div
                            className={'ctrl-btn' + (config.mount === 'd' ? ' active' : '')}
                            onClick={function() { update('mount', 'd'); }}
                        >
                            Direct
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fence mode — dynamic grade + height from retailPricing
    var pricingKey = STYLE_ID_MAP[config.styleId] || 'horizon';
    var styleDef = STYLES[pricingKey];
    var availableGrades = styleDef ? styleDef.grades : ['residential'];
    var currentGrade = config.grade || 'residential';

    // If current grade not available for this style, reset to first available
    if (availableGrades.indexOf(currentGrade) === -1) {
        currentGrade = availableGrades[0];
    }

    var availableHeights = (styleDef && styleDef.availableHeights[currentGrade]) || [48, 60, 72];
    var currentHeight = parseInt(config.height, 10) || 48;

    // If current height not available for this grade, reset to first available
    if (availableHeights.indexOf(currentHeight) === -1) {
        currentHeight = availableHeights[0];
    }

    var handleGradeChange = function(newGrade) {
        var newHeights = (styleDef && styleDef.availableHeights[newGrade]) || [48, 60, 72];
        var h = parseInt(config.height, 10) || 48;
        // If current height not valid for new grade, pick first available
        if (newHeights.indexOf(h) === -1) {
            onConfigChange(function(prev) {
                return { ...prev, grade: newGrade, height: String(newHeights[0]) };
            });
        } else {
            update('grade', newGrade);
        }
    };

    var handleHeightChange = function(h) {
        update('height', String(h));
    };

    // Auto-correct grade/height if out of sync (e.g. after style change)
    React.useEffect(function() {
        var needsUpdate = false;
        var updates = {};
        var g = config.grade || 'residential';
        if (availableGrades.indexOf(g) === -1) {
            updates.grade = availableGrades[0];
            g = availableGrades[0];
            needsUpdate = true;
        }
        var heights = (styleDef && styleDef.availableHeights[g]) || [48, 60, 72];
        var h = parseInt(config.height, 10) || 48;
        if (heights.indexOf(h) === -1) {
            updates.height = String(heights[0]);
            needsUpdate = true;
        }
        if (needsUpdate) {
            onConfigChange(function(prev) { return { ...prev, ...updates }; });
        }
    }, [config.styleId]);

    return (
        <div className="sections-row">
            {availableGrades.length > 1 && (
                <div className="section-group">
                    <div className="section-title">Grade</div>
                    <div className="controls-row">
                        {availableGrades.map(function(g) {
                            return (
                                <div
                                    key={g}
                                    className={'ctrl-btn' + (currentGrade === g ? ' active' : '')}
                                    onClick={function() { handleGradeChange(g); }}
                                    title={GRADE_TOOLTIPS[g] || ''}
                                >
                                    {GRADE_LABELS[g] || g}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="section-group">
                <div className="section-title">Fence Height</div>
                <div className="controls-row">
                    {availableHeights.map(function(h) {
                        var label = h + '"';
                        if (h >= 12) {
                            var ft = Math.floor(h / 12);
                            var inches = h % 12;
                            label = h + '" (' + ft + (inches ? '.' + Math.round(inches / 12 * 10) : '') + ' ft)';
                        }
                        return (
                            <div
                                key={h}
                                className={'ctrl-btn' + (currentHeight === h ? ' active' : '')}
                                onClick={function() { handleHeightChange(h); }}
                            >
                                {label}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SizeTab;
