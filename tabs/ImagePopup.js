import React from 'react';
import ReactDOM from 'react-dom';

var ImagePopup = function(props) {
    var src = props.src;
    var label = props.label || props.alt || '';
    var position = props.position; // { top, left }

    if (!src || !position) return null;

    return ReactDOM.createPortal(
        <div className="img-popup" style={{ top: position.top, left: position.left }}>
            <img src={src} alt={label} />
            {label && <div className="img-popup-label">{label}</div>}
        </div>,
        document.body
    );
};

export default ImagePopup;
