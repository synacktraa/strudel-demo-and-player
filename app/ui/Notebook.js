/**
 * The notebook shell: header, navigation, sections, and the panic button.
 */
import { html, useState, useEffect, useRef, useCallback, Fragment } from './runtime.js';
import { Icon } from './Icon.js';
import { Equalizer } from './Equalizer.js';
import { StrudelCell } from './StrudelCell.js';
import { useMasterAnalyser } from './useMasterAnalyser.js';
import { INTRO, HOW_TO, CELLS, WRAP_UP, NAV } from './lessons.js';

/** Track which section is in view, to highlight the nav. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        let current = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && window.scrollY >= el.offsetTop - 220) current = id;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids.join(',')]);

  return { active, scrolled };
}

function InfoModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return html`
    <div class="modal is-open" id="info-modal">
      <div class="modal__overlay" onClick=${onClose}></div>
      <div class="modal__content" role="dialog" aria-label="Drum kit guide">
        <button type="button" class="modal__close" onClick=${onClose} aria-label="Close">
          <${Icon} name="close" />
        </button>
        <img src="image.png" alt="Drum kit guide" />
      </div>
    </div>
  `;
}

export function Notebook() {
  const editors = useRef(new Map());
  const [anyPlaying, setAnyPlaying] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const analyser = useMasterAnalyser();
  const { active, scrolled } = useActiveSection(NAV.map((n) => n.id));

  const register = useCallback((id, el) => {
    editors.current.set(id, el);
    // Every editor is mounted and wired - the E2E suite waits on this flag.
    if (editors.current.size === CELLS.length) {
      document.body.dataset.notebookReady = 'true';
    }
  }, []);

  // One source of truth for "is anything making noise", used by the equalizer.
  useEffect(() => {
    const tick = setInterval(() => {
      let playing = false;
      for (const el of editors.current.values()) {
        if (el.editor?.repl?.scheduler?.started) {
          playing = true;
          break;
        }
      }
      setAnyPlaying(playing);
    }, 250);
    return () => clearInterval(tick);
  }, []);

  const stopAll = useCallback(() => {
    for (const el of editors.current.values()) el.editor?.stop?.();
  }, []);

  const jumpTo = useCallback((e, id) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const header = document.getElementById('header');
    const offset = (header?.offsetHeight ?? 0) + 20;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offset,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, []);

  return html`
    <${Fragment}>
      <header id="header" class=${scrolled ? 'is-scrolled' : ''}>
        <div class="header__top">
          <div class="header__title">
            <h1>Strudel Workshop</h1>
            <p>Live-coding music, running entirely on this machine</p>
          </div>
          <div class="header__right">
            <${Equalizer} analyser=${analyser} active=${anyPlaying} />
            <button type="button" id="stop-all" class="stop-all-btn" onClick=${stopAll}>
              <${Icon} name="stop" /> Stop All Sounds
            </button>
          </div>
        </div>
        <nav class="toc">
          ${NAV.map(
            (item) => html`
              <a
                key=${item.id}
                href=${`#${item.id}`}
                class=${active === item.id ? 'active' : ''}
                onClick=${(e) => jumpTo(e, item.id)}
              >
                ${item.nav}
              </a>
            `,
          )}
        </nav>
      </header>

      <main>
        ${INTRO.map(
          (section) => html`
            <section key=${section.id} id=${section.id} class="prose">
              <h2>${section.title}</h2>
              ${section.body.map((p, i) => html`<p key=${i}>${p}</p>`)}
            </section>
          `,
        )}

        <section id=${HOW_TO.id} class="prose">
          <h2>${HOW_TO.title}</h2>
          <dl class="howto">
            ${HOW_TO.items.map(
              ([term, desc]) => html`
                <div key=${term} class="howto__row">
                  <dt>${term}</dt>
                  <dd>${desc}</dd>
                </div>
              `,
            )}
          </dl>
          <p class="note">${HOW_TO.note}</p>
        </section>

        ${CELLS.map(
          (cell) => html`
            <${StrudelCell}
              key=${cell.id}
              cell=${cell}
              onRegister=${register}
              onInfo=${() => setInfoOpen(true)}
            />
          `,
        )}

        <section id=${WRAP_UP.id} class="prose">
          <h2>${WRAP_UP.title}</h2>
          <ul>
            ${WRAP_UP.items.map(
              (item, i) => html`<li key=${i} dangerouslySetInnerHTML=${{ __html: item }}></li>`,
            )}
          </ul>
        </section>
      </main>

      <${InfoModal} open=${infoOpen} onClose=${() => setInfoOpen(false)} />
    <//>
  `;
}
