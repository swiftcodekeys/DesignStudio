// useEscapeHatchTriggers.js
// Sets up desktop mouseleave + mobile visibilitychange exit-intent triggers.
// Fires onTrigger('exit-intent') at most once per session, only when step >= 2.

import { useEffect, useRef } from 'react';

var SESSION_KEY = 'gv_escape_fired';

export default function useEscapeHatchTriggers(step, onTrigger) {
  var wasVisibleRef = useRef(true);

  useEffect(function() {
    if (step < 2) return undefined;

    // If already fired this session, do nothing.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return undefined;
    } catch (e) {}

    function fireOnce(source) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
      onTrigger(source);
    }

    function handleMouseLeave(e) {
      // Mouse crossed above the viewport top edge — likely heading to tab/close.
      if (e.clientY <= 0) fireOnce('mouseleave');
    }

    function handleVisibilityChange() {
      var nowHidden = document.hidden === true;
      if (nowHidden && wasVisibleRef.current) {
        fireOnce('visibilitychange');
      }
      wasVisibleRef.current = !nowHidden;
    }

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return function() {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, onTrigger]);
}