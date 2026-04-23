// useEscapeHatchTriggers.js
// Exit-intent triggers for the Escape Hatch modal. Fires onTrigger at most
// once per session (sessionStorage gate), and only when step >= 2.
//
// Three trigger sources:
//   - 'mouseleave'       — desktop mouse crossed the viewport top edge
//   - 'visibilitychange' — tab backgrounded (mobile or desktop cmd-tab)
//   - 'idle'             — user on step 2+ for IDLE_MS with no interaction
//                          (covers trackpad users who never cross the top edge)

import { useEffect, useRef } from 'react';

var SESSION_KEY = 'gv_escape_fired';
var IDLE_MS = 45 * 1000; // 45 seconds of no interaction on step 2+

export default function useEscapeHatchTriggers(step, onTrigger) {
  var wasVisibleRef = useRef(true);

  useEffect(function() {
    if (step < 2) return undefined;

    // If already fired this session, do nothing.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return undefined;
    } catch (e) {}

    var idleTimer = null;

    function fireOnce(source) {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch (e) {}
      onTrigger(source);
    }

    function handleMouseLeave(e) {
      if (e.clientY <= 0) fireOnce('mouseleave');
    }

    function handleVisibilityChange() {
      var nowHidden = document.hidden === true;
      if (nowHidden && wasVisibleRef.current) {
        fireOnce('visibilitychange');
      }
      wasVisibleRef.current = !nowHidden;
    }

    function fireIdle() {
      fireOnce('idle');
    }

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      // If guard already set (fireOnce bailed), skip rescheduling.
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      } catch (e) {}
      idleTimer = setTimeout(fireIdle, IDLE_MS);
    }

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Interaction events that reset the idle timer.
    var idleEvents = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    idleEvents.forEach(function(ev) {
      window.addEventListener(ev, resetIdle, { passive: true });
    });
    resetIdle(); // arm the initial idle timer

    return function() {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      idleEvents.forEach(function(ev) {
        window.removeEventListener(ev, resetIdle);
      });
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [step, onTrigger]);
}