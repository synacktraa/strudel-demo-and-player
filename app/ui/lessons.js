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

export const INTRO = [
  {
    id: 'welcome',
    title: 'Welcome',
    body: [
      "You'll make music by writing code, live. Every cell below is editable - play it, break it, fix it.",
    ],
  },
  {
    id: 'what-is',
    title: 'What is Strudel?',
    body: [
      'Strudel is a live-coding environment for making patterns and music in the browser, built on the TidalCycles pattern language.',
      'Everything here runs on this machine. No internet needed.',
    ],
  },
];

export const HOW_TO = {
  id: 'how-to',
  title: 'How to play',
  items: [
    ['Play', 'Each cell has its own Play button - or press Ctrl+Enter while editing it.'],
    ['Stop', 'Press the same button again, or Ctrl+. to stop just that cell.'],
    ['Layer', 'Cells do not interrupt each other. Run several at once and they stack.'],
    ['Panic', 'Stop All Sounds in the header kills everything at once.'],
  ],
  note: 'Browsers block audio until you interact with the page, so the first Play is what switches the sound on.',
};

export const CELLS = [
  {
    id: 'demo',
    nav: 'Demo',
    kind: 'showcase',
    title: 'What Strudel can do',
    objective:
      'A finished piece, so everyone hears where this is going: layered drums, bass, chords and effects.',
    tags: ['showcase'],
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
    nav: 'Rhythm',
    lesson: 1,
    title: 'Basic rhythm',
    objective: 'Build a drum pattern out of sound samples.',
    activities: [
      'Write a pattern and play it',
      'Change the order of the sounds',
      'Add more: <code>cp</code>, <code>oh</code>, <code>mt</code>',
    ],
    tags: ['rhythm', 'samples'],
    hint: 's("bd hh sd hh")',
    info: true,
    code: '',
  },
  {
    id: 'cell-2',
    nav: 'Repetition',
    lesson: 2,
    title: 'Pattern repetition',
    objective: 'Use <code>*</code> to subdivide time and repeat sounds.',
    activities: [
      'Hear how <code>*2</code> and <code>*4</code> differ',
      'Change the numbers',
      'Try <code>bd*8</code> or <code>hh*3</code>',
    ],
    tags: ['repetition', 'subdivision'],
    hint: 's("bd*2 hh*4 sd hh*2")',
    code: '',
  },
  {
    id: 'cell-3',
    nav: 'Melody',
    lesson: 3,
    title: 'Melody',
    objective: 'Turn note names into a tune.',
    activities: [
      'Play a few notes in a row',
      'Change the letters (<code>c d e f g a b</code>)',
      'Make the pattern longer',
    ],
    tags: ['melody', 'notes'],
    hint: 'note("c e g e a g e c")',
    code: '',
  },
  {
    id: 'cell-4',
    nav: 'Instruments',
    lesson: 4,
    title: 'Instruments & sounds',
    objective: 'Play the same notes with different voices.',
    activities: [
      'Start with <code>sawtooth</code>',
      'Swap in <code>piano</code>, <code>triangle</code>, <code>gm_acoustic_guitar_nylon</code>',
      'Find a sound you like',
    ],
    tags: ['instruments', 'timbre'],
    hint: 'note("c e g b").sound("sawtooth")',
    code: '',
  },
  {
    id: 'cell-5',
    nav: 'Layering',
    lesson: 5,
    title: 'Layering',
    objective: 'Combine patterns with <code>stack()</code>.',
    activities: [
      'Stack drums and a melody',
      'Change one layer without touching the other',
      'Add a third layer',
    ],
    tags: ['layering', 'polyphony'],
    hint: `stack(
  s("bd*2 hh*4 sd hh*2"),
  note("c e g e").sound("sawtooth")
)`,
    code: '',
  },
  {
    id: 'cell-6',
    nav: 'Effects',
    lesson: 6,
    title: 'Effects',
    objective: 'Shape the sound with reverb, delay and filters.',
    activities: [
      'Add <code>.room(0.6)</code> and <code>.delay(0.4)</code>',
      'Push the values further',
      'Try <code>.lpf(800)</code> or <code>.distort(0.5)</code>',
    ],
    tags: ['effects', 'mixing'],
    hint: `note("c e g b a g e c")
  .sound("sawtooth")
  .room(0.6)
  .delay(0.4)`,
    code: '',
  },
  {
    id: 'build',
    nav: 'Build',
    kind: 'free',
    title: 'Build your own',
    objective: 'Everything you have learned, in one cell. Make something.',
    tags: ['free exploration'],
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
  title: 'What you learned',
  items: [
    'Rhythms from drum samples',
    'Repetition with <code>*</code>',
    'Melodies, and swapping instruments',
    'Layering with <code>stack()</code>',
    'Effects to shape a sound',
  ],
};

/** Sections in the sticky nav, in order. */
export const NAV = [{ id: 'welcome', nav: 'Start' }, ...CELLS.map((c) => ({ id: c.id, nav: c.nav }))];
