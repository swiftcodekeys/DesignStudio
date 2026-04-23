/**
 * ResultsPage.js — Orchestrates all results components.
 */
import React, { useEffect } from 'react';
import { useQuiz } from '../QuizContext';
import { selectInsights } from '../insightsEngine';
import { resultsViewed } from '../analytics';
import { COLORS, FONTS } from '../styles/quizStyles';
import ScoreGauge from './ScoreGauge';
import SystemMatch from './SystemMatch';
import SystemSuggest from './SystemSuggest';
import InsightCards from './InsightCards';
import CTASection from './CTASection';
import BacklinkGrid from './BacklinkGrid';

export default function ResultsPage() {
  var _useQuiz = useQuiz(), state = _useQuiz.state, dispatch = _useQuiz.dispatch;
  var score = state.score;
  var tier = state.tier;
  var matchedSystem = state.matchedSystem;
  var answers = state.answers;
  var contact = state.contact;
  var insights = selectInsights(answers);
  var isHighTier = score >= 75;

  useEffect(function () {
    resultsViewed(matchedSystem ? matchedSystem.name : 'unknown', score);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  function handleRetake() {
    dispatch({ type: 'RETAKE' });
  }

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: '100vh',
      fontFamily: FONTS.inter,
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '40px 32px',
      }}>
        <ScoreGauge
          score={score}
          tier={tier}
          name={contact && contact.name ? contact.name.split(' ')[0] : ''}
        />

        {isHighTier ? (
          <SystemMatch system={matchedSystem} onRetake={handleRetake} />
        ) : (
          <SystemSuggest system={matchedSystem} tier={tier} />
        )}

        <InsightCards insights={insights} />

        <CTASection tier={tier} system={matchedSystem} />

        <BacklinkGrid answers={answers} system={matchedSystem} />

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{
            fontSize: 13,
            color: '#999',
            fontFamily: FONTS.inter,
          }}>
            Grandview Fence LLC &middot; Veteran-Owned &middot;{' '}
            <a
              href="https://grandviewfence.com"
              style={{ color: COLORS.skyBlue, textDecoration: 'none' }}
            >
              grandviewfence.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
