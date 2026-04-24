import React, { useRef, useEffect, useCallback } from 'react';
import DesignStudioContext from './DesignStudioContext';
import { FENCE_STYLES, COLORS, ARCH_STYLES } from './configData';
import { FENCE_STYLES as FENCE_TOOL_STYLES, FENCE_COLORS, FENCE_HEIGHTS } from './fenceConfigData';
import StyleTab from './tabs/StyleTab';
import ColorTab from './tabs/ColorTab';
import SizeTab from './tabs/SizeTab';
import OptionsTab from './tabs/OptionsTab';
import PuppyPicketsTab from './tabs/PuppyPicketsTab';
import DetailsTab from './tabs/DetailsTab';
import QuoteTab from './tabs/QuoteTab';

var TABS = [
    { id: 'style', label: 'Style' },
    { id: 'color', label: 'Color' },
    { id: 'size', label: 'Size' },
    { id: 'options', label: 'Options' },
    { id: 'puppyPickets', label: 'Puppy' },
    { id: 'details', label: 'Details' },
    { id: 'quote', label: 'Quote' },
];

var STYLE_URLS = {
    uaf_200: 'https://grandviewfence.com/fencing/horizon',
    uaf_201: 'https://grandviewfence.com/fencing/horizon-pro',
    uaf_250: 'https://grandviewfence.com/fencing/vanguard',
    uab_200: 'https://grandviewfence.com/fencing/haven',
    uas_100: 'https://grandviewfence.com/fencing/charleston',
    uas_101: 'https://grandviewfence.com/fencing/charleston-pro',
    uas_150: 'https://grandviewfence.com/fencing/savannah',
};

function getHeader(activeTab, config, isFence) {
    var styles = isFence ? FENCE_TOOL_STYLES : FENCE_STYLES;
    var style = styles.find(function(s) { return s.id === config.styleId; }) || styles[0];
    var colorName = config.color ? config.color.displayName : 'Black';
    var archObj = ARCH_STYLES.find(function(a) { return a.id === config.arch; });
    var archName = archObj ? archObj.name : 'Estate';
    var leafLabel = config.leaf === '1' ? 'Single Gate' : 'Double Gate';

    var labels = {
        style: isFence ? 'Choose Your Fence Style' : 'Choose Your Gate Style',
        color: 'ProCoat Finish',
        size: 'Gate Dimensions',
        options: 'Gate Options',
        puppyPickets: 'Puppy Pickets',
        details: 'Fine Details',
        quote: 'Your Configuration',
    };
    var idx = ['style','color','size','options','puppyPickets','details','quote'].indexOf(activeTab);
    if (idx < 0) idx = 0;
    return {
        line: 'Step ' + (idx + 1) + ' of 7 | ' + (labels[activeTab] || labels.style),
    };
}

function renderTabContent(activeTab, config, onConfigChange, isFence, onGetQuote, activeScene, onSceneChange) {
    switch (activeTab) {
        case 'style':
            return <StyleTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'color':
            return <ColorTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'size':
            return <SizeTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'options':
            return <OptionsTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'puppyPickets':
            return <PuppyPicketsTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'details':
            return <DetailsTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
        case 'quote':
            return <QuoteTab config={config} onConfigChange={onConfigChange} onGetQuote={onGetQuote} activeScene={activeScene} onSceneChange={onSceneChange} />;
        default:
            return <StyleTab config={config} onConfigChange={onConfigChange} isFence={isFence} />;
    }
}

var FloatingPanel = function(props) {
    var activeTab = props.activeTab;
    var onTabChange = props.onTabChange;
    var collapsed = props.collapsed;
    var onToggleCollapse = props.onToggleCollapse;

    var isFence = props.isFence;

    var ctx = React.useContext(DesignStudioContext);
    // If context is available, use it; fall back to props for safety
    var config = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.fenceConfig : ctx.config) : props.config;
    var onConfigChange = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.setFenceConfig : ctx.setConfig) : props.onConfigChange;
    var onGetQuote = props.onGetQuote;
    var header = getHeader(activeTab, config, isFence);
    var bodyRef = useRef(null);

    var sectionLabels = {
        style: isFence ? 'Fence Style' : 'Gate Style',
        color: 'ProCoat Finish',
        size: 'Dimensions',
        options: 'Gate Options',
        puppyPickets: 'Puppy Pickets',
        details: 'Fine Details',
        quote: 'Your Configuration',
    };

    var visibleTabs = TABS.filter(function(tab) {
        if (tab.id === 'options' && isFence) return false;
        return true;
    });

    // Scroll-spy: update active tab based on scroll position
    useEffect(function() {
        var body = bodyRef.current;
        if (!body) return;
        var handleScroll = function() {
            var scrollTop = body.scrollTop;
            var found = visibleTabs[0].id;
            for (var i = 0; i < visibleTabs.length; i++) {
                var el = document.getElementById('section-' + visibleTabs[i].id);
                if (el && (el.offsetTop - body.offsetTop) <= scrollTop + 60) {
                    found = visibleTabs[i].id;
                }
            }
            if (found !== activeTab) onTabChange(found);
        };
        body.addEventListener('scroll', handleScroll, { passive: true });
        return function() { body.removeEventListener('scroll', handleScroll); };
    });

    var currentIndex = visibleTabs.findIndex(function(t) { return t.id === activeTab; });
    if (currentIndex < 0) currentIndex = 0;

    var isFirst = currentIndex === 0;
    var isLast = currentIndex === visibleTabs.length - 1;
    var isBeforeLast = currentIndex === visibleTabs.length - 2;

    var nextText = '';
    if (isLast) {
        nextText = 'Get Instant Quote';
    } else if (isBeforeLast) {
        nextText = 'Get Quote';
    } else {
        nextText = 'Next: ' + visibleTabs[currentIndex + 1].label;
    }

    var panelClassName = 'float-panel' + (collapsed ? ' collapsed' : '');

    var handleNext = function() {
        if (isLast) {
            if (onGetQuote) onGetQuote();
        } else {
            onTabChange(visibleTabs[currentIndex + 1].id);
        }
    };

    var handleBack = function() {
        if (!isFirst) {
            onTabChange(visibleTabs[currentIndex - 1].id);
        }
    };

    return (
        <div className={panelClassName}>
            <div className="panel-tabs">
                    {visibleTabs.map(function(tab) {
                        return (
                            <button
                                key={tab.id}
                                className={'panel-tab' + (activeTab === tab.id ? ' active' : '')}
                                onClick={function() {
                                    onTabChange(tab.id);
                                    var el = document.getElementById('section-' + tab.id);
                                    if (el && bodyRef.current) {
                                        bodyRef.current.scrollTo({ top: el.offsetTop - bodyRef.current.offsetTop, behavior: 'smooth' });
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="panel-body" ref={bodyRef}>
                    {visibleTabs.map(function(tab, i) {
                        return (
                            <div key={tab.id} id={'section-' + tab.id} className="panel-section">
                                <div className="panel-section-label">{'Step ' + (i + 1) + ' of ' + visibleTabs.length + ' | ' + sectionLabels[tab.id]}</div>
                                {renderTabContent(tab.id, config, onConfigChange, isFence, onGetQuote, props.activeScene, props.onSceneChange)}
                                {i < visibleTabs.length - 1 && <div className="panel-section-divider" />}
                            </div>
                        );
                    })}
                </div>
            </div>
    );
};

export default FloatingPanel;
