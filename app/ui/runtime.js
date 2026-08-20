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
  throw new Error(
    'UI libraries missing. Run `npm run setup` to download React into app/vendor/ui-libs.',
  );
}

export const html = htm.bind(React.createElement);
export const { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, Fragment } = React;
export { React, ReactDOM };

/** Honour the OS "reduce motion" setting everywhere we animate. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
