/**
 * The notebook shell: header, navigation, sections, and the panic button.
 */
import { html, useState, useEffect, useRef, useCallback, Fragment } from './runtime.js';
import { Icon } from './Icon.js';
import { T, both, UI, useLanguageMode, LanguageToggle } from './i18n.js';
import { Equalizer } from './Equalizer.js';
import { StrudelCell } from './StrudelCell.js';
import { useMasterAnalyser } from './useMasterAnalyser.js';
import { HERO, HOW_TO, CELLS, WRAP_UP, NAV } from './lessons.js';

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
        <img src="image.png" alt=${both(UI.drumGuide)} />
      </div>
    </div>
  `;
}

export function Notebook() {
  const editors = useRef(new Map());
  const [anyPlaying, setAnyPlaying] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [langMode, setLangMode] = useLanguageMode();
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
            <p><${T} text=${UI.tagline} /></p>
          </div>
          <div class="header__right">
            <${LanguageToggle} mode=${langMode} onChange=${setLangMode} />
            <${Equalizer} analyser=${analyser} active=${anyPlaying} />
            <button type="button" id="stop-all" class="stop-all-btn" onClick=${stopAll}>
              <${Icon} name="stop" /> <${T} text=${UI.stopAll} />
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
                <${T} text=${item.nav} />
              </a>
            `,
          )}
        </nav>
      </header>

      <main>
        <section id=${HERO.id} class="hero">
          <h2><${T} text=${HERO.title} /></h2>
          <p class="hero__lead"><${T} text=${HERO.lead} /></p>
          <p class="hero__body"><${T} text=${HERO.body} /></p>

          <div class="hero__guide">
            ${HOW_TO.items.map(
              ([term, desc]) => html`
                <div key=${term.en} class="guide-card">
                  <span class="guide-card__term"><${T} text=${term} /></span>
                  <span class="guide-card__desc"><${T} text=${desc} /></span>
                </div>
              `,
            )}
          </div>
          <p class="hero__note"><${T} text=${HOW_TO.note} /></p>
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
          <h2><${T} text=${WRAP_UP.title} /></h2>
          <ul>
            ${WRAP_UP.items.map(
              (item, i) => html`<li key=${i}><${T} text=${item} rich /></li>`,
            )}
          </ul>
        </section>
      </main>

      <${InfoModal} open=${infoOpen} onClose=${() => setInfoOpen(false)} />
    <//>
  `;
}
