const React = window.React;
const ReactDOM = window.ReactDOM;

const App = () => {
  return React.createElement(UnifiedCanvas, null);
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(App, null));
