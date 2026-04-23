import React, { useState, useEffect } from 'react';

var MESSAGES = [
    'Most chosen this month: <strong>Charleston</strong> in Satin Black',
    'Top seller for pool safety: <strong>Haven</strong> in Black',
    '<strong>Charleston Pro</strong> | best for pet owners',
    'Estate arch is the most requested upgrade',
    'Veteran-owned &amp; American-made',
    'Limited Lifetime Warranty on all panels',
    'Pool code compliant in all 50 states',
    'Aluminum won\u2019t rust, rot, or need repainting',
    '<strong>ProCoat</strong> powder coat finish rated to AAMA 2604',
    'Most popular pairing: <strong>Horizon</strong> + Ball Post Caps in Bronze',
    'Contractors: call for volume pricing',
    'Design your gate in under 2 minutes',
];

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
        <div
            className="social-proof-pill"
            key={index}
            dangerouslySetInnerHTML={{ __html: MESSAGES[index] }}
        />
    );
};

export default SocialProof;
