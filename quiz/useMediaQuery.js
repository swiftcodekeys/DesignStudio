import { useState, useEffect } from 'react';

export default function useMediaQuery(query) {
  var _useState = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ), matches = _useState[0], setMatches = _useState[1];

  useEffect(function () {
    var mql = window.matchMedia(query);
    var handler = function (e) { setMatches(e.matches); };
    mql.addEventListener('change', handler);
    return function () { mql.removeEventListener('change', handler); };
  }, [query]);

  return matches;
}
