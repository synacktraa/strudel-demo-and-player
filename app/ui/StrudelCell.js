/**
 * One notebook cell: the framing, plus a <strudel-editor> that React must not
 * touch after mounting it.
 *
 * The web component owns real audio state - a scheduler, a prebaked sample
 * registry, an AudioWorklet - so remounting it would drop sound and re-run a
 * multi-second prebake. It also inserts its own CodeMirror container as a
 * *sibling* of itself, into whatever its parentElement happens to be.
 *
 * So the editor gets a dedicated host <div> that React renders empty and never
 * puts children into. React has nothing to reconcile inside it, and the
 * component can rearrange its own subtree freely.
 */
import { html, useRef, useEffect, useState, useCallback } from './runtime.js';
import { Icon } from './Icon.js';
import { CopyButton } from './CopyButton.js';

/** Poll rather than await: the component assigns `.editor` after a setTimeout. */
const EDITOR_POLL_MS = 100;
const EDITOR_TIMEOUT_MS = 20000;

function useStrudelEditor(cell, onRegister) {
  const hostRef = useRef(null);
  const elementRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || elementRef.current) return undefined;

    const el = document.createElement('strudel-editor');
    // The component reads its own innerHTML for starter code, stripping the
    // comment markers - so set it before the element enters the DOM.
    if (cell.code) el.innerHTML = `<!-- ${cell.code} -->`;

    // `update` carries the REPL's real started flag, so the button stays honest
    // even when a pattern stops on its own or via a keyboard shortcut.
    el.addEventListener('update', (event) => {
      setPlaying(!!(event.detail && event.detail.started));
    });

    host.appendChild(el);
    elementRef.current = el;

    let timeout = null;
    const poll = setInterval(() => {
      if (!el.editor) return;
      clearInterval(poll);
      clearTimeout(timeout);
      // Solo is on by default, which stops every other cell on play. The
      // notebook promises students they can layer cells, so turn it off.
      el.editor.solo = false;
      setReady(true);
      onRegister?.(cell.id, el);
    }, EDITOR_POLL_MS);
    timeout = setTimeout(() => clearInterval(poll), EDITOR_TIMEOUT_MS);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
    // Mount once. cell.id never changes for a given cell.
  }, []);

  const toggle = useCallback(() => {
    const editor = elementRef.current?.editor;
    if (!editor) return;
    if (playing) {
      editor.stop?.();
      setPlaying(false);
    } else {
      editor.evaluate?.();
      setPlaying(true);
    }
  }, [playing]);

  return { hostRef, elementRef, playing, ready, toggle };
}

export function StrudelCell({ cell, onRegister, onInfo }) {
  const { hostRef, elementRef, playing, ready, toggle } = useStrudelEditor(cell, onRegister);
  const [showHint, setShowHint] = useState(false);

  // Ctrl+Enter plays this cell, Ctrl+. stops it - captured on the way down so
  // CodeMirror's own bindings don't swallow them first.
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return undefined;
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        el.editor?.evaluate?.();
      } else if (e.key === '.') {
        e.preventDefault();
        e.stopImmediatePropagation();
        el.editor?.stop?.();
      }
    };
    el.addEventListener('keydown', onKeyDown, true);
    return () => el.removeEventListener('keydown', onKeyDown, true);
  }, [ready]);

  const isShowcase = cell.kind === 'showcase';

  return html`
    <section
      id=${cell.id}
      class=${`cell ${isShowcase ? 'cell--showcase' : ''} ${playing ? 'is-playing' : ''}`}
    >
      <div class="cell__bar">
        <div class="cell__heading">
          ${cell.lesson ? html`<span class="cell__number">${cell.lesson}</span>` : null}
          <h3>${cell.title}</h3>
        </div>
        <div class="cell__controls">
          ${cell.hint
            ? html`
                <button
                  type="button"
                  class="ghost-btn"
                  aria-pressed=${showHint ? 'true' : 'false'}
                  onClick=${() => setShowHint((v) => !v)}
                  title="Show a pattern to try"
                >
                  <${Icon} name="bulb" /> Hint
                </button>
              `
            : null}
          ${cell.info
            ? html`
                <button type="button" class="ghost-btn" onClick=${onInfo} aria-label="Drum kit guide">
                  <${Icon} name="info" />
                </button>
              `
            : null}
          <button
            type="button"
            class=${`play-btn ${playing ? 'playing' : ''}`}
            data-cell=${cell.id}
            disabled=${!ready}
            onClick=${toggle}
          >
            <${Icon} name=${playing ? 'pause' : 'play'} />
            ${playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      <p class="cell__objective" dangerouslySetInnerHTML=${{ __html: cell.objective }}></p>

      ${cell.activities
        ? html`
            <ul class="cell__activities">
              ${cell.activities.map(
                (a, i) => html`<li key=${i} dangerouslySetInnerHTML=${{ __html: a }}></li>`,
              )}
            </ul>
          `
        : null}

      ${showHint && cell.hint
        ? html`
            <div class="cell__hint">
              <pre><code>${cell.hint}</code></pre>
              <${CopyButton} text=${cell.hint} />
            </div>
          `
        : null}

      <div class="cell__editor" ref=${hostRef}></div>

      ${cell.tags?.length
        ? html`
            <div class="cell__tags">
              ${cell.tags.map((t) => html`<span key=${t} class="tag">${t}</span>`)}
            </div>
          `
        : null}
    </section>
  `;
}
