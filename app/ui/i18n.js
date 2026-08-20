/**
 * Bilingual copy: Indonesian for the students, English for the teachers.
 *
 * The obvious design here is a language switcher, and it is the wrong one.
 * The students read Indonesian and the teaching team does not; the teachers
 * read English and the students may not. A toggle means whoever is not holding
 * the mouse cannot read the screen - including a teacher leaning over a
 * student's shoulder to help. So both languages are on screen at once,
 * Indonesian leading and English beneath it in smaller, dimmer type.
 *
 * The display mode below is a convenience for the projector, not the main
 * mechanism: the default shows both, and that is what the workshop runs on.
 *
 * TRANSLATION NOTE: the Indonesian was written by the (non-native) author of
 * this code and has NOT been reviewed by a native speaker. Every string lives
 * in lessons.js next to its English pair, so a local reviewer can correct the
 * whole notebook in one file. Please get it checked before teaching from it.
 */
import { html, useState, useEffect, useCallback } from './runtime.js';
import { t, both, UI } from './text.js';

// Re-exported so components have a single import for anything bilingual.
export { t, both, UI };

export const MODES = ['both', 'id', 'en'];
const STORAGE_KEY = 'strudel-workshop-lang';

/**
 * Render a pair. `rich` allows the <code> markup the lesson copy contains.
 *
 * Both languages are always in the DOM; the mode only hides one with CSS, so
 * switching costs nothing and search/screen-readers still see the content.
 */
export function T({ text, rich = false, className = '' }) {
  if (!text) return null;
  const cls = `bi ${className}`.trim();
  if (rich) {
    return html`
      <span class=${cls}>
        <span class="bi__id" lang="id" dangerouslySetInnerHTML=${{ __html: text.id }}></span>
        <span class="bi__en" lang="en" dangerouslySetInnerHTML=${{ __html: text.en }}></span>
      </span>
    `;
  }
  return html`
    <span class=${cls}>
      <span class="bi__id" lang="id">${text.id}</span>
      <span class="bi__en" lang="en">${text.en}</span>
    </span>
  `;
}

/** Display mode, remembered per machine so the projector keeps its setting. */
export function useLanguageMode() {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return MODES.includes(saved) ? saved : 'both';
    } catch {
      return 'both';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.lang = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* private browsing - the mode still applies for this session */
    }
  }, [mode]);

  return [mode, useCallback((next) => setMode(next), [])];
}

const MODE_LABELS = { both: 'ID + EN', id: 'ID', en: 'EN' };

export function LanguageToggle({ mode, onChange }) {
  return html`
    <div class="lang-toggle" role="group" aria-label="Bahasa / Language">
      ${MODES.map(
        (m) => html`
          <button
            key=${m}
            type="button"
            class=${m === mode ? 'is-active' : ''}
            aria-pressed=${m === mode ? 'true' : 'false'}
            onClick=${() => onChange(m)}
          >
            ${MODE_LABELS[m]}
          </button>
        `,
      )}
    </div>
  `;
}
