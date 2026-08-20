/**
 * The notebook, as data.
 *
 * Content used to live in index.html markup, which meant editing a lesson
 * meant editing layout. Keeping it here lets the components stay generic and
 * makes the running order obvious at a glance.
 *
 * `code: ''` means the cell ships empty on purpose - the six lessons get
 * written live in front of the class. Only the showcase is pre-filled.
 */

import { t } from './text.js';

export const HERO = {
  id: 'welcome',
  title: t('Buat musik dengan menulis kode', 'Make music by writing code'),
  lead: t('Strudel adalah lingkungan live-coding untuk membuat pola dan musik langsung di browser, dibangun di atas bahasa pola TidalCycles.', 'Strudel is a live-coding environment for building patterns and music in the browser, based on the TidalCycles pattern language.'),
  body: t('Sebuah pola akan terus berulang sampai kamu menghentikannya. Ubah kodenya, tekan play lagi, dan musiknya ikut berubah.', 'A pattern loops until you stop it. Change the code, press play again, and it changes with you.'),
};

export const HOW_TO = {
  title: t('Cara memainkannya', 'How to play'),
  items: [
    [t('Putar', 'Play'), t('Setiap sel punya tombol Play sendiri - atau tekan Ctrl+Enter saat sedang mengetik di dalamnya.', 'Each cell has its own Play button - or press Ctrl+Enter while editing it.')],
    [t('Berhenti', 'Stop'), t('Tekan tombol yang sama lagi, atau Ctrl+. untuk menghentikan sel itu saja.', 'Press the same button again, or Ctrl+. to stop just that cell.')],
    [t('Tumpuk', 'Layer'), t('Sel tidak saling memotong. Jalankan beberapa sekaligus dan suaranya akan bertumpuk.', 'Cells do not interrupt each other. Run several at once and they stack.')],
    [t('Panik', 'Panic'), t('Tombol Hentikan Semua di bagian atas mematikan semua suara sekaligus.', 'Stop All Sounds in the header kills everything at once.')],
  ],
  note: t('Browser memblokir suara sampai kamu berinteraksi dengan halaman, jadi klik Play yang pertama itulah yang menyalakan suaranya.', 'Browsers block audio until you interact with the page, so the first Play is what switches the sound on.'),
};

