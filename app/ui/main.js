/**
 * Entry point. Mounts the notebook into #root.
 *
 * Strudel's <strudel-editor> is registered by vendor/strudel/index.js, loaded
 * as a classic script before this module, so the custom element is defined by
 * the time React renders one.
 */
import { React, ReactDOM } from './runtime.js';
import { Notebook } from './Notebook.js';

const container = document.getElementById('root');

try {
  ReactDOM.createRoot(container).render(React.createElement(Notebook));
} catch (err) {
  // A blank page in front of a class is the worst outcome - say what broke.
  container.innerHTML = `
    <div class="fatal">
      <h1>The notebook could not start</h1>
      <p>${String(err && err.message ? err.message : err)}</p>
      <p>Run <code>npm run verify</code> to check the setup.</p>
    </div>
  `;
  throw err;
}
