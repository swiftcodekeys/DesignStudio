// HowToMeasurePage.js — renders docs/research/how-to-measure-yard-for-fence-guide.md
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TopNav from './TopNav';
import BacklinksFooter from './BacklinksFooter';

function HowToMeasurePage() {
  var contentState = useState('');
  var content = contentState[0];
  var setContent = contentState[1];

  useEffect(function() {
    fetch('/docs/how-to-measure-yard-for-fence-guide.md')
      .then(function(r) { return r.text(); })
      .then(setContent);
  }, []);

  return React.createElement('div', { className: 'how-to-measure-page' },
    React.createElement(TopNav, null),
    React.createElement('div', { className: 'htm-content' },
      React.createElement('div', { className: 'htm-hero' },
        React.createElement('h1', null, 'How to Measure Your Yard for a Fence Order'),
        React.createElement('p', null, 'A complete homeowner\u2019s guide for Grandview Fence customers.')
      ),
      React.createElement('div', { className: 'htm-body' },
        React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, content)
      )
    ),
    React.createElement(BacklinksFooter, null)
  );
}

export default HowToMeasurePage;
