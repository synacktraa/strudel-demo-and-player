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
  btn.classList.add('state-transitioning');
  
  setTimeout(() => {
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
    
    btn.classList.remove('state-transitioning');
  }, 100);
}

function initCellControls() {
  document.querySelectorAll('.play-btn').forEach(btn => {
    const cellId = btn.getAttribute('data-cell');
    const editor = getEditorForButton(btn);
    
    if (editor) {
      const checkEditorReady = setInterval(() => {
        if (editor.editor && editor.editor.scheduler) {
          clearInterval(checkEditorReady);
          
          editor.editor.scheduler.on('started', () => {
            updateButtonState(btn, cellId, true);
          });
          
          editor.editor.scheduler.on('stopped', () => {
            updateButtonState(btn, cellId, false);
          });
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkEditorReady), 5000);
    }
    
    btn.addEventListener('click', () => {
      if (editor && editor.editor) {
        const isPlaying = playingStates.get(cellId);
        
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
  document.querySelectorAll('strudel-editor').forEach(editor => {
    editor.addEventListener('focusin', () => {
      focusedEditor = editor;
    });
    editor.addEventListener('focusout', () => {
      if (focusedEditor === editor) {
        focusedEditor = null;
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (focusedEditor) {
        const cell = focusedEditor.closest('.cell');
        if (cell) {
          const playBtn = cell.querySelector('.play-btn');
          const cellId = playBtn?.getAttribute('data-cell');
          const isPlaying = playingStates.get(cellId);
          
          if (focusedEditor.editor) {
            if (isPlaying) {
              if (typeof focusedEditor.editor.stop === 'function') {
                focusedEditor.editor.stop();
              }
            } else {
              if (typeof focusedEditor.editor.evaluate === 'function') {
                focusedEditor.editor.evaluate();
              }
            }
          }
        }
      }
    }
    
    if (e.ctrlKey && e.key === '.') {
      e.preventDefault();
      if (focusedEditor) {
        const cell = focusedEditor.closest('.cell');
        if (cell) {
          if (focusedEditor.editor && typeof focusedEditor.editor.stop === 'function') {
            focusedEditor.editor.stop();
          }
        }
      }
    }
  });
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
        const header = document.getElementById('header');
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY;
        const viewportCenter = window.innerHeight / 2;
        const targetCenter = target.offsetHeight / 2;
        const offsetPosition = targetPosition - viewportCenter + targetCenter;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    });
  });

  setTimeout(() => {
    initCellControls();
    setupKeyboardShortcuts();
    setupScrollBehavior();
  }, 1000);
});
