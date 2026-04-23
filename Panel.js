import React from 'react';

const Panel = ({ title, options, selected, onSelect }) => {
  return (
    <section className="panel__section">
      <h3>{title}</h3>
      <select className="select" value={selected} onChange={e => onSelect(e.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
};

export default Panel;
