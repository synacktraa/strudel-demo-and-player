/**
 * Inline SVG icons - no icon font, no CDN.
 *
 * Paths live here rather than in a sprite in index.html so the whole UI is
 * described in one place now that React owns the markup.
 */
import { html } from './runtime.js';

const PATHS = {
  play: 'M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  stop: 'M7 7h10v10H7z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4.25a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zm1.6 11.25h-3.2v-1.3h.9v-4h-.9v-1.3h2.9v5.3h.9z',
  close: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.88 18.3 9.17 12 2.88 5.71 4.3 4.3l6.29 6.29 6.3-6.29z',
  bulb: 'M9 21h6v-1.5H9V21zm3-19a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z',
  insert: 'M13 3h-2v8.17l-3.09-3.08L6.5 9.5 12 15l5.5-5.5-1.41-1.41L13 11.17V3zM5 18v2h14v-2H5z',
};

export function Icon({ name, className = '' }) {
  const d = PATHS[name];
  if (!d) return null;
  return html`
    <svg class=${`icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d=${d} />
    </svg>
  `;
}
