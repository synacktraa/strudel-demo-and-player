const initialCode = new Map();
let focusedEditor = null;
const playingStates = new Map();

function getEditorForButton(btn) {
  const cellId = btn.getAttribute('data-cell');
  const cell = btn.closest('.cell');
  if (cell) {
    return cell.querySelector('strudel-editor');
  }
  return null;
}

function updateButtonState(btn, cellId, isPlaying) {
  console.log('updateButtonState called:', cellId, isPlaying);

  if (isPlaying) {
    btn.textContent = '⏸ Pause';
    btn.classList.add('playing');
    playingStates.set(cellId, true);

    btn.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' }
    ], {
      duration: 160,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
    });
  } else {
    btn.textContent = '▶ Play';
    btn.classList.remove('playing');
    playingStates.set(cellId, false);
  }
}

function initCellControls() {
  document.querySelectorAll('.play-btn').forEach(btn => {
    const cellId = btn.getAttribute('data-cell');
    const editor = getEditorForButton(btn);

    playingStates.set(cellId, false);

    if (editor) {
      const checkEditorReady = setInterval(() => {
        if (editor.editor && editor.editor.scheduler) {
          clearInterval(checkEditorReady);

          editor.editor.scheduler.on('started', () => {
            console.log('Scheduler started event for cell:', cellId);
            updateButtonState(btn, cellId, true);
          });

          editor.editor.scheduler.on('stopped', () => {
            console.log('Scheduler stopped event for cell:', cellId);
            updateButtonState(btn, cellId, false);
          });
        }
      }, 100);

      setTimeout(() => clearInterval(checkEditorReady), 5000);
    }

    btn.addEventListener('click', () => {
      if (editor && editor.editor) {
        const isPlaying = playingStates.get(cellId);

        console.log('Button clicked. Cell:', cellId, 'Currently playing:', isPlaying);

        if (isPlaying) {
          if (typeof editor.editor.stop === 'function') {
            editor.editor.stop();
          }
          updateButtonState(btn, cellId, false);
        } else {
          if (typeof editor.editor.evaluate === 'function') {
            editor.editor.evaluate();
          }
          updateButtonState(btn, cellId, true);
        }
      }
    });
  });
}

function stopAllSounds() {
  document.querySelectorAll('strudel-editor').forEach(el => {
    if (el.editor && typeof el.editor.stop === 'function') {
      el.editor.stop();
    }
  });

  document.querySelectorAll('.play-btn').forEach(btn => {
    const cellId = btn.getAttribute('data-cell');
    updateButtonState(btn, cellId, false);
  });

  playingStates.clear();
}

function setupKeyboardShortcuts() {
  setTimeout(() => {
    document.querySelectorAll('strudel-editor').forEach(editor => {
      console.log('Setting up keyboard shortcuts for editor');

      let isEditorFocused = false;

      editor.addEventListener('focusin', () => {
        focusedEditor = editor;
        isEditorFocused = true;
        console.log('Editor focused');
      });

      editor.addEventListener('focusout', () => {
        if (focusedEditor === editor) {
          focusedEditor = null;
        }
        isEditorFocused = false;
        console.log('Editor unfocused');
      });

      editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          console.log('!!! Ctrl+Enter detected !!!');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const cell = editor.closest('.cell');

          if (cell && editor.editor) {
            const playBtn = cell.querySelector('.play-btn');
            const cellId = playBtn?.getAttribute('data-cell');

            console.log('Playing cell:', cellId);

            if (typeof editor.editor.evaluate === 'function') {
              console.log('>>> Calling evaluate() <<<');
              editor.editor.evaluate();
            }

            if (playBtn && cellId) {
              updateButtonState(playBtn, cellId, true);
            }
          }
          return false;
        }

        if (e.ctrlKey && e.key === '.') {
          console.log('!!! Ctrl+. detected !!!');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const cell = editor.closest('.cell');
          if (cell && editor.editor) {
            const playBtn = cell.querySelector('.play-btn');
            const cellId = playBtn?.getAttribute('data-cell');

            console.log('Stopping cell:', cellId);

            if (typeof editor.editor.stop === 'function') {
              editor.editor.stop();
            }
            if (playBtn && cellId) {
              updateButtonState(playBtn, cellId, false);
            }
          }
          return false;
        }
      }, true);
    });
  }, 2000);
}

function setupScrollBehavior() {
  const header = document.getElementById('header');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.toc a');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let scrollTimeout;
  let rafId;

  const updateScrollState = () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let current = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        const wasActive = link.classList.contains('active');
        const shouldBeActive = link.getAttribute('href') === `#${current}`;

        if (shouldBeActive && !wasActive) {
          link.classList.add('active');
        } else if (!shouldBeActive && wasActive) {
          link.classList.remove('active');
        }
      });
    }, 50);
  };

  window.addEventListener('scroll', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(updateScrollState);
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const stopAllBtn = document.getElementById('stop-all');
  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', stopAllSounds);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.toc a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        if (link.getAttribute('href') === '#demo') {
          const header = document.getElementById('header');
          header.classList.add('scrolled');
          const headerHeight = header.offsetHeight;

          const targetPosition = target.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = targetPosition - headerHeight - 16;

          window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        } else {
          const header = document.getElementById('header');
          const isScrolled = header.classList.contains('scrolled');
          const headerHeight = header ? header.offsetHeight : 0;

          const targetPosition = target.getBoundingClientRect().top + window.scrollY;
          const viewportCenter = window.innerHeight / 2;
          const targetCenter = target.offsetHeight / 2;

          let offsetPosition = targetPosition - viewportCenter + targetCenter;

          if (!isScrolled) {
            const expandedHeaderOffset = headerHeight * 0.5;
            offsetPosition -= expandedHeaderOffset;
          }

          window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      }
    });
  });
}
);

setTimeout(() => {
  initCellControls();
  setupKeyboardShortcuts();
  setupScrollBehavior();
}, 1000);
