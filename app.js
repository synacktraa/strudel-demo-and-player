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

function initCellControls() {
  document.querySelectorAll('.play-btn').forEach(btn => {
    const cellId = btn.getAttribute('data-cell');
    const editor = getEditorForButton(btn);
    
    btn.addEventListener('click', () => {
      if (editor && editor.editor) {
        const isPlaying = playingStates.get(cellId);
        
        if (isPlaying) {
          if (typeof editor.editor.stop === 'function') {
            editor.editor.stop();
          }
          btn.classList.remove('playing');
          playingStates.set(cellId, false);
        } else {
          if (typeof editor.editor.evaluate === 'function') {
            editor.editor.evaluate();
          }
          btn.classList.add('playing');
          playingStates.set(cellId, true);
        }
      }
    });
  });

  document.querySelectorAll('.stop-btn').forEach(btn => {
    const cellId = btn.getAttribute('data-cell');
    const editor = getEditorForButton(btn);
    const playBtn = btn.previousElementSibling;
    
    btn.addEventListener('click', () => {
      if (editor && editor.editor && typeof editor.editor.stop === 'function') {
        editor.editor.stop();
        if (playBtn && playBtn.classList.contains('play-btn')) {
          playBtn.classList.remove('playing');
          playingStates.set(cellId, false);
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
    btn.classList.remove('playing');
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
              playBtn?.classList.remove('playing');
              playingStates.set(cellId, false);
            } else {
              if (typeof focusedEditor.editor.evaluate === 'function') {
                focusedEditor.editor.evaluate();
              }
              playBtn?.classList.add('playing');
              playingStates.set(cellId, true);
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
          const playBtn = cell.querySelector('.play-btn');
          const cellId = playBtn?.getAttribute('data-cell');
          
          if (focusedEditor.editor && typeof focusedEditor.editor.stop === 'function') {
            focusedEditor.editor.stop();
            playBtn?.classList.remove('playing');
            playingStates.set(cellId, false);
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
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let current = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    }, 100);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const stopAllBtn = document.getElementById('stop-all');
  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', stopAllSounds);
  }

  document.querySelectorAll('.toc a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  setTimeout(() => {
    initCellControls();
    setupKeyboardShortcuts();
    setupScrollBehavior();
  }, 1000);
});
