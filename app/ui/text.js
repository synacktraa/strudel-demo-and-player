/**
 * Bilingual strings, with no dependency on React or the DOM.
 *
 * Kept separate from i18n.js so lessons.js can be imported by Node unit tests:
 * i18n.js pulls in runtime.js, which reads `window` and throws outside a
 * browser. Anything the tests need to read lives here.
 *
 * TRANSLATION NOTE: the Indonesian throughout this project was written by the
 * (non-native) author of this code and has NOT been checked by a native
 * speaker. Every string sits beside its English pair - here for chrome, in
 * lessons.js for lesson content - so a local reviewer can correct the whole
 * notebook in two files. Please have it read before teaching from it.
 */

/**
 * Pair an Indonesian string with its English original.
 * `id` is the ISO 639-1 code for Indonesian, not a DOM id.
 */
export const t = (id, en) => ({ id, en });

/** Flatten a pair for attributes that take plain text (title, aria-label, alt). */
export const both = (text) => (text ? `${text.id} / ${text.en}` : '');

/**
 * Chrome labels - buttons, tooltips, the header tagline.
 * Lesson content lives in lessons.js, which is the file a reviewer edits.
 */
export const UI = {
  tagline: t('Tulis kode. Langsung dengar hasilnya.', 'Write code. Hear it immediately.'),
  play: t('Putar', 'Play'),
  pause: t('Jeda', 'Pause'),
  stopAll: t('Hentikan Semua', 'Stop All'),
  hint: t('Petunjuk', 'Hint'),
  hintTip: t('Tampilkan contoh pola', 'Show a pattern to try'),
  insert: t('Sisipkan', 'Insert'),
  replace: t('Ganti', 'Replace'),
  drumGuide: t('Panduan drum kit', 'Drum kit guide'),
};