export const CELLS = [
  {
    id: 'demo',
    nav: t('Contoh', 'Demo'),
    kind: 'showcase',
    title: t('Apa yang bisa dilakukan Strudel', 'What Strudel can do'),
    objective:
      t('Sebuah karya yang sudah jadi, supaya semua orang mendengar tujuan akhirnya: drum, bas, akor, dan efek yang bertumpuk.', 'A finished piece, so everyone hears where this is going: layered drums, bass, chords and effects.'),
    tags: [t('contoh jadi', 'showcase')],
    code: `setcps(.72)
let chords = chord("<Ebm9 Bbm7>/4").dict('ireal')
stack(
  stack(
    s("bd").struct("<[x*<1 2> [~@3 x]] x>"),
    s("~ [rim, sd:<3 2>]").room("<0 .25>"),
    n("[0 <2 1>]*<3!2 4>")
  ).bank('crate')
  .mask("<[0 1] 1 1 1>/16".early(.5))
  ,
  chords.offset(-2).voicing().s("gm_epiano1:1")
  .phaser(3).room(.6)
  ,
  n("<0!3 1*2>").set(chords).mode("root:c2")
  .voicing().s("gm_acoustic_bass"),
  chords.n("[0 <3 2 <1 4>>*2](<5 3>,8)")
  .anchor("Eb5").voicing()
  .segment(4).clip(rand.range(.3,.7))
  .room(.7).shape(.25).delay(.3)
  .fm(sine.range(2,7).slow(6))
  .lpf(sine.range(400,900).slow(6)).lpq(6)
  .sometimes(ply("2")).chunk(4, fast(2))
  .gain(perlin.range(.55, .85))
  .mask("<1 0 1 1>/16")
)
.late("[0 .01]*4").late("[0 .01]*2").size(4)`,
  },
  {
    id: 'cell-1',
    nav: t('Ritme', 'Rhythm'),
    lesson: 1,
    title: t('Ritme dasar', 'Basic rhythm'),
    objective: t('Susun pola drum dari sampel suara.', 'Build a drum pattern out of sound samples.'),
    activities: [
      t('Tulis sebuah pola lalu mainkan', 'Write a pattern and play it'),
      t('Ubah urutan suaranya', 'Change the order of the sounds'),
      t('Tambahkan yang lain: <code>cp</code>, <code>oh</code>, <code>mt</code>', 'Add more: <code>cp</code>, <code>oh</code>, <code>mt</code>'),
    ],
    tags: [t('ritme', 'rhythm'), t('sampel', 'samples')],
    hint: 's("bd hh sd hh")',
    info: true,
    code: '',
  },
  {
    id: 'cell-2',
    nav: t('Pengulangan', 'Repetition'),
    lesson: 2,
    title: t('Pengulangan pola', 'Pattern repetition'),
    objective: t('Gunakan <code>*</code> untuk membagi waktu dan mengulang suara.', 'Use <code>*</code> to subdivide time and repeat sounds.'),
    activities: [
      t('Dengarkan bedanya <code>*2</code> dan <code>*4</code>', 'Hear how <code>*2</code> and <code>*4</code> differ'),
      t('Ubah angkanya', 'Change the numbers'),
      t('Coba <code>bd*8</code> atau <code>hh*3</code>', 'Try <code>bd*8</code> or <code>hh*3</code>'),
    ],
    tags: [t('pengulangan', 'repetition'), t('pembagian ketukan', 'subdivision')],
    hint: 's("bd*2 hh*4 sd hh*2")',
    code: '',
  },
  {
    id: 'cell-3',
    nav: t('Melodi', 'Melody'),
    lesson: 3,
    title: t('Melodi', 'Melody'),
    objective: t('Ubah nama-nama nada menjadi sebuah melodi.', 'Turn note names into a tune.'),
    activities: [
      t('Mainkan beberapa nada berurutan', 'Play a few notes in a row'),
      t('Ganti hurufnya (<code>c d e f g a b</code>)', 'Change the letters (<code>c d e f g a b</code>)'),
      t('Buat polanya lebih panjang', 'Make the pattern longer'),
    ],
    tags: [t('melodi', 'melody'), t('nada', 'notes')],
    hint: 'note("c e g e a g e c")',
    code: '',
  },
  {
    id: 'cell-4',
    nav: t('Instrumen', 'Instruments'),
    lesson: 4,
    title: t('Instrumen & suara', 'Instruments & sounds'),
    objective: t('Mainkan nada yang sama dengan suara yang berbeda.', 'Play the same notes with different voices.'),
    activities: [
      t('Mulai dengan <code>sawtooth</code>', 'Start with <code>sawtooth</code>'),
      t('Ganti dengan <code>piano</code>, <code>triangle</code>, <code>gm_acoustic_guitar_nylon</code>', 'Swap in <code>piano</code>, <code>triangle</code>, <code>gm_acoustic_guitar_nylon</code>'),
      t('Cari suara yang kamu suka', 'Find a sound you like'),
    ],
    tags: [t('instrumen', 'instruments'), t('warna suara', 'timbre')],
    hint: 'note("c e g b").sound("sawtooth")',
    code: '',
  },
  {
    id: 'cell-5',
    nav: t('Tumpukan', 'Layering'),
    lesson: 5,
    title: t('Menumpuk suara', 'Layering'),
    objective: t('Gabungkan beberapa pola dengan <code>stack()</code>.', 'Combine patterns with <code>stack()</code>.'),
    activities: [
      t('Tumpuk drum dengan melodi', 'Stack drums and a melody'),
      t('Ubah satu lapisan tanpa mengubah lapisan lainnya', 'Change one layer without touching the other'),
      t('Tambahkan lapisan ketiga', 'Add a third layer'),
    ],
    tags: [t('tumpukan', 'layering'), t('polifoni', 'polyphony')],
    hint: `stack(
  s("bd*2 hh*4 sd hh*2"),
  note("c e g e").sound("sawtooth")
)`,
    code: '',
  },
  {
    id: 'cell-6',
    nav: t('Efek', 'Effects'),
    lesson: 6,
    title: t('Efek', 'Effects'),
    objective: t('Bentuk suaranya dengan reverb, delay, dan filter.', 'Shape the sound with reverb, delay and filters.'),
    activities: [
      t('Tambahkan <code>.room(0.6)</code> dan <code>.delay(0.4)</code>', 'Add <code>.room(0.6)</code> and <code>.delay(0.4)</code>'),
      t('Naikkan nilainya lebih jauh', 'Push the values further'),
      t('Coba <code>.lpf(800)</code> atau <code>.distort(0.5)</code>', 'Try <code>.lpf(800)</code> or <code>.distort(0.5)</code>'),
    ],
    tags: [t('efek', 'effects'), t('mixing', 'mixing')],
    hint: `note("c e g b a g e c")
  .sound("sawtooth")
  .room(0.6)
  .delay(0.4)`,
    code: '',
  },
  {
    id: 'build',
    nav: t('Buat', 'Build'),
    kind: 'free',
    title: t('Buat karyamu sendiri', 'Build your own'),
    objective: t('Semua yang sudah kamu pelajari, dalam satu sel. Buat sesuatu.', 'Everything you have learned, in one cell. Make something.'),
    tags: [t('eksplorasi bebas', 'free exploration')],
    hint: `// Combine what you learned:
//   s("bd*2 hh*4")       drums
//   note("c e g")        melody
//   stack(a, b)          layers
//   .room(0.5)           effects
s("bd*2 hh*4")`,
    code: '',
  },
];

export const WRAP_UP = {
  id: 'wrap-up',
  title: t('Apa yang sudah kamu pelajari', 'What you learned'),
  items: [
    t('Ritme dari sampel drum', 'Rhythms from drum samples'),
    t('Pengulangan dengan <code>*</code>', 'Repetition with <code>*</code>'),
    t('Melodi, dan mengganti instrumen', 'Melodies, and swapping instruments'),
    t('Menumpuk dengan <code>stack()</code>', 'Layering with <code>stack()</code>'),
    t('Efek untuk membentuk suara', 'Effects to shape a sound'),
  ],
};

/** Sections in the sticky nav, in order. */
export const NAV = [{ id: 'welcome', nav: t('Mulai', 'Start') }, ...CELLS.map((c) => ({ id: c.id, nav: c.nav }))];
