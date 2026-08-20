/**
 * React without a build step.
 *
 * React, ReactDOM and htm are loaded as classic UMD scripts before this module
 * runs, so they arrive as globals. htm turns tagged templates into
 * React.createElement calls, which gives us JSX-shaped components with no
 * compiler - the workshop machines have no node_modules and no internet.
 */
const { React, ReactDOM, htm } = window;

if (!React || !ReactDOM || !htm) {
  // Says what is missing, not where it should have come from: in online mode
  // these arrive from the CDN, so "run setup" would be the wrong advice.
  throw new Error('The UI libraries (React, ReactDOM, htm) did not load.');
}

export const html = htm.bind(React.createElement);
export const { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, Fragment } = React;
export { React, ReactDOM };

/** Honour the OS "reduce motion" setting everywhere we animate. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
