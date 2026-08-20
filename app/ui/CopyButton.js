/**
 * Copy-to-clipboard button for the hint panel.
 *
 * navigator.clipboard only exists in a secure context. localhost and 127.0.0.1
 * both count, so it works as shipped - but if the server is ever bound to a LAN
 * address so students can reach the teacher's machine, that API silently
 * disappears. The execCommand fallback keeps the button working there instead
 * of failing quietly.
 */
import { html, useState, useEffect, useRef, useCallback } from './runtime.js';
import { Icon } from './Icon.js';

const FEEDBACK_MS = 1600;

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or non-secure context - fall through.
    }
  }

  try {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    // Keep it off-screen but still selectable; display:none would not work.
    scratch.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(scratch);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const ok = await writeToClipboard(text);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), FEEDBACK_MS);
  }, [text]);

  const caption = state === 'copied' ? 'Copied' : state === 'failed' ? 'Press Ctrl+C' : label;

  return html`
    <button
      type="button"
      class=${`copy-btn ${state === 'copied' ? 'is-copied' : ''}`}
      onClick=${copy}
      data-state=${state}
      aria-label=${`${label} to clipboard`}
    >
      <${Icon} name=${state === 'copied' ? 'check' : 'copy'} />
      <span>${caption}</span>
    </button>
  `;
}
