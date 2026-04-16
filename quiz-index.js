// Standalone entry for quiz.grandviewfence.com
// No router, no studio, no wizard — just the quiz.
// After completion, the quiz CTAs hand off to studio.grandviewfence.com/wizard?q=<token>.

import React from 'react';
import ReactDOM from 'react-dom';
import QuizPage from './quiz/QuizPage';

ReactDOM.render(
  React.createElement(QuizPage),
  document.getElementById('root')
);
