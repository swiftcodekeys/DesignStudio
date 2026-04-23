/**
 * QuizContext.js — React context + useReducer for fence quiz state.
 */
import React, { createContext, useContext, useReducer } from 'react';
import { TOTAL_QUESTIONS } from './quizData';

// ── Initial state ────────────────────────────────────────────────────
const initialState = {
  phase: 'landing',       // 'landing' | 'quiz' | 'gate' | 'results'
  currentQuestion: 0,     // index into QUESTIONS array
  answers: {},            // { q1: ['security','curb_appeal'], q2: 'flat_top', ... }
  openText: '',           // Q15 free-text
  contact: null,          // { name, email, phone }
  score: null,
  matchedSystem: null,
  tier: null,
  retakeCount: 0,
};

// ── Reducer ──────────────────────────────────────────────────────────
function quizReducer(state, action) {
  switch (action.type) {
    case 'START_QUIZ':
      return { ...state, phase: 'quiz', currentQuestion: 0 };

    case 'SET_ANSWER': {
      const { questionId, value, multiSelect } = action.payload;

      if (!multiSelect) {
        // Single-select: just store the value
        return {
          ...state,
          answers: { ...state.answers, [questionId]: value },
        };
      }

      // Multi-select: toggle value in/out of the array
      const prev = Array.isArray(state.answers[questionId])
        ? state.answers[questionId]
        : [];

      // If user picks 'none', clear everything else
      if (value === 'none') {
        return {
          ...state,
          answers: { ...state.answers, [questionId]: ['none'] },
        };
      }

      // If something other than 'none' is picked, remove 'none' if present
      const withoutNone = prev.filter((v) => v !== 'none');

      const next = withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)   // toggle off
        : [...withoutNone, value];                  // toggle on

      return {
        ...state,
        answers: { ...state.answers, [questionId]: next },
      };
    }

    case 'SET_OPEN_TEXT':
      return { ...state, openText: action.payload };

    case 'NEXT_QUESTION': {
      const nextIdx = state.currentQuestion + 1;
      if (nextIdx >= TOTAL_QUESTIONS) {
        return { ...state, phase: 'gate' };
      }
      return { ...state, currentQuestion: nextIdx };
    }

    case 'PREV_QUESTION':
      return {
        ...state,
        currentQuestion: Math.max(0, state.currentQuestion - 1),
      };

    case 'SUBMIT_CONTACT':
      return { ...state, contact: action.contact || action.payload, phase: 'results' };

    case 'SET_RESULTS':
      return {
        ...state,
        score: action.score != null ? action.score : (action.payload && action.payload.score),
        matchedSystem: action.matchedSystem || (action.payload && action.payload.matchedSystem),
        tier: action.tier || (action.payload && action.payload.tier),
      };

    case 'RETAKE':
      return {
        ...initialState,
        contact: state.contact,            // preserve contact
        retakeCount: state.retakeCount + 1, // bump counter
      };

    default:
      return state;
  }
}

// ── Context + Provider ───────────────────────────────────────────────
const QuizContext = createContext(null);

export function QuizProvider({ children }) {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  return (
    <QuizContext.Provider value={{ state, dispatch }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) {
    throw new Error('useQuiz must be used inside <QuizProvider>');
  }
  return ctx;
}
