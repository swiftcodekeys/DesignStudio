import React, { useState, useEffect } from 'react';

var MESSAGES = [
    ['Most chosen this month: ', 'Charleston', ' in Satin Black'],
    ['Top seller for pool safety: ', 'Haven', ' in Black'],
    ['', 'Charleston Pro', ' | best for pet owners'],
    'Estate arch is the most requested upgrade',
    'Veteran-owned & American-made',
    'Limited Lifetime Warranty on all panels',
    'Pool code compliant in all 50 states',
    'Aluminum won’t rust, rot, or need repainting',
    ['', 'ProCoat', ' powder coat finish rated to AAMA 2604'],
    ['Most popular pairing: ', 'Horizon', ' + Ball Post Caps in Bronze'],
    'Contractors: call for volume pricing',
    'Design your gate in under 2 minutes',
];

function renderMessage(msg) {
    if (typeof msg === 'string') return msg;
    return [
        msg[0],
        React.createElement('strong', { key: 'b' }, msg[1]),
        msg[2],
    ];
}

var SocialProof = function() {
    var state = useState(0);
    var index = state[0];
    var setIndex = state[1];

    useEffect(function() {
        var timer = setInterval(function() {
            setIndex(function(prev) { return (prev + 1) % MESSAGES.length; });
        }, 15000);
        return function() { clearInterval(timer); };
    }, []);

    return (
        <div className="social-proof-pill" key={index}>
            {renderMessage(MESSAGES[index])}
        </div>
    );
};

export default SocialProof;
