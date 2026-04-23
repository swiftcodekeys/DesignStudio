/**
 * QuizPage.js — Main quiz page container.
 * Renders the appropriate phase: landing, quiz, gate, or results.
 */
import React, { useEffect } from 'react';
import { QuizProvider, useQuiz } from './QuizContext';
import { QUESTIONS, TOTAL_QUESTIONS } from './quizData';
import { COLORS, FONTS } from './styles/quizStyles';
import useMediaQuery from './useMediaQuery';
import LandingHero from './components/LandingHero';
import ValueProp from './components/ValueProp';
import Credibility from './components/Credibility';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import QuizNav from './components/QuizNav';
import OptionGrid from './components/OptionGrid';
import OptionList from './components/OptionList';
import OpenTextQuestion from './components/OpenTextQuestion';
import EmailGate from './components/EmailGate';
import ResultsPage from './components/ResultsPage';

function BottomCTA({ onStart }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #e8f1f5 0%, #c4dde9 30%, #9dc5db 70%, #78afcf 100%)',
      padding: '64px 24px',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 24,
        fontWeight: 700,
        color: COLORS.navy,
        margin: '0 0 8px',
        fontFamily: FONTS.inter,
      }}>
        Ready to find your perfect fence?
      </p>
      <p style={{
        fontSize: 16,
        color: 'rgba(24,42,60,0.6)',
        margin: '0 0 28px',
        fontFamily: FONTS.inter,
      }}>
        It only takes 3 minutes. No account needed.
      </p>
      <button
        onClick={onStart}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 36px',
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.white,
          background: COLORS.orange,
          border: 'none',
          borderRadius: 28,
          cursor: 'pointer',
          fontFamily: FONTS.inter,
          boxShadow: '0 4px 24px rgba(242,101,34,0.35)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={function (e) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(242,101,34,0.45)';
        }}
        onMouseLeave={function (e) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(242,101,34,0.35)';
        }}
      >
        Start the Quiz
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function QuizContent() {
  var isMobile = useMediaQuery('(max-width: 768px)');
  var _useQuiz = useQuiz(), state = _useQuiz.state, dispatch = _useQuiz.dispatch;

  useEffect(function () {
    // Set body styles for quiz page
    var prev = {
      overflow: document.body.style.overflow,
      background: document.body.style.background,
    };
    document.body.style.overflow = 'auto';
    document.body.style.background = '#fff';

    return function () {
      document.body.style.overflow = prev.overflow;
      document.body.style.background = prev.background;
    };
  }, []);

  // Scroll to top on all phase transitions
  useEffect(function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.phase]);

  // Scroll to top when question changes
  useEffect(function () {
    if (state.phase === 'quiz') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state.currentQuestion]);

  function handleStart() {
    dispatch({ type: 'START_QUIZ' });
  }

  function handleSelect(value) {
    var q = QUESTIONS[state.currentQuestion];
    dispatch({
      type: 'SET_ANSWER',
      payload: { questionId: q.id, value: value, multiSelect: q.multiSelect },
    });
  }

  function handleOpenText(value) {
    dispatch({ type: 'SET_OPEN_TEXT', payload: value });
  }

  function handleNext() {
    dispatch({ type: 'NEXT_QUESTION' });
  }

  function handleBack() {
    dispatch({ type: 'PREV_QUESTION' });
  }

  if (state.phase === 'landing') {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.white,
        fontFamily: FONTS.inter,
      }}>
        <LandingHero onStart={handleStart} />
        <ValueProp />
        <Credibility />
        <BottomCTA onStart={handleStart} />
      </div>
    );
  }

  if (state.phase === 'quiz') {
    var q = QUESTIONS[state.currentQuestion];
    var answer = q.type === 'openText' ? state.openText : state.answers[q.id];
    var canAdvance = q.type === 'openText'
      ? true
      : q.multiSelect
        ? (Array.isArray(answer) && answer.length > 0)
        : !!answer;

    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONTS.inter,
      }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: isMobile ? '24px 16px' : '40px 32px',
        }}>
          <ProgressBar
            current={state.currentQuestion}
            total={TOTAL_QUESTIONS}
            block={q.block}
            blockLabel={q.blockLabel}
          />
          <QuestionCard key={q.id} question={q.question} hint={q.hint}>
            {q.block === 'visual' && (
              <OptionGrid
                options={q.options}
                selected={answer}
                multiSelect={q.multiSelect}
                onSelect={handleSelect}
              />
            )}
            {(q.block === 'scored' || (q.block === 'qualify' && q.type !== 'openText')) && (
              <OptionList
                options={q.options}
                selected={answer}
                onSelect={handleSelect}
              />
            )}
            {q.type === 'openText' && (
              <OpenTextQuestion
                value={state.openText}
                onChange={handleOpenText}
              />
            )}
            <QuizNav
              onBack={handleBack}
              onNext={handleNext}
              canAdvance={canAdvance}
              isFirst={state.currentQuestion === 0}
            />
          </QuestionCard>
        </div>
      </div>
    );
  }

  if (state.phase === 'gate') {
    return <EmailGate />;
  }

  if (state.phase === 'results') {
    return <ResultsPage />;
  }

  return null;
}

export default function QuizPage() {
  return (
    <QuizProvider>
      <QuizContent />
    </QuizProvider>
  );
}
